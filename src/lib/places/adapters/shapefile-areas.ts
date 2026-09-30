/**
 * Boundaries published as a zipped Shapefile, one polygon record per place
 * (or several, for a place with exclaves), found through a STAC catalogue of
 * editions. The adapter merges each place's records, snaps them to a grid in
 * the file's own units, reprojects to WGS84, builds one topology (so
 * neighbours share their borders exactly) and simplifies it for a map.
 *
 * Format only: which member of the archive, which records, which column holds
 * the place's code and which scheme that code belongs to are the source's
 * `options`.
 */
import { unzipSync } from "fflate";
import proj4 from "proj4";
import { quantize } from "topojson-client";
import { topology } from "topojson-server";
import { presimplify, quantile, simplify } from "topojson-simplify";
import type { FeatureCollection, MultiPolygon, Position } from "geojson";
import type { Objects, Topology } from "topojson-specification";
import { z } from "zod";
import type { BatchArea } from "../importer/batch";
import { readShapefile, type ShapeRecord } from "./shapefile";
import type { Adapter, Probe, RetrievalRequest } from "./types";

const column = z.string().min(1);
const shapefileAreasOptions = z.object({
  /** A STAC collection's items; the latest edition begun by today is fetched. */
  catalogue: z.object({
    url: z.url(),
    /** The end of the asset's file name that is the zipped Shapefile. */
    asset: z.string().min(1),
  }),
  /** A pattern with one group, read from the retrieval's URL: the edition, "2026-01". */
  edition: z.string().min(1),
  /** The layer's file name in the archive, without its extension. */
  member: z.string().min(1),
  /** Keep only records whose column holds one of the values. */
  where: z.array(z.object({ column, values: z.array(z.string()).min(1) })).default([]),
  place: z.object({ scheme: z.string().min(1), column }),
  level: z.string().min(1),
  /** Coordinates snap to this grid, in the file's units, as they are read. */
  grid: z.number().positive(),
  /** The share of the topology's points a map keeps. */
  keep: z.number().gt(0).lte(1),
  /** Positions per axis the file is quantised to. */
  quantization: z.number().int().min(1000),
});
type ShapefileAreasOptions = z.infer<typeof shapefileAreasOptions>;

const catalogueItems = z.object({
  features: z.array(
    z.object({
      id: z.string(),
      properties: z.object({ datetime: z.string().nullable().optional() }).loose(),
      assets: z.record(z.string(), z.object({ href: z.url() }).loose()),
    }),
  ),
});

async function latestEdition(
  options: ShapefileAreasOptions,
  today: string,
  probe: Probe,
): Promise<RetrievalRequest> {
  const items = catalogueItems.parse(await probe({ url: options.catalogue.url })).features;
  const editions = items.flatMap((item) => {
    const begins = item.properties.datetime?.slice(0, 10);
    const href = Object.values(item.assets).find((a) =>
      a.href.endsWith(options.catalogue.asset),
    )?.href;
    return begins && href && begins <= today ? [{ url: href, validFrom: begins }] : [];
  });
  const latest = editions.sort((a, b) => a.validFrom.localeCompare(b.validFrom)).at(-1);
  if (!latest) {
    throw new Error(`the catalogue has no "${options.catalogue.asset}" edition begun by ${today}`);
  }
  return latest;
}

/** One archive member's records, in the file's own coordinates, and its projection. */
function readMember(
  bytes: Uint8Array,
  options: ShapefileAreasOptions,
): { records: ShapeRecord[]; prj: string } {
  const { member } = options;
  const files = unzipSync(bytes, {
    filter: (file) => file.name.replace(/^.*\//, "").startsWith(`${member}.`),
  });
  const text = (bytes?: Uint8Array) => (bytes ? new TextDecoder().decode(bytes) : undefined);
  const find = (extension: string) =>
    Object.entries(files).find(([name]) => name.toLowerCase().endsWith(`.${extension}`))?.[1];
  const [shp, dbf, prj] = [find("shp"), find("dbf"), text(find("prj"))];
  if (!shp || !dbf || !prj) {
    throw new Error(`the archive has no ${member}.shp, .dbf and .prj`);
  }
  const keep = (attributes: Record<string, string>) =>
    options.where.every((w) => w.values.includes(attributes[w.column] ?? ""));
  return {
    records: readShapefile(shp, dbf, text(find("cpg")), { keep, grid: options.grid }),
    prj,
  };
}

/**
 * Each place's polygons, reprojected, then one simplified topology whose
 * object is named after the level and whose features are the places' codes.
 */
export function buildTopology(
  places: Map<string, Position[][][]>,
  project: (xy: Position) => Position,
  options: Pick<ShapefileAreasOptions, "level" | "keep" | "quantization">,
): string {
  const features = [...places].map(([code, polygons]) => ({
    type: "Feature" as const,
    id: code,
    properties: {},
    geometry: {
      type: "MultiPolygon" as const,
      coordinates: polygons.map((polygon) => polygon.map((ring) => ring.map(project))),
    },
  }));
  const collection: FeatureCollection<MultiPolygon, {}> = { type: "FeatureCollection", features };
  let topo = presimplify(topology({ [options.level]: collection }) as Topology<Objects<{}>>);
  // `quantile` ranks weights from the largest, so p is the share that stays.
  topo = simplify(topo, quantile(topo, options.keep));
  return JSON.stringify(quantize(topo, options.quantization));
}

export const shapefileAreasAdapter: Adapter<Uint8Array, ShapefileAreasOptions> = {
  key: "shapefile_areas",
  version: "1",
  decode: (bytes) => bytes,
  schema: z.instanceof(Uint8Array),
  options: shapefileAreasOptions,
  retrievals: async (options, today, probe) => [await latestEdition(options, today, probe)],
  map: (bytes, { pack, options, retrieval }) => {
    if (!pack) {
      throw new Error("areas belong to a pack's places; the source names none");
    }
    const edition = retrieval.url?.match(new RegExp(options.edition))?.[1];
    if (!edition) {
      throw new Error(
        `no edition in ${retrieval.url ?? "the retrieval"} (pattern ${options.edition})`,
      );
    }
    const { records, prj } = readMember(bytes, options);
    const places = new Map<string, Position[][][]>();
    for (const { polygons, attributes } of records) {
      const code = attributes[options.place.column];
      if (!code) {
        throw new Error(`a record has no code in ${options.place.column}`);
      }
      places.set(code, [...(places.get(code) ?? []), ...polygons]);
    }
    const toWgs84 = proj4(prj, "WGS84");
    const validFrom = retrieval.validFrom;
    const areas: BatchArea[] = [...places.keys()].map((code) => ({
      place: { scheme: options.place.scheme, value: code },
      feature: code,
      validFrom,
      validTo: null,
    }));
    return {
      pack: pack.key,
      jurisdictions: [],
      areas,
      geometry: {
        levelKey: options.level,
        datasetVersion: edition,
        topology: buildTopology(places, (xy) => toWgs84.forward(xy as [number, number]), options),
      },
    };
  },
};

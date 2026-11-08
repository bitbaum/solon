import { loadGeographyManifest, loadGeographyResources } from "@bitbaum/geo-kit";
import { feature as topologyFeatures } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import type { FeatureCollection, Geometry } from "geojson";
import { areaBounds, type AreaGeometry, type MapData } from "@/lib/places/map-view";

export type Bounds = [number, number, number, number];
export type Features = FeatureCollection<Geometry, { code: string }>;

/** A country's drawn places, ready for the map. */
export interface Drawn {
  features: Features;
  bounds: Bounds;
  /** Each feature's geometry and bounds, to find which place holds an address. */
  areas: Map<string, { geometry: AreaGeometry; bounds: Bounds }>;
}

/** The boundary file, verified against the manifest by geo-kit, as GeoJSON features. */
export async function loadDrawn(data: MapData, signal: AbortSignal): Promise<Drawn> {
  const baseUrl = window.location.origin;
  // The manifest is revalidated, so a cached one cannot predate the edition the map data names.
  const manifest = await loadGeographyManifest(data.resource.manifest, {
    baseUrl,
    signal,
    fetcher: (input, init) => fetch(input, { ...init, cache: "no-cache" }),
  });
  const [loaded] = await loadGeographyResources(
    manifest,
    { resourceIds: [data.resource.id], asOf: data.on },
    { baseUrl, signal },
  );
  if (
    !loaded ||
    loaded.resource.sha256 !== data.resource.sha256 ||
    loaded.data.type !== "Topology"
  ) {
    throw new Error("boundary file does not match the map data");
  }
  const topology = loaded.data as unknown as Topology;
  const object = topology.objects[data.levelKey] ?? Object.values(topology.objects)[0];
  if (!object) {
    throw new Error("boundary file has no objects");
  }
  const collection = topologyFeatures(topology, object as GeometryCollection);
  const areas = new Map<string, { geometry: AreaGeometry; bounds: Bounds }>();
  const features: Features = {
    type: "FeatureCollection",
    features: collection.features.flatMap((f) => {
      const geometry = f.geometry as AreaGeometry | null;
      if (f.id === undefined || !geometry) {
        return [];
      }
      const code = String(f.id);
      areas.set(code, { geometry, bounds: areaBounds(geometry) });
      return [{ type: "Feature" as const, id: code, properties: { code }, geometry: f.geometry }];
    }),
  };
  const all = [...areas.values()].map((a) => a.bounds);
  const bounds: Bounds = [
    Math.min(...all.map((b) => b[0])),
    Math.min(...all.map((b) => b[1])),
    Math.max(...all.map((b) => b[2])),
    Math.max(...all.map((b) => b[3])),
  ];
  return { features, bounds, areas };
}

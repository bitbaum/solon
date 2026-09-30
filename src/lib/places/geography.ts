/**
 * The published geography (design §4.4): a geo-kit manifest of the geometry
 * files the current areas point into. The database holds references only; a
 * file is named by its hash and never changes, so what the manifest says about
 * it (size, bounds, features) is read once per process.
 */
import {
  GEOGRAPHY_MANIFEST_VERSION,
  type GeographyBounds,
  type GeographyManifest,
  type GeographyResource,
  type GeographySource,
} from "@bitbaum/geo-kit";
import { createHash } from "node:crypto";
import { eq, isNull } from "drizzle-orm";
import type { PlacesConfig } from "@/lib/config/places/schema";
import type { Database } from "@/lib/db/client";
import { areas, sources } from "@/lib/db/places-schema";
import type { GeometryStore } from "./importer/geometry-store";

export const GEOGRAPHY_FILE_PATH = "/api/v1/places/geography";

export const geographyFileHref = (sha: string) => `${GEOGRAPHY_FILE_PATH}/${sha}.topojson`;

/** The parts of a `geo:v1:` reference (geo-kit's `makeGeometryRef`). */
export function parseGeometryRef(ref: string) {
  const parts = ref.split(":");
  if (parts.length !== 6 || parts[0] !== "geo" || parts[1] !== "v1") {
    return null;
  }
  const [sourceId, datasetVersion, resourceId, featureId] = parts.slice(2).map(decodeURIComponent);
  return {
    sourceId: sourceId!,
    datasetVersion: datasetVersion!,
    resourceId: resourceId!,
    featureId: featureId!,
  };
}

interface FileFacts {
  levelKey: string;
  byteSize: number;
  featureCount: number;
  bbox: GeographyBounds | undefined;
}

const fileFacts = new Map<string, Promise<FileFacts | null>>();

async function readFileFacts(store: GeometryStore, sha: string): Promise<FileFacts | null> {
  const bytes = await store.get(sha);
  if (!bytes) {
    return null;
  }
  const topology = JSON.parse(new TextDecoder().decode(bytes)) as {
    objects: Record<string, { geometries?: unknown[] }>;
    bbox?: number[];
  };
  const [levelKey, object] = Object.entries(topology.objects)[0] ?? [];
  const [west, south, east, north] = topology.bbox ?? [];
  if (!levelKey) {
    return null;
  }
  const bounded =
    west !== undefined && south !== undefined && east !== undefined && north !== undefined;
  return {
    levelKey,
    byteSize: bytes.byteLength,
    featureCount: object?.geometries?.length ?? 0,
    bbox: bounded ? [west, south, east, north] : undefined,
  };
}

/** A file's facts, read once; a missing or unreadable file is asked again next time. */
async function factsOf(store: GeometryStore, sha: string): Promise<FileFacts | null> {
  const known = fileFacts.get(sha) ?? readFileFacts(store, sha);
  fileFacts.set(sha, known);
  const facts = await known.catch(() => null);
  if (!facts) {
    fileFacts.delete(sha);
  }
  return facts;
}

/**
 * Every geometry file a current area points into, with the sources that drew
 * them. A file missing from the store is left out rather than advertised.
 */
export async function geographyManifest(
  db: Database,
  config: PlacesConfig,
  store: GeometryStore,
  now: Date,
): Promise<GeographyManifest> {
  const rows = await db
    .selectDistinct({
      geometryRef: areas.geometryRef,
      validFrom: areas.validFrom,
      validTo: areas.validTo,
      sourceKey: sources.sourceKey,
      retrievedAt: sources.retrievedAt,
    })
    .from(areas)
    .innerJoin(sources, eq(sources.id, areas.sourceId))
    .where(isNull(areas.supersededAt));
  return buildManifest(config, store, now, rows);
}

/** Null is open: no known start. */
const earliest = (a: string | null, b: string | null) =>
  a === null || b === null ? null : a < b ? a : b;
/** Null is open: no known end. */
const latest = (a: string | null, b: string | null) =>
  a === null || b === null ? null : a > b ? a : b;

interface AreaRow {
  geometryRef: string;
  validFrom: string | null;
  validTo: string | null;
  sourceKey: string;
  retrievedAt: Date;
}

export async function buildManifest(
  config: PlacesConfig,
  store: GeometryStore,
  now: Date,
  rows: readonly AreaRow[],
): Promise<GeographyManifest> {
  const resources = new Map<string, GeographyResource>();
  const retrieved = new Map<string, Date>();
  for (const row of rows) {
    const ref = parseGeometryRef(row.geometryRef);
    const source = config.sources.find((s) => s.key === row.sourceKey);
    if (!ref || !source) {
      continue;
    }
    const facts = await factsOf(store, ref.resourceId);
    if (!facts) {
      continue;
    }
    const last = retrieved.get(source.key);
    if (!last || last < row.retrievedAt) {
      retrieved.set(source.key, row.retrievedAt);
    }
    const have = resources.get(ref.resourceId);
    resources.set(ref.resourceId, {
      id: `${source.key}:${ref.datasetVersion}`,
      sourceIds: [source.key],
      kindKey: "administrative",
      geographyId: source.packs[0] ?? source.key,
      levelKey: facts.levelKey,
      format: "topojson",
      href: geographyFileHref(ref.resourceId),
      sha256: ref.resourceId,
      byteSize: facts.byteSize,
      featureCount: facts.featureCount,
      validFrom: have ? earliest(have.validFrom, row.validFrom) : row.validFrom,
      validTo: have ? latest(have.validTo, row.validTo) : row.validTo,
      viewpointKey: null,
      ...(facts.bbox ? { bbox: facts.bbox } : {}),
    });
  }
  const manifestSources: GeographySource[] = [...retrieved].flatMap(([key, retrievedAt]) => {
    const source = config.sources.find((s) => s.key === key);
    return source
      ? [
          {
            id: source.key,
            publisher: source.publisher,
            dataset: source.dataset,
            url: source.homepage,
            licenseSPDX: source.licence,
            retrievedAt: retrievedAt.toISOString(),
            ...(source.attribution ? { attribution: source.attribution.en } : {}),
          },
        ]
      : [];
  });
  const list = [...resources.values()].sort((a, b) => a.id.localeCompare(b.id));
  return {
    schemaVersion: GEOGRAPHY_MANIFEST_VERSION,
    datasetVersion: createHash("sha256")
      .update(list.map((r) => r.sha256).join("\n"))
      .digest("hex")
      .slice(0, 16),
    generatedAt: now.toISOString(),
    sources: manifestSources,
    viewpoints: [],
    resources: list,
  };
}

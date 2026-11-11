/**
 * What a path under /places names (design: docs/design/2026-11-place-navigation.md,
 * "URLs"): a place or an area, and the one path its page has. A path a place
 * once had names it still, so `isCanonical` is false and the caller answers
 * with a 308 to `canonical`.
 */
import { and, eq } from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import type { PlacesConfig } from "@/lib/config/places/schema";
import { jurisdictions, placePaths } from "@/lib/db/places-schema";

export type PathTarget = { kind: "jurisdiction"; id: string } | { kind: "area"; id: string };

export interface ResolvedPath {
  target: PathTarget;
  canonical: string;
  isCanonical: boolean;
}

/** Pure: the target of a row, whichever column holds it. */
export const targetOf = (row: {
  jurisdictionId: string | null;
  areaId: string | null;
}): PathTarget | null =>
  row.jurisdictionId
    ? { kind: "jurisdiction", id: row.jurisdictionId }
    : row.areaId
      ? { kind: "area", id: row.areaId }
      : null;

export async function resolvePlacePath(db: Database, path: string): Promise<ResolvedPath | null> {
  const [row] = await db.select().from(placePaths).where(eq(placePaths.path, path));
  const target = row && targetOf(row);
  if (!row || !target) {
    return null;
  }
  if (row.canonical) {
    return { target, canonical: row.path, isCanonical: true };
  }
  const [canonical] = await db
    .select({ path: placePaths.path })
    .from(placePaths)
    .where(
      and(
        eq(placePaths.canonical, true),
        target.kind === "jurisdiction"
          ? eq(placePaths.jurisdictionId, target.id)
          : eq(placePaths.areaId, target.id),
      ),
    );
  return canonical ? { target, canonical: canonical.path, isCanonical: false } : null;
}

/** What a loader adds to its view: the one path the page has, whichever path asked. */
export interface Located {
  canonicalPath: string;
}

/**
 * The state place a path names, through `place_paths`: the one lookup behind a
 * place page, `/api/v1/places/[...slug]` and `/api/v1/places/atlas`. A path the
 * place once had names it all the same; `canonicalPath` is the path to answer
 * 308 with when it differs from the one asked for. A path of an area, of a
 * place of another origin or of a pack the config does not hold names no place.
 */
export async function findPlace(
  db: Database,
  config: Pick<PlacesConfig, "packs">,
  path: string,
): Promise<{ id: string; countryPack: string; canonicalPath: string } | null> {
  const resolved = await resolvePlacePath(db, path);
  if (resolved?.target.kind !== "jurisdiction") {
    return null;
  }
  const [place] = await db
    .select({ id: jurisdictions.id, countryPack: jurisdictions.countryPack })
    .from(jurisdictions)
    .where(and(eq(jurisdictions.id, resolved.target.id), eq(jurisdictions.origin, "state")));
  if (!place?.countryPack || !config.packs.some((p) => p.key === place.countryPack)) {
    return null;
  }
  return { id: place.id, countryPack: place.countryPack, canonicalPath: resolved.canonical };
}

/**
 * A 308 to a path on this site. Relative, so it holds behind a proxy, where
 * `request.url` names the server's own address and not the one the reader used.
 */
export const movedTo = (location: string) =>
  new Response(null, { status: 308, headers: { Location: location } });

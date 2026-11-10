/**
 * What a path under /places names (design: docs/design/2026-11-place-navigation.md,
 * "URLs"): a place or an area, and the one path its page has. A path a place
 * once had names it still, so `isCanonical` is false and the caller answers
 * with a 308 to `canonical`.
 */
import { and, eq } from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import { placePaths } from "@/lib/db/places-schema";

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

/**
 * Where places sit, read from `place_ancestors` (migration 0025): what lies
 * within a place at every depth, in one indexed join instead of a recursive
 * query per place. Current relations only; a place on a past day still uses
 * `loadChain`.
 */
import { and, count, eq, gt } from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import { jurisdictions, placeAncestors } from "@/lib/db/places-schema";

export interface WithinCount {
  pack: string | null;
  levelKey: string | null;
  places: number;
}

/** How many places lie within this one at every depth (not itself), by pack and level. */
export async function countWithin(db: Database, placeId: string): Promise<WithinCount[]> {
  const rows = await db
    .select({
      pack: jurisdictions.countryPack,
      levelKey: jurisdictions.levelKey,
      places: count(),
    })
    .from(placeAncestors)
    .innerJoin(jurisdictions, eq(jurisdictions.id, placeAncestors.placeId))
    .where(and(eq(placeAncestors.ancestorId, placeId), gt(placeAncestors.depth, 0)))
    .groupBy(jurisdictions.countryPack, jurisdictions.levelKey);
  return rows.map((r) => ({ ...r, places: Number(r.places) }));
}

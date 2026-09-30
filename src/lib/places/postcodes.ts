/**
 * Postcode → the places it lies in, on a given day (design §9.2: "a postcode
 * spanning several places asks"). One postcode can span several places, so
 * the answer is a list; the caller asks the reader when it has more than one.
 * Names, levels and paths come from `loadChain` for the place picked.
 */
import { and, eq, gt, isNull, lte, or } from "drizzle-orm";
import type { Database, Tx } from "@/lib/db/client";
import { placePostcodes } from "@/lib/db/places-schema";

export interface PostcodeLocality {
  name: string;
  /** The part of the locality's addresses inside the place; null when the source states none. */
  share: number | null;
}

export interface PostcodeMatch {
  jurisdictionId: string;
  localities: PostcodeLocality[];
}

interface PostcodeRow {
  jurisdictionId: string;
  locality: string;
  share: number | null;
}

/** Rows grouped by place, the place holding the largest share first. Pure. */
export function groupPostcodeRows(rows: readonly PostcodeRow[]): PostcodeMatch[] {
  const byPlace = new Map<string, PostcodeLocality[]>();
  for (const row of rows) {
    const localities = byPlace.get(row.jurisdictionId) ?? [];
    localities.push({ name: row.locality, share: row.share });
    byPlace.set(row.jurisdictionId, localities);
  }
  const largest = (m: PostcodeMatch) => Math.max(-1, ...m.localities.map((l) => l.share ?? -1));
  return [...byPlace]
    .map(([jurisdictionId, localities]) => ({
      jurisdictionId,
      localities: localities.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => largest(b) - largest(a) || a.jurisdictionId.localeCompare(b.jurisdictionId));
}

export async function resolvePostcode(
  db: Database | Tx,
  packKey: string,
  postcode: string,
  on: string,
): Promise<PostcodeMatch[]> {
  const rows = await db
    .select({
      jurisdictionId: placePostcodes.jurisdictionId,
      locality: placePostcodes.locality,
      share: placePostcodes.share,
    })
    .from(placePostcodes)
    .where(
      and(
        eq(placePostcodes.packKey, packKey),
        eq(placePostcodes.postcode, postcode.trim()),
        isNull(placePostcodes.supersededAt),
        or(isNull(placePostcodes.validFrom), lte(placePostcodes.validFrom, on)),
        or(isNull(placePostcodes.validTo), gt(placePostcodes.validTo, on)),
      ),
    );
  return groupPostcodeRows(
    rows.map((r) => ({ ...r, share: r.share === null ? null : Number(r.share) })),
  );
}

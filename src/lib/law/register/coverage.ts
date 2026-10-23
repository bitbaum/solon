/**
 * What the law register holds, counted from the data (design L0: "the coverage
 * page is computed from the tables, never typed"). The view is pure; the loader
 * counts in the database.
 */
import { count, eq, max, sql } from "drizzle-orm";
import { LAW_AUTHORITIES, LEXFIND } from "@/lib/config/law";
import type { Database } from "@/lib/db/client";
import { legalActs } from "@/lib/db/law-schema";
import { sources } from "@/lib/db/places-schema";

export interface AuthorityCoverage {
  key: string;
  name: string;
  inForce: number;
  notInForce: number;
  /** Acts of this authority whose text Solon holds: none until step L1. */
  withText: number;
}

export interface LawCoverage {
  authorities: AuthorityCoverage[];
  totals: { inForce: number; notInForce: number; withText: number };
  /** ISO date the register was last read; null when never. */
  retrievedOn: string | null;
}

export interface CoverageCounts {
  counts: readonly { authority: string; inForce: boolean; acts: number }[];
  retrievedAt: Date | null;
}

/** Pure: shapes the counts, listing every configured authority, even with no acts. */
export function lawCoverage({ counts, retrievedAt }: CoverageCounts): LawCoverage {
  const authorities = LAW_AUTHORITIES.map((authority): AuthorityCoverage => {
    const mine = counts.filter((row) => row.authority === authority.key);
    return {
      key: authority.key,
      name: authority.name,
      inForce: mine.filter((row) => row.inForce).reduce((sum, row) => sum + row.acts, 0),
      notInForce: mine.filter((row) => !row.inForce).reduce((sum, row) => sum + row.acts, 0),
      withText: 0,
    };
  });
  const sum = (pick: (a: AuthorityCoverage) => number) =>
    authorities.reduce((total, authority) => total + pick(authority), 0);
  return {
    authorities,
    totals: {
      inForce: sum((a) => a.inForce),
      notInForce: sum((a) => a.notInForce),
      withText: sum((a) => a.withText),
    },
    retrievedOn: retrievedAt ? retrievedAt.toISOString().slice(0, 10) : null,
  };
}

export async function loadLawCoverage(db: Database): Promise<LawCoverage> {
  const counts = await db
    .select({ authority: legalActs.authority, inForce: legalActs.inForce, acts: count() })
    .from(legalActs)
    .groupBy(legalActs.authority, legalActs.inForce);
  const [latest] = await db
    .select({ at: max(sources.retrievedAt) })
    .from(sources)
    .where(eq(sources.sourceKey, LEXFIND.key));
  return lawCoverage({ counts, retrievedAt: latest?.at ?? null });
}

export interface ActSearchHit {
  id: string;
  authority: string;
  kind: string;
  inForce: boolean;
  title: string | null;
  systematicNumber: string | null;
  lexfindId: string | null;
}

/** Acts by authority and/or an exact systematic number, or a title fragment. */
export async function searchActs(
  db: Database,
  filter: { authority?: string; number?: string; title?: string; inForceOnly?: boolean },
  limit = 50,
): Promise<ActSearchHit[]> {
  const rows = await db.execute(sql`
    SELECT a.id, a.authority, a.kind, a.in_force AS "inForce",
           n.text AS title, num.value AS "systematicNumber", lf.value AS "lexfindId"
    FROM legal_acts a
    LEFT JOIN legal_act_names n
      ON n.act_id = a.id AND n.kind = 'title' AND n.superseded_at IS NULL
    LEFT JOIN legal_act_identifiers num
      ON num.act_id = a.id AND num.scheme = 'systematic_number' AND num.superseded_at IS NULL
    LEFT JOIN legal_act_identifiers lf
      ON lf.act_id = a.id AND lf.scheme = 'lexfind_id' AND lf.superseded_at IS NULL
    WHERE (${filter.authority ?? null}::text IS NULL OR a.authority = ${filter.authority ?? null})
      AND (${filter.number ?? null}::text IS NULL OR num.value = ${filter.number ?? null})
      AND (${filter.title ?? null}::text IS NULL
           OR n.text ILIKE '%' || replace(replace(${filter.title ?? null}, '%', '\\%'), '_', '\\_') || '%')
      AND (${filter.inForceOnly ? true : null}::boolean IS NULL OR a.in_force)
    ORDER BY a.authority, num.value NULLS LAST, n.text
    LIMIT ${limit}
  `);
  return rows.rows as unknown as ActSearchHit[];
}

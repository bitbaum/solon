/**
 * What the law register holds, counted from the data (design L0: "the coverage
 * page is computed from the tables, never typed"). The view is pure; the loader
 * counts in the database.
 */
import { count, countDistinct, eq, isNull, max, sql } from "drizzle-orm";
import { LAW_AUTHORITIES, LEXFIND } from "@/lib/config/law";
import type { Database } from "@/lib/db/client";
import { legalActs, legalActVersions } from "@/lib/db/law-schema";
import { sources } from "@/lib/db/places-schema";

export interface AuthorityCoverage {
  key: string;
  name: string;
  inForce: number;
  notInForce: number;
  /** Acts of this authority whose text Solon holds, in any language. */
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
  /** Acts per authority that have a current version of their text. */
  withText?: readonly { authority: string; acts: number }[];
  retrievedAt: Date | null;
}

/** Pure: shapes the counts, listing every configured authority, even with no acts. */
export function lawCoverage({ counts, withText = [], retrievedAt }: CoverageCounts): LawCoverage {
  const authorities = LAW_AUTHORITIES.map((authority): AuthorityCoverage => {
    const mine = counts.filter((row) => row.authority === authority.key);
    return {
      key: authority.key,
      name: authority.name,
      inForce: mine.filter((row) => row.inForce).reduce((sum, row) => sum + row.acts, 0),
      notInForce: mine.filter((row) => !row.inForce).reduce((sum, row) => sum + row.acts, 0),
      withText: withText.find((row) => row.authority === authority.key)?.acts ?? 0,
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
  const withText = await db
    .select({ authority: legalActs.authority, acts: countDistinct(legalActVersions.actId) })
    .from(legalActVersions)
    .innerJoin(legalActs, eq(legalActs.id, legalActVersions.actId))
    .where(isNull(legalActVersions.inForceTo))
    .groupBy(legalActs.authority);
  const [latest] = await db
    .select({ at: max(sources.retrievedAt) })
    .from(sources)
    .where(eq(sources.sourceKey, LEXFIND.key));
  return lawCoverage({ counts, withText, retrievedAt: latest?.at ?? null });
}

export interface ActSearchHit {
  id: string;
  authority: string;
  kind: string;
  inForce: boolean;
  title: string | null;
  systematicNumber: string | null;
  lexfindId: string | null;
  /** The act's own page at the authority that publishes it, when the register gives one. */
  officialUrl: string | null;
}

/** Acts by authority and/or an exact systematic number, or a title fragment. */
export async function searchActs(
  db: Database,
  filter: { authority?: string; number?: string; title?: string; inForceOnly?: boolean },
  limit = 50,
): Promise<ActSearchHit[]> {
  const rows = await db.execute(sql`
    SELECT a.id, a.authority, a.kind, a.in_force AS "inForce",
           n.text AS title, num.value AS "systematicNumber", lf.value AS "lexfindId",
           ou.value AS "officialUrl"
    FROM legal_acts a
    LEFT JOIN legal_act_names n
      ON n.act_id = a.id AND n.kind = 'title' AND n.superseded_at IS NULL
    LEFT JOIN legal_act_identifiers num
      ON num.act_id = a.id AND num.scheme = 'systematic_number' AND num.superseded_at IS NULL
    LEFT JOIN legal_act_identifiers lf
      ON lf.act_id = a.id AND lf.scheme = 'lexfind_id' AND lf.superseded_at IS NULL
    LEFT JOIN legal_act_identifiers ou
      ON ou.act_id = a.id AND ou.scheme = 'official_url' AND ou.superseded_at IS NULL
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

export interface ProvisionHit {
  actId: string;
  path: string;
  heading: string;
  text: string;
  lang: string;
  inForceFrom: string;
  inForceTo: string | null;
  status: string;
  /** The publisher's page the copy was read from, and the hash that proves the copy. */
  sourceUrl: string | null;
  contentSha256: string;
}

/**
 * One provision as it stood on `on` (ISO date), in `lang`. Every answer carries
 * where it came from, so a client that does not trust Solon can fetch the
 * publisher's page and compare the hash.
 */
export async function readProvision(
  db: Database,
  input: { actId: string; path: string; lang: string; on: string },
): Promise<ProvisionHit | null> {
  const rows = await db.execute(sql`
    SELECT v.act_id AS "actId", p.path, p.heading, p.text, v.lang,
           v.in_force_from::text AS "inForceFrom", v.in_force_to::text AS "inForceTo",
           v.status, s.url AS "sourceUrl", s.content_sha256 AS "contentSha256"
    FROM legal_provisions p
    JOIN legal_act_versions v ON v.id = p.version_id
    JOIN sources s ON s.id = v.source_id
    WHERE v.act_id = ${input.actId} AND v.lang = ${input.lang} AND p.path = ${input.path}
      AND v.in_force_from <= ${input.on}::date
      AND (v.in_force_to IS NULL OR v.in_force_to >= ${input.on}::date)
    ORDER BY v.in_force_from DESC
    LIMIT 1
  `);
  return (rows.rows[0] as unknown as ProvisionHit | undefined) ?? null;
}

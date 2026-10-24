/**
 * Finding the provisions that answer a question (design:
 * docs/design/2026-10-law-as-data.md). Full-text search over the text of the
 * versions in force, ranked, each hit carrying what a citation needs: the act,
 * the anchor, the publisher's page and the hash of the copy it was read from.
 * Nothing is summarised; the hit is the publisher's words around the match.
 */
import { sql } from "drizzle-orm";
import type { Database } from "@/lib/db/client";

export const SEARCH_LIMIT_MAX = 50;

export interface ProvisionHit {
  actId: string;
  authority: string;
  title: string | null;
  systematicNumber: string | null;
  path: string;
  heading: string;
  lang: string;
  /** The publisher's words around the match, the match between `[[` and `]]`. */
  excerpt: string;
  /** The provision's text, cut at 1,800 characters. */
  text: string;
  inForceFrom: string;
  dateBasis: string;
  sourceUrl: string | null;
  contentSha256: string;
  rank: number;
}

/** ü → ue and ue → ü, so a term finds the law whichever way its publisher spells it. */
const spellings = (term: string): string[] => {
  const folded = term.replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue");
  const umlauted = term.replace(/ae/g, "ä").replace(/oe/g, "ö").replace(/ue/g, "ü");
  return [...new Set([term, folded, umlauted])];
};

/**
 * Terms as a prefix query: any of them, each matching words that begin with it
 * ("fuchs" finds Fuchs, Fuchses, Fuchsjagd). A planned question searches with
 * the few distinctive words of the law's own language, not a sentence.
 */
export function termsQuery(terms: readonly string[]): string {
  const words = terms
    .flatMap((term) => term.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])
    .filter((word) => word.length >= 3);
  return [...new Set(words.flatMap(spellings))].map((word) => `${word}:*`).join(" | ");
}

/**
 * Groups of stems as the queries to try, most exact first. A group holds
 * alternatives for one idea (Fuchs, Wildtier); the ideas are asked for together
 * first, then the first idea alone (the thing the question is about), then all
 * the words loosely. One loose query ranks a common word ("Bewilligung") above
 * the rare one that matters, so the loose query is the last resort, not the first.
 */
export function groupsQueries(groups: readonly (readonly string[])[]): string[] {
  const queries = groups.map((group) => termsQuery(group)).filter(Boolean);
  const tiers: string[] = [];
  if (queries.length > 1) tiers.push(queries.map((q) => `(${q})`).join(" & "));
  if (queries.length > 0) tiers.push(queries[0]!);
  if (queries.length > 1) tiers.push(queries.join(" | "));
  return [...new Set(tiers)];
}

export interface SearchInput {
  q?: string;
  /** Distinctive words, any of which may match; takes the place of `q`. */
  terms?: readonly string[];
  /** Ideas, each a list of alternative stems; see `groupsQueries`. Takes the place of `terms`. */
  groups?: readonly (readonly string[])[];
  authority?: string;
  /** Any of these authorities. */
  authorities?: readonly string[];
  lang?: string;
  limit?: number;
  /** Only acts whose title contains this word (Tierschutzverordnung, Obligationenrecht). */
  title?: string;
  /** How hard ranking prefers fundamental acts; see `RANKING`. */
  ranking?: Partial<typeof RANKING>;
}

/**
 * Ranking prefers the fundamental act: a provision's text score is weighted down
 * for each level its act sits below the top of its collection's numbering
 * (220 → 221.213.11) and for being an ordinance rather than a statute. Words
 * alone put a short ordinance that happens to repeat the question's words above
 * the statute that makes the rule.
 */
export const RANKING = { depth: 0.3, ordinance: 0.8 };

export async function searchProvisions(db: Database, input: SearchInput): Promise<ProvisionHit[]> {
  const limit = Math.min(Math.max(input.limit ?? 10, 1), SEARCH_LIMIT_MAX);
  const q = (input.q ?? "").trim().slice(0, 200);
  const tiers = input.groups?.length
    ? groupsQueries(input.groups)
    : input.terms
      ? [termsQuery(input.terms)].filter(Boolean)
      : [];
  if (tiers.length === 0) return q ? run(db, input, { q }, limit, []) : [];
  const found: ProvisionHit[] = [];
  for (const prefix of tiers) {
    if (found.length >= limit) break;
    const more = await run(db, input, { prefix }, limit - found.length, found.map(idOf));
    found.push(...more);
  }
  return found;
}

const idOf = (hit: ProvisionHit): string => `${hit.actId}#${hit.path}`;

async function run(
  db: Database,
  input: SearchInput,
  by: { q: string } | { prefix: string },
  limit: number,
  skip: readonly string[],
): Promise<ProvisionHit[]> {
  const authority = input.authority ?? null;
  // Authority keys never contain a comma, so a list travels as one string.
  const authorities = input.authorities?.length ? input.authorities.join(",") : null;
  const lang = input.lang ?? null;
  // LIKE wildcards in the word are text, not patterns.
  const title = input.title
    ? `%${input.title
        .trim()
        .slice(0, 60)
        .replace(/[\\%_]/g, "\\$&")}%`
    : null;
  const depth = Math.min(Math.max(input.ranking?.depth ?? RANKING.depth, 0), 3);
  const ordinance = Math.min(Math.max(input.ranking?.ordinance ?? RANKING.ordinance, 0.05), 1);
  const tsq =
    "prefix" in by
      ? sql`to_tsquery('simple', ${by.prefix})`
      : sql`websearch_to_tsquery('simple', ${by.q})`;
  // Provisions already found by an earlier, more exact query; "act#path" cannot contain a comma.
  const skipped = skip.join(",");
  // A loose query on a common word can match most of the law; it is cut off rather than allowed to hold the database.
  const result = await db
    .transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL statement_timeout = 5000`);
      return tx.execute(sql`
    WITH query AS (SELECT ${tsq} AS tsq),
    hits AS (
      SELECT p.id, p.version_id, p.path, p.heading, p.text,
             ts_rank_cd(to_tsvector('simple', p.heading || ' ' || p.text), query.tsq)
               / (1 + ${depth}::float * (coalesce(array_length(string_to_array(num.value, '.'), 1), 1) - 1))
               * (CASE WHEN a.kind IN ('statute', 'constitution', 'treaty') THEN 1 ELSE ${ordinance}::float END) AS rank
      FROM legal_provisions p
      CROSS JOIN query
      JOIN legal_act_versions v ON v.id = p.version_id AND v.in_force_to IS NULL
      JOIN legal_acts a ON a.id = v.act_id AND a.in_force
      LEFT JOIN legal_act_identifiers num
        ON num.act_id = a.id AND num.scheme = 'systematic_number' AND num.superseded_at IS NULL
      WHERE to_tsvector('simple', p.heading || ' ' || p.text) @@ query.tsq
        AND (${authority}::text IS NULL OR a.authority = ${authority})
        AND (${authorities}::text IS NULL OR a.authority = ANY(string_to_array(${authorities}, ',')))
        AND (${lang}::text IS NULL OR v.lang = ${lang})
        AND (${title}::text IS NULL OR EXISTS (
          SELECT 1 FROM legal_act_names t
          WHERE t.act_id = a.id AND t.kind = 'title' AND t.superseded_at IS NULL AND t.text ILIKE ${title}))
        AND (v.act_id || '#' || p.path) <> ALL(string_to_array(${skipped}, ','))
      ORDER BY rank DESC, p.id
      LIMIT ${limit}
    )
    SELECT a.id AS "actId", a.authority, n.text AS title, num.value AS "systematicNumber",
           h.path, h.heading, v.lang,
           left(h.text, 1800) AS text,
           ts_headline('simple', h.text, query.tsq,
             'StartSel=[[, StopSel=]], MaxWords=40, MinWords=15, MaxFragments=1') AS excerpt,
           v.in_force_from::text AS "inForceFrom", v.date_basis AS "dateBasis",
           s.url AS "sourceUrl", s.content_sha256 AS "contentSha256", h.rank::float AS rank
    FROM hits h CROSS JOIN query
    JOIN legal_act_versions v ON v.id = h.version_id
    JOIN legal_acts a ON a.id = v.act_id
    JOIN sources s ON s.id = v.source_id
    LEFT JOIN legal_act_names n ON n.act_id = a.id AND n.kind = 'title' AND n.superseded_at IS NULL
    LEFT JOIN legal_act_identifiers num
      ON num.act_id = a.id AND num.scheme = 'systematic_number' AND num.superseded_at IS NULL
    ORDER BY h.rank DESC, h.id
  `);
    })
    .catch((error: unknown) => {
      if ((error as { cause?: { code?: string } })?.cause?.code === "57014") return null;
      throw error;
    });
  return (result?.rows ?? []) as unknown as ProvisionHit[];
}

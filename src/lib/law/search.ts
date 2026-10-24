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

export async function searchProvisions(
  db: Database,
  input: {
    q?: string;
    /** Distinctive words, any of which may match; takes the place of `q`. */
    terms?: readonly string[];
    authority?: string;
    /** Any of these authorities. */
    authorities?: readonly string[];
    lang?: string;
    limit?: number;
  },
): Promise<ProvisionHit[]> {
  const q = (input.q ?? "").trim().slice(0, 200);
  const prefix = input.terms ? termsQuery(input.terms) : "";
  if (!q && !prefix) return [];
  const limit = Math.min(Math.max(input.limit ?? 10, 1), SEARCH_LIMIT_MAX);
  const authority = input.authority ?? null;
  // Authority keys never contain a comma, so a list travels as one string.
  const authorities = input.authorities?.length ? input.authorities.join(",") : null;
  const lang = input.lang ?? null;
  const tsq = prefix
    ? sql`to_tsquery('simple', ${prefix})`
    : sql`websearch_to_tsquery('simple', ${q})`;
  const result = await db.execute(sql`
    WITH query AS (SELECT ${tsq} AS tsq),
    hits AS (
      SELECT p.id, p.version_id, p.path, p.heading, p.text,
             ts_rank_cd(to_tsvector('simple', p.heading || ' ' || p.text), query.tsq) AS rank
      FROM legal_provisions p, query
      WHERE to_tsvector('simple', p.heading || ' ' || p.text) @@ query.tsq
        AND EXISTS (
          SELECT 1 FROM legal_act_versions v
          JOIN legal_acts a ON a.id = v.act_id
          WHERE v.id = p.version_id AND v.in_force_to IS NULL AND a.in_force
            AND (${authority}::text IS NULL OR a.authority = ${authority})
            AND (${authorities}::text IS NULL OR a.authority = ANY(string_to_array(${authorities}, ',')))
            AND (${lang}::text IS NULL OR v.lang = ${lang})
        )
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
  return result.rows as unknown as ProvisionHit[];
}

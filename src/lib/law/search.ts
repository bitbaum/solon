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
  inForceFrom: string;
  dateBasis: string;
  sourceUrl: string | null;
  contentSha256: string;
  rank: number;
}

export async function searchProvisions(
  db: Database,
  input: { q: string; authority?: string; lang?: string; limit?: number },
): Promise<ProvisionHit[]> {
  const q = input.q.trim().slice(0, 200);
  if (!q) return [];
  const limit = Math.min(Math.max(input.limit ?? 10, 1), SEARCH_LIMIT_MAX);
  const authority = input.authority ?? null;
  const lang = input.lang ?? null;
  const result = await db.execute(sql`
    WITH query AS (SELECT websearch_to_tsquery('simple', ${q}) AS tsq),
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
            AND (${lang}::text IS NULL OR v.lang = ${lang})
        )
      ORDER BY rank DESC, p.id
      LIMIT ${limit}
    )
    SELECT a.id AS "actId", a.authority, n.text AS title, num.value AS "systematicNumber",
           h.path, h.heading, v.lang,
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

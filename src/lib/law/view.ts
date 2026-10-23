/**
 * What the reading pages show (design: docs/design/2026-10-law-as-data.md):
 * an act with its title, number and links, and the provisions of the version in
 * force, a page at a time. Everything here is read from the tables; nothing is
 * written by hand.
 */
import { sql } from "drizzle-orm";
import type { Database } from "@/lib/db/client";

export const PROVISIONS_PER_PAGE = 40;

export interface ActView {
  id: string;
  authority: string;
  kind: string;
  inForce: boolean;
  title: string | null;
  systematicNumber: string | null;
  officialUrl: string | null;
  version: {
    lang: string;
    inForceFrom: string;
    /** `publisher` when `inForceFrom` is the publisher's date; `retrieved` when it is the day Solon read the page. */
    dateBasis: string;
    status: string;
    sourceUrl: string | null;
    contentSha256: string;
    retrievedOn: string;
    provisionCount: number;
  } | null;
  provisions: { path: string; heading: string; text: string }[];
}

/** The act, and one page of the provisions of its current version in `lang`. */
export async function loadActView(
  db: Database,
  input: { id: string; lang: string; page: number },
): Promise<ActView | null> {
  const acts = await db.execute(sql`
    SELECT a.id, a.authority, a.kind, a.in_force AS "inForce",
           n.text AS title, num.value AS "systematicNumber", ou.value AS "officialUrl"
    FROM legal_acts a
    LEFT JOIN legal_act_names n
      ON n.act_id = a.id AND n.kind = 'title' AND n.superseded_at IS NULL
    LEFT JOIN legal_act_identifiers num
      ON num.act_id = a.id AND num.scheme = 'systematic_number' AND num.superseded_at IS NULL
    LEFT JOIN legal_act_identifiers ou
      ON ou.act_id = a.id AND ou.scheme = 'official_url' AND ou.superseded_at IS NULL
    WHERE a.id = ${input.id}
    LIMIT 1
  `);
  const act = acts.rows[0] as Omit<ActView, "version" | "provisions"> | undefined;
  if (!act) return null;

  const versions = await db.execute(sql`
    SELECT v.id, v.lang, v.in_force_from::text AS "inForceFrom", v.date_basis AS "dateBasis",
           v.status, s.url AS "sourceUrl", s.content_sha256 AS "contentSha256",
           s.retrieved_at::date::text AS "retrievedOn",
           (SELECT count(*)::int FROM legal_provisions p WHERE p.version_id = v.id) AS "provisionCount"
    FROM legal_act_versions v
    JOIN sources s ON s.id = v.source_id
    WHERE v.act_id = ${input.id} AND v.lang = ${input.lang} AND v.in_force_to IS NULL
    ORDER BY v.in_force_from DESC
    LIMIT 1
  `);
  const found = versions.rows[0] as (NonNullable<ActView["version"]> & { id: string }) | undefined;
  if (!found) return { ...act, version: null, provisions: [] };
  const { id: versionId, ...version } = found;

  const offset = Math.max(0, input.page - 1) * PROVISIONS_PER_PAGE;
  const provisions = await db.execute(sql`
    SELECT path, heading, text FROM legal_provisions
    WHERE version_id = ${versionId}
    ORDER BY ord
    LIMIT ${PROVISIONS_PER_PAGE} OFFSET ${offset}
  `);
  return { ...act, version, provisions: provisions.rows as unknown as ActView["provisions"] };
}

/**
 * What changed in the law Solon holds since a day: acts whose text is new
 * (first held) or amended (a newer version replaced the one held), and acts the
 * register no longer calls in force. Read from the tables, never typed; the
 * day a change was recorded is when Solon learned of it, and each change says
 * from which day the publisher says it applies.
 */
import { sql } from "drizzle-orm";
import type { Database } from "@/lib/db/client";

export interface LawChange {
  kind: "new" | "amended" | "repealed";
  actId: string;
  authority: string;
  title: string | null;
  number: string | null;
  /** The day the new text applies from (empty for a repeal). */
  inForceFrom: string | null;
  /** `publisher` when the publisher states that day; `retrieved` when it is the day Solon read it. */
  dateBasis: string | null;
  /** When Solon recorded the change. */
  recordedAt: string;
  sourceUrl: string | null;
}

export async function loadLawChanges(
  db: Database,
  input: { since: string; authorities?: readonly string[]; limit?: number },
): Promise<LawChange[]> {
  const authorities = input.authorities?.length ? input.authorities.join(",") : null;
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 1000);
  const rows = await db.execute(sql`
    WITH texts AS (
      SELECT CASE WHEN EXISTS (
               SELECT 1 FROM legal_act_versions o
               WHERE o.act_id = v.act_id AND o.lang = v.lang AND o.id <> v.id
                 AND o.recorded_at < v.recorded_at)
             THEN 'amended' ELSE 'new' END AS kind,
             v.act_id, v.in_force_from::text AS in_force_from, v.date_basis,
             v.recorded_at, s.url AS source_url
      FROM legal_act_versions v
      JOIN sources s ON s.id = v.source_id
      WHERE v.recorded_at >= ${input.since}::date
    ),
    repeals AS (
      SELECT 'repealed' AS kind, a.id AS act_id, NULL::text AS in_force_from, NULL::text AS date_basis,
             a.updated_at AS recorded_at, NULL::text AS source_url
      FROM legal_acts a
      WHERE NOT a.in_force AND a.updated_at >= ${input.since}::date AND a.updated_at > a.recorded_at
    )
    SELECT c.kind, c.act_id AS "actId", a.authority, n.text AS title, num.value AS number,
           c.in_force_from AS "inForceFrom", c.date_basis AS "dateBasis",
           c.recorded_at::text AS "recordedAt", c.source_url AS "sourceUrl"
    FROM (SELECT * FROM texts UNION ALL SELECT * FROM repeals) c
    JOIN legal_acts a ON a.id = c.act_id
    LEFT JOIN legal_act_names n ON n.act_id = a.id AND n.kind = 'title' AND n.superseded_at IS NULL
    LEFT JOIN legal_act_identifiers num
      ON num.act_id = a.id AND num.scheme = 'systematic_number' AND num.superseded_at IS NULL
    WHERE (${authorities}::text IS NULL OR a.authority = ANY(string_to_array(${authorities}, ',')))
    ORDER BY c.recorded_at DESC
    LIMIT ${limit}
  `);
  return rows.rows as unknown as LawChange[];
}

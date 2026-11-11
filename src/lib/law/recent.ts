/**
 * What changed lately in the law that applies to a place: the acts of its
 * authorities whose current text took effect in the past twelve months, by
 * the publisher's own date (a copy dated the day Solon read it says nothing
 * about when the law changed, so it is left out). Newest first; the count of
 * every such act beside the few shown.
 */
import { sql } from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import { rowsOf } from "@/lib/db/rows";

export interface RecentChange {
  actId: string;
  title: string;
  authority: string;
  inForceFrom: string;
  /** Whether Solon holds an earlier text of the act: amended, else new. */
  amended: boolean;
}

export async function recentChanges(
  db: Database,
  authorities: readonly string[],
  today: string,
  limit = 6,
): Promise<{ total: number; changes: RecentChange[] }> {
  if (authorities.length === 0) return { total: 0, changes: [] };
  const list = sql.join(
    authorities.map((a) => sql`${a}`),
    sql`, `,
  );
  const window = sql`v.in_force_from > (${today}::date - INTERVAL '1 year') AND v.in_force_from <= ${today}::date`;
  const rows = rowsOf<{
    act_id: string;
    title: string;
    authority: string;
    in_force_from: string;
    amended: boolean;
  }>(
    await db.execute(sql`
      SELECT a.id AS act_id, n.text AS title, a.authority, v.in_force_from::text AS in_force_from,
             EXISTS (SELECT 1 FROM legal_act_versions e
                     WHERE e.act_id = a.id AND e.in_force_from < v.in_force_from) AS amended
      FROM legal_act_versions v
      JOIN legal_acts a ON a.id = v.act_id
      JOIN legal_act_names n ON n.act_id = a.id AND n.kind = 'title' AND n.superseded_at IS NULL
      WHERE a.authority IN (${list}) AND a.in_force AND v.in_force_to IS NULL
        AND v.date_basis = 'publisher' AND ${window}
      ORDER BY v.in_force_from DESC, n.text
      LIMIT ${limit}`),
  );
  const [count] = rowsOf<{ total: string }>(
    await db.execute(sql`
      SELECT count(DISTINCT a.id) AS total
      FROM legal_act_versions v JOIN legal_acts a ON a.id = v.act_id
      WHERE a.authority IN (${list}) AND a.in_force AND v.in_force_to IS NULL
        AND v.date_basis = 'publisher' AND ${window}`),
  );
  return {
    total: Number(count?.total ?? 0),
    changes: rows.map((r) => ({
      actId: r.act_id,
      title: r.title,
      authority: r.authority,
      inForceFrom: r.in_force_from,
      amended: r.amended,
    })),
  };
}

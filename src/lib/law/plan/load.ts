/** The plan file and the counts it is measured against. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import { rowsOf } from "@/lib/db/rows";
import { lawPlanSchema, type LawPlan } from "./schema";
import type { AuthorityCounts } from "./status";

export const PLAN_FILE = join(process.cwd(), "data", "law", "plan.json");

export function readPlan(file = PLAN_FILE): LawPlan {
  return lawPlanSchema.parse(JSON.parse(readFileSync(file, "utf8")));
}

/** Per authority: constitution and other acts in force, listed and with a current text. */
export async function loadPlanCounts(db: Database): Promise<Map<string, AuthorityCounts>> {
  const rows = rowsOf<{
    authority: string;
    constitution: boolean;
    listed: number;
    with_text: number;
  }>(
    await db.execute(sql`
      SELECT a.authority, a.kind = 'constitution' AS constitution,
             count(*)::int AS listed,
             count(*) FILTER (WHERE EXISTS (
               SELECT 1 FROM legal_act_versions v WHERE v.act_id = a.id AND v.in_force_to IS NULL
             ))::int AS with_text
      FROM legal_acts a
      WHERE a.in_force
      GROUP BY 1, 2`),
  );
  const out = new Map<string, AuthorityCounts>();
  for (const r of rows) {
    const c = out.get(r.authority) ?? {
      constitution: { listed: 0, withText: 0 },
      national: { listed: 0, withText: 0 },
    };
    c[r.constitution ? "constitution" : "national"] = { listed: r.listed, withText: r.with_text };
    out.set(r.authority, c);
  }
  return out;
}

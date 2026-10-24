/**
 * Finds the provisions that bear on a question, a few per place so that a
 * comparison between cantons has both sides: the Confederation's rule, then each
 * place's own. The same provision never appears twice.
 */
import type { Database } from "@/lib/db/client";
import { searchProvisions, type ProvisionHit } from "../search";
import type { Plan } from "./plan";

export const PER_AUTHORITY = 6;

export async function retrieve(db: Database, plan: Plan): Promise<ProvisionHit[]> {
  const seen = new Set<string>();
  const out: ProvisionHit[] = [];
  for (const authority of plan.authorities) {
    const hits = await searchProvisions(db, {
      terms: plan.terms,
      authority,
      limit: PER_AUTHORITY,
    });
    for (const hit of hits) {
      const key = `${hit.actId}#${hit.path}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(hit);
    }
  }
  return out;
}

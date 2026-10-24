/**
 * Finds the provisions that bear on a question, a few per place so that a
 * comparison between cantons has both sides: the Confederation's rule, then each
 * place's own. The same provision never appears twice.
 */
import type { Database } from "@/lib/db/client";
import { searchProvisions, type ProvisionHit } from "../search";
import type { Plan } from "./plan";

/** Wide on purpose: the model that reads the headings next (refine.ts) picks the few that apply. */
export const PER_AUTHORITY = 15;

export async function retrieve(db: Database, plan: Plan): Promise<ProvisionHit[]> {
  const seen = new Set<string>();
  const out: ProvisionHit[] = [];
  // The acts the model points at first, searched with the question's ideas: the rule itself, not a word that ranks.
  for (const act of plan.acts) {
    for (const hit of await searchProvisions(db, {
      groups: plan.groups,
      title: act,
      authorities: plan.authorities,
      limit: 8,
    })) {
      const key = `${hit.actId}#${hit.path}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(hit);
    }
  }
  for (const authority of plan.authorities) {
    const hits = await searchProvisions(db, {
      groups: plan.groups,
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

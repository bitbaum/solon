/**
 * How many laws Solon holds at a place, said once. Every surface that shows a
 * number of laws (the globe, the /places sidebar, a place page, /law/place, the
 * law tree) reads it here, so no two can disagree, and every number carries
 * what it counts:
 *
 * - `own`: the laws of this place's own authority (a country's national law);
 * - `within`: this place's own and those of every authority within it (the
 *   national law and every canton's and commune's).
 *
 * Both count acts whose text Solon holds, from the tables (`loadLawCoverage`);
 * an act whose publisher states no status is counted, and the pages that show
 * it say its status is not stated. The roll-up follows the tree derived from
 * `LAW_AUTHORITIES` (`chainOf`), so a new country, a territory or a union needs
 * no code. Design: docs/design/2026-11-place-navigation.md, QA item 4.
 */
import type { Database } from "@/lib/db/client";
import { chainOf } from "./places";
import { loadLawCoverage, type LawCoverage } from "./register/coverage";

/** What a number of laws counts. A bare number is never shown: say which. */
export type CountScope = "own" | "within";

export interface LawCount {
  /** Acts of this authority alone. */
  own: number;
  /** Acts of this authority and of every authority within it; `own` included. */
  within: number;
}

/** The count of one authority for one scope; zero for an authority nobody holds law for. */
export const countOf = (
  counts: ReadonlyMap<string, LawCount>,
  key: string,
  scope: CountScope,
): number => counts.get(key)?.[scope] ?? 0;

/**
 * Pure: each authority's own count, from the acts held per authority, and the
 * sum of its own and everything within it. An authority is within every
 * authority above it in the tree.
 */
export function rollUp(held: ReadonlyMap<string, number>): Map<string, LawCount> {
  const out = new Map<string, LawCount>();
  const entry = (key: string): LawCount => {
    let count = out.get(key);
    if (!count) {
      count = { own: 0, within: 0 };
      out.set(key, count);
    }
    return count;
  };
  for (const [key, acts] of held) {
    if (acts <= 0) continue;
    const chain = chainOf(key);
    if (chain.length === 0) continue;
    entry(key).own += acts;
    for (const authority of chain) entry(authority.key).within += acts;
  }
  return out;
}

/**
 * What a count counts, said once: per authority, the acts in force whose text
 * Solon holds. Every surface that prints a number of laws builds it from this.
 */
export const heldOf = (coverage: Pick<LawCoverage, "authorities">): Map<string, number> =>
  new Map(coverage.authorities.map((a) => [a.key, a.withText]));

/** Every authority's counts, read from the database in one coverage query. */
export async function loadLawCounts(db: Database): Promise<Map<string, LawCount>> {
  return rollUp(heldOf(await loadLawCoverage(db)));
}

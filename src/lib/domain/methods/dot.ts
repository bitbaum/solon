import { z } from "zod";
import type { Aggregate, BallotOption, MethodSpec, RankedEntry, WeightedBallot } from "./types";

export interface DotBallot {
  allocations: Record<string, number>;
}

/** Dots each member gets to spend. Snapshotted onto the session at open. */
export const DEFAULT_DOT_BUDGET = 5;

/**
 * Spend a fixed budget of dots across the options.
 *
 * This is the method for "how much of each?" rather than "which one?" — the
 * question a treasury actually asks. Because the budget is fixed, backing
 * everything is the same as backing nothing: the member has to state a
 * priority, which is the information the organization needs and which a
 * yes/no vote structurally cannot carry.
 *
 * A member's voting weight multiplies their dots, so weight scales influence
 * without changing the shape of the ballot.
 */
export function dotMethod(budget: number = DEFAULT_DOT_BUDGET): MethodSpec<DotBallot> {
  return {
    id: "dot",
    kind: "ranking",
    label: "Dot allocation",
    summary: `Spend ${budget} dots across the options however you like. The dots are the priority.`,
    needsOptions: true,

    schema: (options: BallotOption[]) => {
      const keys = new Set(options.map((o) => o.key));
      return z
        .object({
          allocations: z.record(z.string(), z.number().int().min(0).max(budget)),
        })
        .refine(
          (b) => Object.keys(b.allocations).every((k) => keys.has(k)),
          "allocation names an option that is not on this ballot",
        )
        .refine((b) => {
          const spent = Object.values(b.allocations).reduce((s, n) => s + n, 0);
          return spent > 0 && spent <= budget;
        }, `spend between 1 and ${budget} dots in total`);
    },

    // Sorted by key and zero-allocations dropped, so the same intent always
    // produces the same signed text regardless of how the client built the object.
    canonical: (b) =>
      `dots:${Object.entries(b.allocations)
        .filter(([, n]) => n > 0)
        .sort(([a], [c]) => (a < c ? -1 : a > c ? 1 : 0))
        .map(([k, n]) => `${k}=${n}`)
        .join(",")}`,

    aggregate(ballots: WeightedBallot<DotBallot>[], options: BallotOption[]): Aggregate {
      const dotsFor = new Map(options.map((o) => [o.key, 0]));
      let castWeight = 0;
      let totalDots = 0;
      for (const { ballot, weight } of ballots) {
        castWeight += weight;
        for (const [key, n] of Object.entries(ballot.allocations)) {
          if (!dotsFor.has(key) || n <= 0) continue;
          const weighted = n * weight;
          dotsFor.set(key, (dotsFor.get(key) ?? 0) + weighted);
          totalDots += weighted;
        }
      }
      const ranked: RankedEntry[] = options
        .map((o) => {
          const score = dotsFor.get(o.key) ?? 0;
          return {
            key: o.key,
            label: o.label,
            score,
            percent: totalDots > 0 ? Math.round((score / totalDots) * 100) : 0,
          };
        })
        .sort((a, b) => b.score - a.score);

      return { method: "dot", kind: "ranking", castWeight, ballotCount: ballots.length, ranked };
    },
  };
}

export const dot = dotMethod();

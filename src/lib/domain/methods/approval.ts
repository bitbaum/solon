import { z } from "zod";
import type { Aggregate, BallotOption, MethodSpec, RankedEntry, WeightedBallot } from "./types";

export interface ApprovalBallot {
  approved: string[];
}

/**
 * Approve as many options as you find acceptable. The option the most weight
 * finds acceptable wins.
 *
 * Approval avoids the split-vote failure of plurality: backing your second
 * choice as well as your first never hurts your first, so nobody is punished
 * for honesty about what they could live with.
 */
export const approval: MethodSpec<ApprovalBallot> = {
  id: "approval",
  kind: "ranking",
  label: "Approval",
  summary:
    "Approve every option you find acceptable — as few or as many as you like. The option with the most approval wins.",
  needsOptions: true,

  schema: (options: BallotOption[]) => {
    const keys = options.map((o) => o.key);
    return z.object({
      approved: z
        .array(z.enum(keys as [string, ...string[]]))
        .min(1, "approve at least one option, or abstain by not voting")
        .refine((a) => new Set(a).size === a.length, "an option cannot be approved twice"),
    });
  },

  // Sorted: approving {b, a} and {a, b} are the same ballot and must sign identically.
  canonical: (b) => `approve:${[...b.approved].sort().join(",")}`,

  aggregate(ballots: WeightedBallot<ApprovalBallot>[], options: BallotOption[]): Aggregate {
    const weightFor = new Map(options.map((o) => [o.key, 0]));
    let castWeight = 0;
    for (const { ballot, weight } of ballots) {
      castWeight += weight;
      for (const key of new Set(ballot.approved)) {
        weightFor.set(key, (weightFor.get(key) ?? 0) + weight);
      }
    }
    const ranked: RankedEntry[] = options
      .map((o) => {
        const score = weightFor.get(o.key) ?? 0;
        return {
          key: o.key,
          label: o.label,
          score,
          percent: castWeight > 0 ? Math.round((score / castWeight) * 100) : 0,
        };
      })
      .sort((a, b) => b.score - a.score);

    return { method: "approval", kind: "ranking", castWeight, ballotCount: ballots.length, ranked };
  },
};

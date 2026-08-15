import { z } from "zod";
import type { Aggregate, BallotOption, MethodSpec, RankedEntry, WeightedBallot } from "./types";

export interface ScoreBallot {
  scores: Record<string, number>;
}

export const MAX_SCORE = 5;

/**
 * Rate every option from 0 to 5, independently. Highest weighted mean wins.
 *
 * Unlike dot allocation this is not zero-sum: a member can say "all three of
 * these are good" and be believed. That makes it the right instrument for
 * judging quality (candidates, bids, designs) and the wrong one for dividing a
 * budget, where saying yes to everything has to cost something.
 *
 * The mean is taken over the members who actually rated an option, so an
 * option nobody scored reads as unrated rather than as zero — silence is not
 * a bad review.
 */
export const score: MethodSpec<ScoreBallot> = {
  id: "score",
  kind: "ranking",
  label: "Score",
  summary: `Rate each option from 0 to ${MAX_SCORE}. The highest average wins.`,
  needsOptions: true,

  schema: (options: BallotOption[]) => {
    const keys = new Set(options.map((o) => o.key));
    return z
      .object({
        scores: z.record(z.string(), z.number().int().min(0).max(MAX_SCORE)),
      })
      .refine(
        (b) => Object.keys(b.scores).every((k) => keys.has(k)),
        "score names an option that is not on this ballot",
      )
      .refine((b) => Object.keys(b.scores).length > 0, "rate at least one option");
  },

  canonical: (b) =>
    `scores:${Object.entries(b.scores)
      .sort(([a], [c]) => (a < c ? -1 : a > c ? 1 : 0))
      .map(([k, n]) => `${k}=${n}`)
      .join(",")}`,

  aggregate(ballots: WeightedBallot<ScoreBallot>[], options: BallotOption[]): Aggregate {
    const totals = new Map(options.map((o) => [o.key, { weighted: 0, weight: 0 }]));
    let castWeight = 0;
    for (const { ballot, weight } of ballots) {
      castWeight += weight;
      for (const [key, n] of Object.entries(ballot.scores)) {
        const acc = totals.get(key);
        if (!acc) continue;
        acc.weighted += n * weight;
        acc.weight += weight;
      }
    }
    const ranked: RankedEntry[] = options
      .map((o) => {
        const acc = totals.get(o.key)!;
        const mean = acc.weight > 0 ? acc.weighted / acc.weight : 0;
        return {
          key: o.key,
          label: o.label,
          score: Math.round(mean * 100) / 100,
          percent: Math.round((mean / MAX_SCORE) * 100),
        };
      })
      .sort((a, b) => b.score - a.score);

    return { method: "score", kind: "ranking", castWeight, ballotCount: ballots.length, ranked };
  },
};

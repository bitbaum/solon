import { z } from "zod";
import type { Aggregate, BallotOption, MethodSpec, RankedEntry, WeightedBallot } from "./types";

export interface RankedBallot {
  ranking: string[];
}

/**
 * Rank the options in order of preference. Unranked options sit tied at the
 * bottom — a member is never forced to express a preference they do not hold.
 *
 * The published ordering is a Borda count, which is stated plainly rather than
 * hidden behind the words "ranked choice": Borda and instant-runoff can crown
 * different winners from identical ballots, so a tool that says only "ranked
 * choice" has told the voter nothing about how their ballot will be read.
 *
 * Alongside it we compute the Condorcet winner — the option that beats every
 * other in a head-to-head — because it is the closest thing to an
 * uncontestable answer. When Borda and Condorcet disagree, `condorcetKey`
 * differs from the top of `ranked`, and the UI says so. Surfacing that
 * disagreement is the honest move: it is precisely the case where the choice
 * of counting rule, rather than the voters, decided the outcome.
 */
export const ranked: MethodSpec<RankedBallot> = {
  id: "ranked",
  kind: "ranking",
  label: "Ranked (Borda)",
  summary:
    "Put the options in your order of preference. Earlier places earn more points; anything you leave out ties for last.",
  needsOptions: true,

  schema: (options: BallotOption[]) => {
    const keys = options.map((o) => o.key);
    return z.object({
      ranking: z
        .array(z.enum(keys as [string, ...string[]]))
        .min(1, "rank at least one option")
        .refine((r) => new Set(r).size === r.length, "an option cannot appear twice in a ranking"),
    });
  },

  // Order is the ballot's meaning here, so it is preserved, not sorted.
  canonical: (b) => `rank:${b.ranking.join(">")}`,

  aggregate(ballots: WeightedBallot<RankedBallot>[], options: BallotOption[]): Aggregate {
    const n = options.length;
    const points = new Map(options.map((o) => [o.key, 0]));
    // pairwise[a][b] = weight preferring a over b.
    const pairwise = new Map<string, Map<string, number>>(
      options.map((o) => [o.key, new Map(options.map((p) => [p.key, 0]))]),
    );
    let castWeight = 0;

    for (const { ballot, weight } of ballots) {
      castWeight += weight;
      const place = new Map<string, number>();
      ballot.ranking.forEach((key, i) => place.set(key, i));

      for (const o of options) {
        const rank = place.get(o.key);
        // Borda: first of n earns n-1, each later place one fewer, unranked earns 0.
        if (rank !== undefined)
          points.set(o.key, (points.get(o.key) ?? 0) + (n - 1 - rank) * weight);
      }
      for (const a of options) {
        for (const b of options) {
          if (a.key === b.key) continue;
          const ra = place.get(a.key);
          const rb = place.get(b.key);
          // Ranked beats unranked; earlier beats later; two unranked tie.
          const aWins = ra !== undefined && (rb === undefined || ra < rb);
          if (aWins) pairwise.get(a.key)!.set(b.key, pairwise.get(a.key)!.get(b.key)! + weight);
        }
      }
    }

    const maxPoints = castWeight * (n - 1);
    const rankedEntries: RankedEntry[] = options
      .map((o) => {
        const score = points.get(o.key) ?? 0;
        return {
          key: o.key,
          label: o.label,
          score,
          percent: maxPoints > 0 ? Math.round((score / maxPoints) * 100) : 0,
        };
      })
      .sort((a, b) => b.score - a.score);

    const condorcetKey =
      options.find((a) =>
        options.every(
          (b) =>
            a.key === b.key || pairwise.get(a.key)!.get(b.key)! > pairwise.get(b.key)!.get(a.key)!,
        ),
      )?.key ?? null;

    return {
      method: "ranked",
      kind: "ranking",
      castWeight,
      ballotCount: ballots.length,
      ranked: rankedEntries,
      condorcetKey,
    };
  },
};

import { z } from "zod";
import type { Aggregate, MethodSpec, WeightedBallot } from "./types";

export interface SingleChoiceBallot {
  choice: "yes" | "no" | "abstain";
}

/**
 * Yes, no, or abstain — the method Solon shipped with.
 *
 * `canonical` returns the bare word, which reproduces the exact `choice:yes`
 * line the original `voteMessage` wrote. That byte-identity is not a nicety:
 * every vote already cast carries a stored signature over that text, and the
 * audit trail is append-only. If this encoding drifted by one character, every
 * historical vote would stop verifying and the record would become unreadable
 * in the only way that matters. A test pins it against a literal.
 */
export const singleChoice: MethodSpec<SingleChoiceBallot> = {
  id: "single_choice",
  kind: "decision",
  label: "Yes / no",
  summary:
    "Each member votes yes, no, or abstain. Abstaining counts toward quorum but not toward the result.",
  needsOptions: false,

  schema: () => z.object({ choice: z.enum(["yes", "no", "abstain"]) }),

  canonical: (b) => b.choice,

  aggregate(ballots: WeightedBallot<SingleChoiceBallot>[]): Aggregate {
    const decisive = { for: 0, against: 0, abstain: 0 };
    for (const { ballot, weight } of ballots) {
      if (ballot.choice === "yes") decisive.for += weight;
      else if (ballot.choice === "no") decisive.against += weight;
      else decisive.abstain += weight;
    }
    return {
      method: "single_choice",
      kind: "decision",
      castWeight: decisive.for + decisive.against + decisive.abstain,
      ballotCount: ballots.length,
      decisive,
    };
  },
};

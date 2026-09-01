import { describe, expect, it } from "vitest";
import { SessionOutcome, VoteThreshold } from "@/lib/db/enums";
import { decideOutcome, tallyOf } from "../tally";
import { aggregateBallots } from "../methods";
import type { Aggregate } from "../methods/types";

const yes = (weight: number) => ({ ballot: { choice: "yes" }, weight });
const no = (weight: number) => ({ ballot: { choice: "no" }, weight });
const abstain = (weight: number) => ({ ballot: { choice: "abstain" }, weight });

const agg = (ballots: { ballot: unknown; weight: number }[]): Aggregate =>
  aggregateBallots("single_choice", ballots, []);

describe("single-choice aggregate", () => {
  it("sums weight per side and exposes a yes/no/abstain view", () => {
    const a = agg([yes(2.5), yes(1), no(1), abstain(0.5)]);
    expect(a.castWeight).toBe(5);
    expect(tallyOf(a)).toEqual({ yes: 3.5, no: 1, abstain: 0.5 });
  });
});

describe("decideOutcome — quorum", () => {
  const rules = { threshold: VoteThreshold.SIMPLE_MAJORITY, quorumPercent: 50, eligibleWeight: 10 };

  it("expires when cast weight is under quorum, however lopsided the result", () => {
    expect(decideOutcome({ aggregate: agg([yes(4)]), ...rules }).outcome).toBe(
      SessionOutcome.EXPIRED,
    );
  });

  it("counts abstentions toward quorum but not toward the threshold", () => {
    // 5 of 10 weight cast → quorum met; 3 yes vs 1 no decides it.
    const a = agg([yes(3), no(1), abstain(1)]);
    expect(decideOutcome({ aggregate: a, ...rules }).outcome).toBe(SessionOutcome.APPROVED);
  });

  it("expires when everyone who showed up abstained — nothing was decided", () => {
    expect(decideOutcome({ aggregate: agg([abstain(6)]), ...rules }).outcome).toBe(
      SessionOutcome.EXPIRED,
    );
  });

  it("expires when there is no eligible weight at all", () => {
    expect(decideOutcome({ aggregate: agg([yes(1)]), ...rules, eligibleWeight: 0 }).outcome).toBe(
      SessionOutcome.EXPIRED,
    );
  });
});

describe("decideOutcome — thresholds", () => {
  const base = { quorumPercent: 0, eligibleWeight: 10 };

  it("simple majority passes on more yes than no", () => {
    expect(
      decideOutcome({
        aggregate: agg([yes(3), no(2)]),
        threshold: VoteThreshold.SIMPLE_MAJORITY,
        ...base,
      }).outcome,
    ).toBe(SessionOutcome.APPROVED);
  });

  it("simple majority rejects a tie — a tie is not a mandate", () => {
    expect(
      decideOutcome({
        aggregate: agg([yes(2), no(2)]),
        threshold: VoteThreshold.SIMPLE_MAJORITY,
        ...base,
      }).outcome,
    ).toBe(SessionOutcome.REJECTED);
  });

  it("supermajority needs two thirds, not a bare majority", () => {
    expect(
      decideOutcome({
        aggregate: agg([yes(3), no(2)]),
        threshold: VoteThreshold.SUPERMAJORITY,
        ...base,
      }).outcome,
    ).toBe(SessionOutcome.REJECTED);
    expect(
      decideOutcome({
        aggregate: agg([yes(2), no(1)]),
        threshold: VoteThreshold.SUPERMAJORITY,
        ...base,
      }).outcome,
    ).toBe(SessionOutcome.APPROVED);
  });
});

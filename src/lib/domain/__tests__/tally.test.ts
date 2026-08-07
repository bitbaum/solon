import { describe, expect, it } from "vitest";
import { SessionOutcome, VoteChoice, VoteThreshold } from "@prisma/client";
import { closeRefusal, decideOutcome, tally } from "../tally";

describe("tally", () => {
  it("weights votes by member weight", () => {
    expect(
      tally([
        { choice: VoteChoice.YES, weight: 2.5 },
        { choice: VoteChoice.YES, weight: 1 },
        { choice: VoteChoice.NO, weight: 1 },
        { choice: VoteChoice.ABSTAIN, weight: 0.5 },
      ]),
    ).toEqual({ yes: 3.5, no: 1, abstain: 0.5 });
  });

  it("is zero on no votes", () => {
    expect(tally([])).toEqual({ yes: 0, no: 0, abstain: 0 });
  });
});

describe("decideOutcome", () => {
  const base = { quorumPercent: 50, eligibleWeight: 10 };

  it("approves a simple majority above quorum", () => {
    expect(
      decideOutcome({ ...base, tally: { yes: 4, no: 2, abstain: 0 }, threshold: VoteThreshold.SIMPLE_MAJORITY }),
    ).toBe(SessionOutcome.APPROVED);
  });

  it("rejects when no >= yes", () => {
    expect(
      decideOutcome({ ...base, tally: { yes: 3, no: 3, abstain: 0 }, threshold: VoteThreshold.SIMPLE_MAJORITY }),
    ).toBe(SessionOutcome.REJECTED);
  });

  it("expires below quorum — silence is not consent", () => {
    expect(
      decideOutcome({ ...base, tally: { yes: 2, no: 0, abstain: 0 }, threshold: VoteThreshold.SIMPLE_MAJORITY }),
    ).toBe(SessionOutcome.EXPIRED);
  });

  it("abstain counts toward quorum but not toward the threshold", () => {
    // 2 yes + 3 abstain = 5 cast, meets 50% quorum of 10; yes wins 2:0.
    expect(
      decideOutcome({ ...base, tally: { yes: 2, no: 0, abstain: 3 }, threshold: VoteThreshold.SIMPLE_MAJORITY }),
    ).toBe(SessionOutcome.APPROVED);
  });

  it("expires when everyone abstains — no decisive vote was cast", () => {
    expect(
      decideOutcome({ ...base, tally: { yes: 0, no: 0, abstain: 6 }, threshold: VoteThreshold.SIMPLE_MAJORITY }),
    ).toBe(SessionOutcome.EXPIRED);
  });

  it("supermajority requires >= 2/3 of decisive votes", () => {
    expect(
      decideOutcome({ ...base, tally: { yes: 4, no: 2, abstain: 0 }, threshold: VoteThreshold.SUPERMAJORITY }),
    ).toBe(SessionOutcome.APPROVED);
    expect(
      decideOutcome({ ...base, tally: { yes: 3.9, no: 2.1, abstain: 0 }, threshold: VoteThreshold.SUPERMAJORITY }),
    ).toBe(SessionOutcome.REJECTED);
  });

  it("refuses to close early unless every eligible member has voted", () => {
    const closesAt = new Date("2026-08-14T00:00:00Z");
    const before = new Date("2026-08-10T00:00:00Z");
    // Window open, a voter missing: refuse with the reason.
    expect(closeRefusal({ now: before, closesAt, votesCast: 2, eligibleCount: 3 })).toMatch(
      /voting window is open/,
    );
    // Window open but everyone has spoken: nothing left to wait for.
    expect(closeRefusal({ now: before, closesAt, votesCast: 3, eligibleCount: 3 })).toBeNull();
    // Window elapsed: closable regardless of turnout.
    expect(
      closeRefusal({ now: new Date("2026-08-14T00:00:01Z"), closesAt, votesCast: 0, eligibleCount: 3 }),
    ).toBeNull();
  });

  it("expires on zero eligible weight — an empty electorate decides nothing", () => {
    expect(
      decideOutcome({
        tally: { yes: 1, no: 0, abstain: 0 },
        threshold: VoteThreshold.SIMPLE_MAJORITY,
        quorumPercent: 50,
        eligibleWeight: 0,
      }),
    ).toBe(SessionOutcome.EXPIRED);
  });
});

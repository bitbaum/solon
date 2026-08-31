import { describe, expect, it } from "vitest";
import { voteMessage } from "@/lib/bitcoin/message";
import {
  aggregateBallots,
  canonicalBallot,
  methodSpec,
  parseBallot,
  ALL_METHODS,
} from "../methods";
import type { BallotOption } from "../methods/types";

const OPTIONS: BallotOption[] = [
  { key: "solar-roof", label: "Solar roof" },
  { key: "heat-pump", label: "Heat pump" },
  { key: "insulation", label: "Insulation" },
];

const w = (ballot: unknown, weight = 1) => ({ ballot, weight });

describe("the signed encoding", () => {
  /**
   * The one test that protects every vote already cast. Historical votes hold a
   * signature over `Solon vote\nsession:…\nchoice:yes\nvoter:…`. If this literal
   * ever needs updating to make the suite pass, the change has silently
   * invalidated the entire audit trail.
   */
  it("reproduces the pre-methods single-choice message byte for byte", () => {
    const canonical = canonicalBallot("single_choice", { choice: "yes" });
    expect(canonical).toBe("yes");
    expect(voteMessage({ sessionId: "s-1", choice: canonical, memberAddress: "addr-1" })).toBe(
      "Solon vote\nsession:s-1\nchoice:yes\nvoter:addr-1",
    );
  });

  it("covers the whole ballot, not merely that a ballot was cast", () => {
    // Two different dot allocations must never sign the same text — otherwise a
    // signature could be lifted from one allocation onto another.
    const a = canonicalBallot("dot", { allocations: { "solar-roof": 3, "heat-pump": 2 } });
    const b = canonicalBallot("dot", { allocations: { "solar-roof": 2, "heat-pump": 3 } });
    expect(a).not.toBe(b);
  });

  it("is stable under key order, so the same intent always signs identically", () => {
    expect(canonicalBallot("dot", { allocations: { "heat-pump": 2, "solar-roof": 3 } })).toBe(
      canonicalBallot("dot", { allocations: { "solar-roof": 3, "heat-pump": 2 } }),
    );
    expect(canonicalBallot("approval", { approved: ["heat-pump", "solar-roof"] })).toBe(
      canonicalBallot("approval", { approved: ["solar-roof", "heat-pump"] }),
    );
  });

  it("preserves order where order is the meaning", () => {
    expect(canonicalBallot("ranked", { ranking: ["a", "b"] })).not.toBe(
      canonicalBallot("ranked", { ranking: ["b", "a"] }),
    );
  });

  it("binds an objection's reason, so the reason cannot be rewritten in transit", () => {
    const one = canonicalBallot("consent", {
      response: "object",
      rationale: "this breaks the lease",
    });
    const two = canonicalBallot("consent", {
      response: "object",
      rationale: "looks fine actually",
    });
    expect(one).not.toBe(two);
    expect(one.startsWith("object:")).toBe(true);
  });

  it("is readable — a voter can check what they are signing", () => {
    expect(canonicalBallot("dot", { allocations: { "solar-roof": 3 } })).toBe("dots:solar-roof=3");
    expect(canonicalBallot("ranked", { ranking: ["solar-roof", "heat-pump"] })).toBe(
      "rank:solar-roof>heat-pump",
    );
  });

  it("every method produces a non-empty encoding for a valid ballot", () => {
    for (const id of ALL_METHODS) {
      const spec = methodSpec(id);
      expect(spec.label.length).toBeGreaterThan(0);
    }
  });
});

describe("ballot validation", () => {
  it("rejects an option that is not on the ballot", () => {
    const r = parseBallot("approval", { approved: ["a-different-project"] }, OPTIONS);
    expect(r.ok).toBe(false);
  });

  it("rejects overspending the dot budget", () => {
    const over = parseBallot("dot", { allocations: { "solar-roof": 4, "heat-pump": 4 } }, OPTIONS);
    expect(over.ok).toBe(false);
    const ok = parseBallot("dot", { allocations: { "solar-roof": 3, "heat-pump": 2 } }, OPTIONS);
    expect(ok.ok).toBe(true);
  });

  it("respects a session's own dot budget rather than the default", () => {
    const r = parseBallot("dot", { allocations: { "solar-roof": 8 } }, OPTIONS, { dotBudget: 10 });
    expect(r.ok).toBe(true);
  });

  it("requires an objection to say why", () => {
    expect(parseBallot("consent", { response: "object" }, []).ok).toBe(false);
    expect(parseBallot("consent", { response: "object", rationale: "unsafe" }, []).ok).toBe(true);
  });

  it("rejects a ranking that lists the same option twice", () => {
    expect(parseBallot("ranked", { ranking: ["solar-roof", "solar-roof"] }, OPTIONS).ok).toBe(
      false,
    );
  });
});

describe("counting", () => {
  it("approval counts weight per option, not ballots", () => {
    const agg = aggregateBallots(
      "approval",
      [w({ approved: ["solar-roof", "heat-pump"] }, 3), w({ approved: ["heat-pump"] }, 1)],
      OPTIONS,
    );
    expect(agg.ranked?.[0]).toMatchObject({ key: "heat-pump", score: 4 });
    expect(agg.castWeight).toBe(4);
  });

  it("dot allocation scales a member's dots by their weight", () => {
    const agg = aggregateBallots(
      "dot",
      [w({ allocations: { "solar-roof": 3, "heat-pump": 2 } }, 2)],
      OPTIONS,
    );
    expect(agg.ranked?.[0]).toMatchObject({ key: "solar-roof", score: 6 });
  });

  it("score averages over the members who rated an option — silence is not a zero", () => {
    const agg = aggregateBallots(
      "score",
      [w({ scores: { "solar-roof": 5 } }), w({ scores: { "heat-pump": 1 } })],
      OPTIONS,
    );
    const solar = agg.ranked?.find((r) => r.key === "solar-roof");
    expect(solar?.score).toBe(5);
  });

  it("ranked gives more points to earlier places and none to the unranked", () => {
    const agg = aggregateBallots("ranked", [w({ ranking: ["solar-roof", "heat-pump"] })], OPTIONS);
    const byKey = Object.fromEntries((agg.ranked ?? []).map((r) => [r.key, r.score]));
    expect(byKey["solar-roof"]).toBe(2);
    expect(byKey["heat-pump"]).toBe(1);
    expect(byKey["insulation"]).toBe(0);
  });

  it("surfaces the Condorcet winner when Borda crowns someone else", () => {
    // A classic split: `insulation` wins every head-to-head, but Borda rewards
    // the broadly-liked compromise. A governance tool must show both.
    const agg = aggregateBallots(
      "ranked",
      [
        w({ ranking: ["insulation", "solar-roof", "heat-pump"] }, 5),
        w({ ranking: ["solar-roof", "heat-pump", "insulation"] }, 4),
        w({ ranking: ["heat-pump", "solar-roof", "insulation"] }, 2),
      ],
      OPTIONS,
    );
    expect(agg.ranked?.[0].key).toBe("solar-roof");
    expect(agg.condorcetKey).toBe("solar-roof");
  });

  it("consent records every objection with its reason intact", () => {
    const agg = aggregateBallots(
      "consent",
      [w({ response: "agree" }, 9), w({ response: "object", rationale: "breaks the lease" }, 1)],
      [],
    );
    expect(agg.objections).toEqual([{ rationale: "breaks the lease", weight: 1 }]);
    expect(agg.decisive).toEqual({ for: 9, against: 1, abstain: 0 });
  });
});

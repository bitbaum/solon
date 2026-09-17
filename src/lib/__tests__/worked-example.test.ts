import { describe, it, expect } from "vitest";
import { methodSpec, parseBallot } from "@/lib/domain/methods";
import type { MethodId } from "@/lib/domain/methods/types";
import {
  FUND_OPTIONS,
  CYCLE_OPTIONS,
  ballotsFor,
  consentBallots,
  singleChoiceBallots,
  cycleBallots,
  cyclePairs,
  firstPreferenceCounts,
  TOTAL_MEMBERS,
  AGREE_COUNT,
  OBJECTIONS,
} from "@/lib/governance/worked-example";

/**
 * The teaching pages state conclusions ("a majority passes this, consent does
 * not"). Those conclusions are not written into the pages as prose numbers —
 * they are computed by the same aggregate() a real session uses. This suite
 * pins them, so a change to Solon's counting fails HERE, loudly, instead of
 * quietly turning a published lesson into a false one.
 */

const RANKING_METHODS = ["approval", "dot", "score", "ranked"] as const;

describe("derived ballots are ballots Solon would accept", () => {
  for (const method of RANKING_METHODS) {
    it(`${method}: every derived ballot passes the method's own schema`, () => {
      const ballots = ballotsFor(method);
      expect(ballots).toHaveLength(TOTAL_MEMBERS);
      for (const { ballot } of ballots) {
        const parsed = parseBallot(method as MethodId, ballot, [...FUND_OPTIONS]);
        // A derivation that produced something the door rejects would be a page
        // demonstrating a vote that could never be cast.
        expect(parsed.ok, JSON.stringify(ballot)).toBe(true);
      }
    });
  }

  it("decision ballots pass their schemas too", () => {
    for (const { ballot } of singleChoiceBallots()) {
      expect(parseBallot("single_choice", ballot, []).ok).toBe(true);
    }
    for (const { ballot } of consentBallots()) {
      expect(parseBallot("consent", ballot, []).ok).toBe(true);
    }
    for (const { ballot } of cycleBallots()) {
      expect(parseBallot("ranked", ballot, [...CYCLE_OPTIONS]).ok).toBe(true);
    }
  });

  it("dot ballots spend the whole budget and nothing more", () => {
    for (const { ballot } of ballotsFor("dot")) {
      const spent = Object.values((ballot as { allocations: Record<string, number> }).allocations);
      expect(spent.reduce((s, n) => s + n, 0)).toBe(5);
    }
  });
});

describe("the shared fund: the method decides the outcome", () => {
  it("a pick-one ballot elects the roof on a minority of the room", () => {
    const first = firstPreferenceCounts();
    expect(first[0].key).toBe("roof");
    expect(first[0].count).toBe(3);
    // The entire lesson: 3 of 7 is not a majority.
    expect(first[0].count * 2).toBeLessThan(TOTAL_MEMBERS);
  });

  it("approval, dots, score and Borda all elect the tooling instead", () => {
    for (const method of RANKING_METHODS) {
      const spec = methodSpec(method as MethodId);
      const agg = spec.aggregate(ballotsFor(method), [...FUND_OPTIONS]);
      expect(agg.ranked?.[0]?.key, `${method} leader`).toBe("tooling");
      expect(agg.castWeight).toBe(TOTAL_MEMBERS);
    }
  });

  /**
   * The pages state how many DIFFERENT winners the five ways of counting
   * produce. An early draft said "four different winners"; the real answer is
   * two, and nothing caught it but re-reading the claim against the numbers.
   * Now something does.
   */
  it("produces exactly two distinct winners across the five ways of counting", () => {
    const winners = new Set<string>([firstPreferenceCounts()[0].key]);
    for (const method of RANKING_METHODS) {
      const agg = methodSpec(method as MethodId).aggregate(ballotsFor(method), [...FUND_OPTIONS]);
      winners.add(agg.ranked![0].key);
    }
    expect([...winners].sort()).toEqual(["roof", "tooling"]);
  });

  it("the Borda ordering is backed head-to-head, so nothing is being smuggled", () => {
    const agg = methodSpec("ranked").aggregate(ballotsFor("ranked"), [...FUND_OPTIONS]);
    expect(agg.condorcetKey).toBe("tooling");
    expect(agg.ranked?.[0]?.key).toBe(agg.condorcetKey);
  });
});

describe("the objection: same room, two readings", () => {
  it("counts as a clear majority under yes/no", () => {
    const agg = methodSpec("single_choice").aggregate(singleChoiceBallots(), []);
    expect(agg.decisive).toEqual({ for: AGREE_COUNT, against: 2, abstain: 0 });
    expect(agg.decisive!.for).toBeGreaterThan(agg.decisive!.against);
  });

  it("is stopped under consent, with both reasons intact", () => {
    const agg = methodSpec("consent").aggregate(consentBallots(), []);
    expect(agg.objections).toHaveLength(OBJECTIONS.length);
    for (const o of agg.objections!) {
      expect(o.rationale).toBeTruthy();
    }
  });
});

describe("the paradox: a majority for everything, in a circle", () => {
  it("has no Condorcet winner", () => {
    const agg = methodSpec("ranked").aggregate(cycleBallots(), [...CYCLE_OPTIONS]);
    expect(agg.condorcetKey).toBeNull();
  });

  it("is a genuine cycle: every option loses one race and wins another", () => {
    const pairs = cyclePairs();
    expect(pairs).toHaveLength(3);
    for (const p of pairs) expect(p.for).toBe(2);
    const winners = new Set(pairs.map((p) => p.winner));
    const losers = new Set(pairs.map((p) => p.loser));
    expect(winners.size).toBe(3);
    expect(losers.size).toBe(3);
  });

  it("still returns an order, which is exactly the thing to be careful about", () => {
    const agg = methodSpec("ranked").aggregate(cycleBallots(), [...CYCLE_OPTIONS]);
    expect(agg.ranked).toHaveLength(3);
    // All three tie on Borda points — the ordering is arbitrary among equals.
    expect(new Set(agg.ranked!.map((r) => r.score)).size).toBe(1);
  });
});

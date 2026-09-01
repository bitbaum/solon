import { describe, expect, it } from "vitest";
import { DecisionCategory, Electorate, VoteThreshold } from "@/lib/db/enums";
import { CATEGORY_ELECTORATE, CATEGORY_QUORUM_PERCENT, CATEGORY_THRESHOLD } from "../governance";
import { GOVERNANCE_PROFILES, electorateFor, profileFor, ruleFor } from "../governance-profiles";
import { ALL_METHODS } from "@/lib/domain/methods";

const ALL_PROFILES = Object.values(GOVERNANCE_PROFILES);
const ALL_CATEGORIES = Object.values(DecisionCategory);

/**
 * The red lines are the product's promise, not a default to tune. These tests
 * are the enforcement: a future profile that tries to loosen them fails here
 * rather than shipping and being noticed after a vote it should never have
 * allowed.
 */
describe("humans-only red lines", () => {
  const RED_LINES: DecisionCategory[] = [
    DecisionCategory.AID_DISBURSEMENT,
    DecisionCategory.MEMBERSHIP,
    DecisionCategory.SAFETY,
    DecisionCategory.GOVERNANCE_RULES,
  ];

  it("are humans-only no matter which profile an organization picks", () => {
    for (const category of RED_LINES) {
      expect(electorateFor(category)).toBe(Electorate.HUMANS_ONLY);
    }
  });

  it("cannot be widened by a profile, because profiles do not carry an electorate", () => {
    for (const profile of ALL_PROFILES) {
      for (const category of ALL_CATEGORIES) {
        const rule = profile.rules[category];
        // If a profile ever gains an `electorate` key this fails — which is the
        // point. Eligibility has exactly one source.
        expect(Object.keys(rule).sort()).toEqual(["method", "quorumPercent", "threshold"]);
      }
    }
  });

  it("keeps agents out of their own suffrage question", () => {
    expect(electorateFor(DecisionCategory.GOVERNANCE_RULES)).toBe(Electorate.HUMANS_ONLY);
  });
});

describe("every profile is complete and sane", () => {
  it("covers every decision category", () => {
    for (const profile of ALL_PROFILES) {
      for (const category of ALL_CATEGORIES) {
        expect(profile.rules[category], `${profile.id} is missing ${category}`).toBeDefined();
      }
    }
  });

  it("names only methods that exist", () => {
    for (const profile of ALL_PROFILES) {
      for (const category of ALL_CATEGORIES) {
        expect(ALL_METHODS).toContain(profile.rules[category].method);
      }
    }
  });

  it("sets a quorum that is a real percentage", () => {
    for (const profile of ALL_PROFILES) {
      for (const category of ALL_CATEGORIES) {
        const q = profile.rules[category].quorumPercent;
        expect(q).toBeGreaterThan(0);
        expect(q).toBeLessThanOrEqual(100);
      }
    }
  });

  it("never decides a red-line category more cheaply than a simple majority", () => {
    for (const profile of ALL_PROFILES) {
      for (const category of [DecisionCategory.MEMBERSHIP, DecisionCategory.SAFETY]) {
        const rule = profile.rules[category];
        // Consent is stricter than a majority (one objection stops it), so it
        // qualifies; a bare plurality method would not.
        const strict = rule.threshold === VoteThreshold.SUPERMAJORITY || rule.method === "consent";
        expect(strict, `${profile.id}/${category} decides a red line too cheaply`).toBe(true);
      }
    }
  });
});

describe("the default profile preserves pre-existing behaviour", () => {
  /**
   * Organizations that existed before profiles keep deciding exactly as they
   * did. TOWN must therefore reproduce the original governance config value for
   * value — if it drifts, a live organization's constitution changed under it.
   */
  it("reproduces the original threshold and quorum for every category", () => {
    for (const category of ALL_CATEGORIES) {
      const rule = ruleFor("TOWN", category);
      expect(rule.threshold).toBe(CATEGORY_THRESHOLD[category]);
      expect(rule.quorumPercent).toBe(CATEGORY_QUORUM_PERCENT[category]);
      expect(rule.method).toBe("single_choice");
    }
  });

  it("is what an unknown or missing profile falls back to", () => {
    expect(profileFor(null).id).toBe("TOWN");
    expect(profileFor("NOT_A_REAL_PROFILE").id).toBe("TOWN");
  });

  it("still sources electorate from the one config that owns it", () => {
    for (const category of ALL_CATEGORIES) {
      expect(electorateFor(category)).toBe(CATEGORY_ELECTORATE[category]);
    }
  });
});

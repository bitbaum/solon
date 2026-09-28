import { describe, expect, it } from "vitest";
import { DecisionBody, DecisionCategory, Electorate, VoteThreshold } from "@/lib/db/enums";
import { CATEGORY_ELECTORATE, CATEGORY_QUORUM_PERCENT, CATEGORY_THRESHOLD } from "../governance";
import {
  GOVERNANCE_PROFILE_IDS,
  GOVERNANCE_PROFILES,
  electorateFor,
  isGovernanceProfileId,
  profileFor,
  ruleFor,
  usesMandates,
} from "../governance-profiles";
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
        // point. Eligibility has exactly one source. `decidedBy` only narrows
        // inside that electorate (mandate holders are still filtered by it).
        expect(Object.keys(rule).sort()).toEqual([
          "decidedBy",
          "method",
          "quorumPercent",
          "threshold",
        ]);
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
      expect(rule.decidedBy).toBe(DecisionBody.MEMBERS);
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

describe("who decides", () => {
  it("lists every profile exactly once, in the order pages render them", () => {
    expect([...GOVERNANCE_PROFILE_IDS].sort()).toEqual(Object.keys(GOVERNANCE_PROFILES).sort());
    for (const id of GOVERNANCE_PROFILE_IDS) {
      expect(GOVERNANCE_PROFILES[id].id).toBe(id);
      expect(isGovernanceProfileId(id)).toBe(true);
    }
    expect(isGovernanceProfileId("MONARCHY")).toBe(false);
    expect(isGovernanceProfileId(undefined)).toBe(false);
  });

  it("gives every category to the mandate under one person decides", () => {
    for (const category of ALL_CATEGORIES) {
      expect(ruleFor("SOLE", category).decidedBy).toBe(DecisionBody.MANDATE);
    }
  });

  it("keeps the roster, safety and the rules with the members under elected delegates", () => {
    // Those three are how members elect, recall, and change the structure. A
    // delegate profile that gave them to the delegates would let a delegate
    // extend their own term.
    for (const category of [
      DecisionCategory.MEMBERSHIP,
      DecisionCategory.SAFETY,
      DecisionCategory.GOVERNANCE_RULES,
    ]) {
      expect(ruleFor("DELEGATED", category).decidedBy).toBe(DecisionBody.MEMBERS);
    }
    expect(profileFor("DELEGATED").mandateTermDays).toBeGreaterThan(0);
  });

  it("gives mandates a term only where members elect them", () => {
    for (const profile of ALL_PROFILES) {
      if (!usesMandates(profile)) expect(profile.mandateTermDays).toBeNull();
    }
    expect(profileFor("SOLE").mandateTermDays).toBeNull();
  });

  it("describes who decides for every profile, and names no regime", () => {
    for (const profile of ALL_PROFILES) {
      expect(profile.whoDecides.length).toBeGreaterThan(10);
      const words = `${profile.label} ${profile.suitedTo} ${profile.whoDecides}`.toLowerCase();
      for (const loaded of ["monarch", "dictator", "autocra", "tyran", "king"]) {
        expect(words, `${profile.id} uses "${loaded}"`).not.toContain(loaded);
      }
    }
  });
});

import { describe, expect, it } from "vitest";
import { DecisionCategory, Electorate } from "@/lib/db/enums";
import { organizations } from "@/lib/db/schema";
import { DEFAULT_CATEGORY_ELECTORATE } from "../governance-profiles";
import {
  CATEGORY_QUORUM_PERCENT,
  DEFAULT_HUMANS_ONLY_CATEGORIES,
  CATEGORY_THRESHOLD,
  SUPERMAJORITY_FRACTION,
  VOTING_WINDOW_DAYS,
} from "../governance";

const ALL_CATEGORIES = Object.values(DecisionCategory);

describe("governance config completeness", () => {
  it("covers every DecisionCategory in every table — a new enum value must be classified", () => {
    for (const c of ALL_CATEGORIES) {
      expect(DEFAULT_CATEGORY_ELECTORATE[c], `electorate for ${c}`).toBeDefined();
      expect(CATEGORY_THRESHOLD[c], `threshold for ${c}`).toBeDefined();
      expect(CATEGORY_QUORUM_PERCENT[c], `quorum for ${c}`).toBeGreaterThan(0);
      expect(CATEGORY_QUORUM_PERCENT[c], `quorum for ${c}`).toBeLessThanOrEqual(100);
    }
  });

  it("starts every organization with today's four humans-only categories, exactly", () => {
    // The owner made the list each organization's own (2026-11-01). The
    // default is what every organization starts with, so it must stay the four
    // categories that were hard-coded platform-wide until then: aid,
    // membership, safety, and the governance rules themselves.
    expect([...DEFAULT_HUMANS_ONLY_CATEGORIES].sort()).toEqual(
      [
        DecisionCategory.AID_DISBURSEMENT,
        DecisionCategory.MEMBERSHIP,
        DecisionCategory.SAFETY,
        DecisionCategory.GOVERNANCE_RULES,
      ].sort(),
    );
    expect(DEFAULT_CATEGORY_ELECTORATE).toEqual({
      ALLOCATION_POLICY: Electorate.ALL_MEMBERS,
      TREASURY_SPEND: Electorate.ALL_MEMBERS,
      OPERATIONS: Electorate.ALL_MEMBERS,
      AID_DISBURSEMENT: Electorate.HUMANS_ONLY,
      MEMBERSHIP: Electorate.HUMANS_ONLY,
      SAFETY: Electorate.HUMANS_ONLY,
      GOVERNANCE_RULES: Electorate.HUMANS_ONLY,
    });
  });

  it("is the column default, so an organization that never voted on it decides as before", () => {
    expect(organizations.humansOnlyCategories.default).toEqual([...DEFAULT_HUMANS_ONLY_CATEGORIES]);
    expect(organizations.humansOnlyCategories.notNull).toBe(true);
  });

  it("gives agents real suffrage somewhere by default — ALL_MEMBERS must not be empty", () => {
    expect(
      ALL_CATEGORIES.some((c) => DEFAULT_CATEGORY_ELECTORATE[c] === Electorate.ALL_MEMBERS),
    ).toBe(true);
  });

  it("has sane global constants", () => {
    expect(VOTING_WINDOW_DAYS).toBeGreaterThan(0);
    expect(SUPERMAJORITY_FRACTION).toBeGreaterThan(0.5);
    expect(SUPERMAJORITY_FRACTION).toBeLessThanOrEqual(1);
  });
});

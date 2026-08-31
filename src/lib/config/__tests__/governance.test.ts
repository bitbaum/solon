import { describe, expect, it } from "vitest";
import { DecisionCategory, Electorate } from "@prisma/client";
import {
  CATEGORY_ELECTORATE,
  CATEGORY_QUORUM_PERCENT,
  CATEGORY_THRESHOLD,
  SUPERMAJORITY_FRACTION,
  VOTING_WINDOW_DAYS,
} from "../governance";

const ALL_CATEGORIES = Object.values(DecisionCategory);

describe("governance config completeness", () => {
  it("covers every DecisionCategory in every table — a new enum value must be classified", () => {
    for (const c of ALL_CATEGORIES) {
      expect(CATEGORY_ELECTORATE[c], `electorate for ${c}`).toBeDefined();
      expect(CATEGORY_THRESHOLD[c], `threshold for ${c}`).toBeDefined();
      expect(CATEGORY_QUORUM_PERCENT[c], `quorum for ${c}`).toBeGreaterThan(0);
      expect(CATEGORY_QUORUM_PERCENT[c], `quorum for ${c}`).toBeLessThanOrEqual(100);
    }
  });

  it("keeps the red lines human-only: aid, membership, safety, and governance rules themselves", () => {
    // Agents must never be able to vote money to people, change who belongs,
    // weaken safety, or expand their own suffrage. (oc-solon-spec red lines.)
    expect(CATEGORY_ELECTORATE[DecisionCategory.AID_DISBURSEMENT]).toBe(Electorate.HUMANS_ONLY);
    expect(CATEGORY_ELECTORATE[DecisionCategory.MEMBERSHIP]).toBe(Electorate.HUMANS_ONLY);
    expect(CATEGORY_ELECTORATE[DecisionCategory.SAFETY]).toBe(Electorate.HUMANS_ONLY);
    expect(CATEGORY_ELECTORATE[DecisionCategory.GOVERNANCE_RULES]).toBe(Electorate.HUMANS_ONLY);
  });

  it("gives agents real suffrage somewhere — ALL_MEMBERS must not be empty", () => {
    expect(ALL_CATEGORIES.some((c) => CATEGORY_ELECTORATE[c] === Electorate.ALL_MEMBERS)).toBe(
      true,
    );
  });

  it("has sane global constants", () => {
    expect(VOTING_WINDOW_DAYS).toBeGreaterThan(0);
    expect(SUPERMAJORITY_FRACTION).toBeGreaterThan(0.5);
    expect(SUPERMAJORITY_FRACTION).toBeLessThanOrEqual(1);
  });
});

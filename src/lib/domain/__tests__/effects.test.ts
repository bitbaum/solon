import { describe, expect, it } from "vitest";
import { DecisionCategory } from "@/lib/db/enums";
import { EFFECT_CATEGORY, effectPairingProblem, parseEffect } from "../effects";

describe("parseEffect", () => {
  it("treats absence as no effect", () => {
    expect(parseEffect(undefined)).toEqual({ ok: true, effect: null });
    expect(parseEffect(null)).toEqual({ ok: true, effect: null });
  });

  it("accepts a mandate grant with or without a term", () => {
    expect(parseEffect({ kind: "mandate", memberId: "m1", grant: true }).ok).toBe(true);
    expect(
      parseEffect({ kind: "mandate", memberId: "m1", grant: true, until: "2027-09-28T00:00:00Z" })
        .ok,
    ).toBe(true);
  });

  it("accepts a switch only to a profile Solon offers", () => {
    expect(parseEffect({ kind: "profile", profile: "DELEGATED" }).ok).toBe(true);
    expect(parseEffect({ kind: "profile", profile: "MONARCHY" }).ok).toBe(false);
  });

  it("refuses shapes it does not know", () => {
    expect(parseEffect({ kind: "spend", amount: 1 }).ok).toBe(false);
    expect(parseEffect({ kind: "mandate", memberId: "m1" }).ok).toBe(false);
  });
});

describe("effectPairingProblem", () => {
  it("ties a mandate change to MEMBERSHIP and a profile switch to GOVERNANCE_RULES", () => {
    expect(EFFECT_CATEGORY.mandate).toBe(DecisionCategory.MEMBERSHIP);
    expect(EFFECT_CATEGORY.profile).toBe(DecisionCategory.GOVERNANCE_RULES);
  });

  it("refuses an effect smuggled into a cheaper category", () => {
    // OPERATIONS is open to agents and has the lowest bar; letting a profile
    // switch ride on it would let agents restructure who decides.
    const problem = effectPairingProblem(
      { kind: "profile", profile: "SOLE" },
      DecisionCategory.OPERATIONS,
    );
    expect(problem).toMatch(/GOVERNANCE_RULES/);
    expect(
      effectPairingProblem(
        { kind: "mandate", memberId: "m1", grant: true },
        DecisionCategory.MEMBERSHIP,
      ),
    ).toBeNull();
  });
});

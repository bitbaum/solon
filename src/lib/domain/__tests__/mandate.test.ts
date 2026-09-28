import { describe, expect, it } from "vitest";
import { DecisionBody } from "@/lib/db/enums";
import { isMandateLive, mandateEnd, resolveDecisionBody } from "../mandate";

const NOW = new Date("2026-09-28T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

describe("isMandateLive", () => {
  it("is live while held and without a term", () => {
    expect(isMandateLive({ holdsMandate: true, mandateUntil: null }, NOW)).toBe(true);
  });

  it("is live until its term runs out, and not a moment after", () => {
    const until = new Date(NOW.getTime() + DAY);
    expect(isMandateLive({ holdsMandate: true, mandateUntil: until }, NOW)).toBe(true);
    expect(isMandateLive({ holdsMandate: true, mandateUntil: until }, until)).toBe(false);
  });

  it("is never live when not held, whatever the date says", () => {
    const until = new Date(NOW.getTime() + DAY);
    expect(isMandateLive({ holdsMandate: false, mandateUntil: until }, NOW)).toBe(false);
  });
});

describe("resolveDecisionBody", () => {
  it("gives a mandate category to the holders when there are any", () => {
    expect(resolveDecisionBody(DecisionBody.MANDATE, 2)).toEqual({
      decidedBy: DecisionBody.MANDATE,
      fellBack: false,
    });
  });

  it("gives it back to the members when nobody holds a live mandate", () => {
    // Refusing to open instead would freeze the organization — including the
    // vote that elects someone new.
    expect(resolveDecisionBody(DecisionBody.MANDATE, 0)).toEqual({
      decidedBy: DecisionBody.MEMBERS,
      fellBack: true,
    });
  });

  it("leaves a members category alone", () => {
    expect(resolveDecisionBody(DecisionBody.MEMBERS, 0).decidedBy).toBe(DecisionBody.MEMBERS);
    expect(resolveDecisionBody(DecisionBody.MEMBERS, 3).fellBack).toBe(false);
  });
});

describe("mandateEnd", () => {
  it("prefers an explicit end", () => {
    const explicit = new Date("2027-01-01T00:00:00Z");
    expect(mandateEnd(explicit, 365, NOW)).toEqual(explicit);
  });

  it("falls back to the profile's term", () => {
    expect(mandateEnd(null, 30, NOW)).toEqual(new Date(NOW.getTime() + 30 * DAY));
  });

  it("has no end when the profile sets no term", () => {
    expect(mandateEnd(undefined, null, NOW)).toBeNull();
  });
});

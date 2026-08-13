import { describe, expect, it } from "vitest";
import { isRecognizableProfile } from "../recognition";

// The sign-in gate: OrangeCat anonymous accounts (no email) must never
// become a recognized governance identity. Pinned here so a future
// "just let everyone in" refactor is a red build, not a silent policy change.
describe("isRecognizableProfile", () => {
  it("accepts a profile with actor id and email", () => {
    expect(
      isRecognizableProfile({ sub: "5f2716c8-1111-2222-3333-444455556666", email: "g@example.com" }),
    ).toBe(true);
  });

  it("rejects an anonymous OrangeCat account (no email)", () => {
    expect(isRecognizableProfile({ sub: "5f2716c8-1111-2222-3333-444455556666" })).toBe(false);
    expect(
      isRecognizableProfile({ sub: "5f2716c8-1111-2222-3333-444455556666", email: null }),
    ).toBe(false);
    expect(
      isRecognizableProfile({ sub: "5f2716c8-1111-2222-3333-444455556666", email: "" }),
    ).toBe(false);
  });

  it("rejects a profile without an actor id", () => {
    expect(isRecognizableProfile({ email: "g@example.com" })).toBe(false);
    expect(isRecognizableProfile({ sub: "", email: "g@example.com" })).toBe(false);
  });

  it("rejects a missing profile", () => {
    expect(isRecognizableProfile(undefined)).toBe(false);
    expect(isRecognizableProfile(null)).toBe(false);
  });
});

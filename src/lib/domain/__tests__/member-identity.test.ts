import { describe, expect, it } from "vitest";
import { faceChanged, faceFromClaims, orangecatProfileUrl } from "../member-identity";

// A seat points at a person on OrangeCat. These pin the reading of the id
// token and the one rule that matters: the roster name is never rewritten
// by a rename on OrangeCat (only the handle and the picture are).
describe("member identity", () => {
  it("builds the public profile URL only for a plausible handle", () => {
    expect(orangecatProfileUrl("cato", "https://orangecat.ch")).toBe(
      "https://orangecat.ch/profiles/cato",
    );
    expect(orangecatProfileUrl("cato", "https://orangecat.ch/")).toBe(
      "https://orangecat.ch/profiles/cato",
    );
    expect(orangecatProfileUrl(null)).toBeNull();
    expect(orangecatProfileUrl("")).toBeNull();
    expect(orangecatProfileUrl("../settings")).toBeNull();
    expect(orangecatProfileUrl("a b")).toBeNull();
  });

  it("reads handle and picture from the claims, refusing a non-https picture", () => {
    expect(faceFromClaims({ preferred_username: " cato ", picture: "https://x/a.jpg" })).toEqual({
      username: "cato",
      avatarUrl: "https://x/a.jpg",
    });
    expect(faceFromClaims({ preferred_username: null, picture: "javascript:alert(1)" })).toEqual({
      username: null,
      avatarUrl: null,
    });
    expect(faceFromClaims({})).toEqual({ username: null, avatarUrl: null });
  });

  it("changes only when the handle or the picture did", () => {
    const stored = { ocUsername: "cato", avatarUrl: "https://x/a.jpg" };
    expect(faceChanged(stored, { username: "cato", avatarUrl: "https://x/a.jpg" })).toBe(false);
    expect(faceChanged(stored, { username: "cato2", avatarUrl: "https://x/a.jpg" })).toBe(true);
    expect(faceChanged(stored, { username: "cato", avatarUrl: null })).toBe(true);
    expect(
      faceChanged({ ocUsername: null, avatarUrl: null }, { username: null, avatarUrl: null }),
    ).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { canonicalJson, contentHashOf } from "../canonical";

describe("canonical JSON (cross-system contract)", () => {
  it("sorts keys recursively, keeps array order, drops undefined", () => {
    expect(canonicalJson({ b: 1, a: { d: [3, 2], c: null }, e: "x", skip: undefined })).toBe(
      '{"a":{"c":null,"d":[3,2]},"b":1,"e":"x"}',
    );
  });

  it("is insensitive to key insertion order", () => {
    expect(contentHashOf({ x: 1, y: 2 })).toBe(contentHashOf({ y: 2, x: 1 }));
  });

  // Golden hashes. OrangeCat re-hashes proposed policy content with its own
  // implementation of these rules; if either of these values changes, the
  // cross-repo contentHash contract is broken and decision verification on
  // the OC side will refuse every new policy version.
  it("matches the golden hashes", () => {
    expect(contentHashOf({ b: 1, a: { d: [3, 2], c: null }, e: "x" })).toBe(
      "27411d33a050271292b9ea2eeb27d7271258c3fa82265c9fcf4ee0b0a58ca3d9",
    );
    expect(contentHashOf({ max_cat_daily_spend_btc: 0.002, max_cat_btc_per_action: 0.0005 })).toBe(
      "7db0d28f49cd8821e7bfd739af9af851ed944b9c4189d6e214760a7272a272f9",
    );
  });
});

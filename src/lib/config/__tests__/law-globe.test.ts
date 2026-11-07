import { describe, expect, it } from "vitest";
import { LAW_AUTHORITIES } from "@/lib/config/law";
import { GLOBE_FEATURES } from "@/lib/config/law/globe";

describe("the law globe", () => {
  it("draws every country and every US state Solon holds law for", () => {
    const onGlobe = LAW_AUTHORITIES.filter(
      (a) => a.place?.scheme === "iso_3166_1" || a.place?.value.startsWith("US-"),
    ).map((a) => a.key);
    expect(onGlobe.filter((key) => !GLOBE_FEATURES[key])).toEqual([]);
  });

  it("names only authorities that exist", () => {
    const keys = new Set(LAW_AUTHORITIES.map((a) => a.key));
    expect(Object.keys(GLOBE_FEATURES).filter((key) => !keys.has(key))).toEqual([]);
  });
});

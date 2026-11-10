import { describe, expect, it } from "vitest";
import { placesConfig } from "@/lib/config/places";
import { slugSegment } from "@/lib/places/slug";
import { WORLD, regionFeature, regionName, worldRegionByCode } from "../world";
import { COUNTRIES } from "../world/countries";

describe("the world's places", () => {
  it("gives every country and territory one page, at a slug no other has", () => {
    const slugs = WORLD.map((r) => r.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs.every((s) => /^[a-z0-9-]+$/.test(s))).toBe(true);
    expect(slugs).not.toContain("world");
    expect(slugs).not.toContain("tax");
    expect(slugs).not.toContain("coverage");
  });

  it("names every region, and every claimant is a region of its own", () => {
    for (const region of WORLD) {
      expect(regionName(region, "en"), region.slug).not.toBe("");
      if (region.claimedBy) expect(worldRegionByCode(region.claimedBy), region.slug).toBeDefined();
    }
  });

  it("has a region for every country pack", () => {
    for (const pack of placesConfig.packs) {
      if (pack.region) expect(worldRegionByCode(pack.region), pack.key).toBeDefined();
    }
  });

  it("is one list with the country registry: every country there has a page here", () => {
    const english = new Intl.DisplayNames(["en"], { type: "region" });
    for (const c of COUNTRIES) {
      const region = worldRegionByCode(c.a2);
      expect(region, c.a2).toBeDefined();
      // The world pack names its places' paths the same way, so /places/<slug>
      // and /places/world/<slug> are the same country.
      expect(slugSegment(english.of(c.a2)!, true), c.a2).toBe(region!.slug);
      if (c.n3) expect(regionFeature(region!), c.a2).toBe(`countries:${c.n3}`);
    }
  });
});

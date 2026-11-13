import { describe, expect, it } from "vitest";
import { COUNTRY_PACKS } from "@/lib/config/places/countries";
import { WORLD } from "@/lib/config/world";
import { hyphenated, redirectWorldSlug, worldSlugRedirects } from "../world-slug-redirects";

const redirects = worldSlugRedirects(COUNTRY_PACKS, WORLD);
const go = (path: string) => redirectWorldSlug(path, redirects);

describe("a world slug of a country with a pack answers with the pack's canonical path", () => {
  it("the United States, South Ossetia and Liechtenstein have nothing to redirect: their world slug is their canonical root", () => {
    for (const path of [
      "/places/united-states",
      "/places/united-states/wyoming",
      "/places/south-ossetia",
      "/places/liechtenstein",
      "/places/liechtenstein/oberland/vaduz",
    ]) {
      expect(go(path), path).toBeNull();
    }
  });

  it("the underscored pack key is left to place_paths, which answers 308 to the hyphenated one", () => {
    expect(go("/places/united_states/wyoming")).toBeNull();
    expect(go("/places/south_ossetia")).toBeNull();
  });

  it("leaves everything else alone", () => {
    for (const path of [
      "/places/switzerland/zug",
      "/places/tax",
      "/places",
      "/places/",
      "/law/place/czechia",
      "/xx/places/czechia",
      "/places/%E0%A4%A",
    ]) {
      expect(go(path), path).toBeNull();
    }
  });

  it("only sends a world slug to a pack's hyphenated root, and never loops", () => {
    const roots = new Set(COUNTRY_PACKS.map((p) => hyphenated(p.key)));
    for (const r of redirects) {
      expect(roots.has(r.to), `${r.from} -> ${r.to}`).toBe(true);
      expect(roots.has(r.from), `${r.from} is itself a root`).toBe(false);
    }
  });

  it("is made of the packs and the world list, not typed: made-up ones behave the same, keeping the language prefix", () => {
    const made = worldSlugRedirects(
      [{ key: "north_land", region: "NL" }, { key: "isle" }],
      [{ code: "NL", slug: "northland" }, { slug: "isle" }],
    );
    expect(made).toEqual([{ from: "northland", to: "north-land" }]);
    expect(redirectWorldSlug("/de/places/northland/shire", made)).toBe(
      "/de/places/north-land/shire",
    );
    expect(redirectWorldSlug("/places/north-land", made)).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { COUNTRY_PACKS } from "@/lib/config/places/countries";
import { WORLD } from "@/lib/config/world";
import { redirectWorldSlug, worldSlugRedirects } from "../world-slug-redirects";

const redirects = worldSlugRedirects(COUNTRY_PACKS, WORLD);
const go = (path: string) => redirectWorldSlug(path, redirects);

describe("a world slug of a country with a pack answers with the pack's path", () => {
  it("the United States, at every depth", () => {
    expect(go("/places/united-states")).toBe("/places/united_states");
    expect(go("/places/united-states/wyoming")).toBe("/places/united_states/wyoming");
    expect(go("/places/united-states/wyoming/albany-county")).toBe(
      "/places/united_states/wyoming/albany-county",
    );
  });

  it("South Ossetia, which has no ISO code and is matched by its slug", () => {
    expect(go("/places/south-ossetia")).toBe("/places/south_ossetia");
    expect(go("/places/south-ossetia/anything")).toBe("/places/south_ossetia/anything");
  });

  it("Liechtenstein, whose world slug is already its pack's key, has nothing to redirect", () => {
    expect(go("/places/liechtenstein")).toBeNull();
    expect(go("/places/liechtenstein/oberland/vaduz")).toBeNull();
  });

  it("keeps the language prefix", () => {
    expect(go("/de/places/united-states/wyoming")).toBe("/de/places/united_states/wyoming");
    expect(go("/ru/places/south-ossetia")).toBe("/ru/places/south_ossetia");
  });

  it("leaves everything else alone", () => {
    for (const path of [
      "/places/united_states",
      "/places/united_states/wyoming",
      "/places/switzerland/zug",
      "/places/tax",
      "/places",
      "/places/",
      "/law/place/united-states",
      "/xx/places/united-states",
      "/places/%E0%A4%A",
    ]) {
      expect(go(path), path).toBeNull();
    }
  });

  it("only sends a world slug to a pack's own root, and never loops", () => {
    const keys = new Set(COUNTRY_PACKS.map((p) => p.key));
    expect(redirects.length).toBeGreaterThan(0);
    for (const r of redirects) {
      expect(keys.has(r.to), `${r.from} -> ${r.to}`).toBe(true);
      expect(keys.has(r.from), `${r.from} is itself a pack`).toBe(false);
    }
  });

  it("is made of the packs and the world list, not typed: made-up ones behave the same", () => {
    const made = worldSlugRedirects(
      [{ key: "north_land", region: "NL" }, { key: "isle" }],
      [{ code: "NL", slug: "northland" }, { slug: "isle" }],
    );
    expect(made).toEqual([
      { from: "north-land", to: "north_land" },
      { from: "northland", to: "north_land" },
    ]);
  });
});

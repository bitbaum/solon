import { describe, expect, it } from "vitest";
import { placesConfig } from "@/lib/config/places";
import { WORLD_PACK } from "@/lib/config/places/countries/world";
import { countryOfPlace } from "../place-country";

const root = { name: "World" };
const place = (slugPath: string, refs: string[], partOf: unknown[], packKey = WORLD_PACK) => ({
  slugPath,
  refs,
  partOf,
  packKey,
});
const pack = (key: string) => placesConfig.packs.find((p) => p.key === key);

describe("the country a place's page stands for", () => {
  it("is a nation's own, by its ISO 3166-1 code", () => {
    const djibouti = place("world/djibouti", ["iso_3166_1:DJ", "wikidata:Q977"], [root]);
    expect(countryOfPlace(djibouti, pack(WORLD_PACK))?.code).toBe("DJ");
  });

  it("is none for a region that shares its country's slug", () => {
    const region = place("world/djibouti/djibouti", ["iso_3166_2:DJ-DJ"], [{}, root]);
    expect(countryOfPlace(region, pack(WORLD_PACK))).toBeUndefined();
    const city = place("world/san-marino/san-marino", ["iso_3166_2:SM-07"], [{}, root]);
    expect(countryOfPlace(city, pack(WORLD_PACK))).toBeUndefined();
  });

  it("is none for a state that shares a country's name", () => {
    const georgia = place("united-states/georgia", ["iso_3166_2:US-GA"], [{}], "united_states");
    expect(countryOfPlace(georgia, pack("united_states"))).toBeUndefined();
  });

  it("is a pack's country at the pack's root", () => {
    const switzerland = place("switzerland", [], [], "switzerland");
    expect(countryOfPlace(switzerland, pack("switzerland"))?.code).toBe("CH");
  });
});

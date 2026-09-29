import { describe, expect, it } from "vitest";
import { placesConfig } from "@/lib/config/places";
import type { PlacesConfig } from "@/lib/config/places/schema";
import type { ChainPlace } from "../chain";
import { displayName, localized, placeView } from "../place-view";
import { withTestland } from "./fixtures/testland/config";

const testland = withTestland(placesConfig);

const place = (
  id: string,
  levelKey: string,
  depth: number | null,
  name: string,
  slugPath: string,
): ChainPlace => ({
  id,
  countryPack: "testland",
  levelKey,
  slugPath,
  depth,
  names: [{ locale: "en", script: null, name, nameType: "self" }],
});

const CHAIN = [
  place("oak", "hamlet", 0, "Oak Hollow", "testland/northshire/millbrook/oak-hollow"),
  place("mill", "parish", 1, "Millbrook", "testland/northshire/millbrook"),
  place("north", "shire", 2, "Northshire", "testland/northshire"),
  place("realm", "realm", 3, "Testland", "testland"),
  place("guild", "guild", null, "Weavers' Guild", "testland/weavers-guild"),
];

const view = (config: PlacesConfig, locale = "en") =>
  placeView({ config, chain: CHAIN, facts: [], identifiers: [], sources: [], locale })!;

describe("displayName", () => {
  const names = [
    { locale: "en", script: null, name: "Northshire", nameType: "self" as const },
    { locale: "de", script: null, name: "Nordgrafschaft", nameType: "self" as const },
    { locale: "fr", script: null, name: "Nordie", nameType: "historical" as const },
  ];
  it("prefers the reader's language, then the pack's, and a place's own name over others", () => {
    expect(displayName(names, "de", ["en"])).toBe("Nordgrafschaft");
    expect(displayName(names, "fr", ["en"])).toBe("Northshire");
    expect(displayName(names, "ru", ["de"])).toBe("Nordgrafschaft");
  });
});

describe("localized", () => {
  it("falls back to English, then to whatever there is", () => {
    expect(localized({ en: "Shire", de: "Grafschaft" }, "de")).toBe("Grafschaft");
    expect(localized({ en: "Shire", de: "Grafschaft" }, "it")).toBe("Shire");
    expect(localized({ de: "Grafschaft" }, "it")).toBe("Grafschaft");
  });
});

describe("placeView", () => {
  it("orders the chain from the root down, apart from overlapping places", () => {
    const v = view(testland);
    expect(v.partOf.map((p) => p.name)).toEqual(["Testland", "Northshire", "Millbrook"]);
    expect(v.alsoServedBy).toEqual([
      { name: "Weavers' Guild", levelName: "Guild", slugPath: "testland/weavers-guild" },
    ]);
    expect(v.levelName).toBe("Hamlet");
    expect(view(testland, "de").levelName).toBe("Weiler");
  });

  it("says a pack has no tax model rather than guessing", () => {
    const pack = testland.packs.find((p) => p.key === "testland")!;
    const untaxed = { ...testland, packs: [{ ...pack, taxModel: undefined }] };
    expect(view(testland).takesTax).toBe(false);
    expect(view(untaxed).takesTax).toBeNull();
  });

  it("has nothing to show for a pack the config lacks", () => {
    expect(
      placeView({
        config: placesConfig,
        chain: CHAIN,
        facts: [],
        identifiers: [],
        sources: [],
        locale: "en",
      }),
    ).toBeNull();
  });
});

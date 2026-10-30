import { describe, expect, it } from "vitest";
import { placesConfig } from "@/lib/config/places";
import type { PlacesConfig } from "@/lib/config/places/schema";
import type { ChainInstrument, ChainPlace } from "../chain";
import { displayName, localized, placeActions, placeView } from "../place-view";
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
  placeView({
    config,
    chain: CHAIN,
    facts: [],
    identifiers: [],
    instruments: [],
    sources: [],
    locale,
  })!;

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
        instruments: [],
        sources: [],
        locale: "en",
      }),
    ).toBeNull();
  });
});

describe("placeActions", () => {
  const offered = (
    jurisdictionId: string,
    kind: string,
    officialUrl: string,
    requirements: ChainInstrument["requirements"] = {},
  ): ChainInstrument => ({ jurisdictionId, kind, officialUrl, requirements, sourceId: "s" });

  it("takes each kind from the place nearest the reader's, in the registry's order", () => {
    const actions = placeActions(
      testland,
      CHAIN,
      [
        offered("realm", "testland_toll", "https://realm.invalid/toll"),
        offered("north", "testland_moot", "https://north.invalid/moot", {
          deadline: "03-31",
          deadlineSource: "https://north.invalid/dates",
        }),
        offered("realm", "testland_moot", "https://realm.invalid/moot"),
      ],
      "de",
    );
    expect(actions).toEqual([
      {
        kind: "testland_moot",
        label: "Am Thing sprechen",
        url: "https://north.invalid/moot",
        offeredBy: { name: "Northshire", levelName: "Grafschaft", slugPath: "testland/northshire" },
        deadline: { monthDay: "03-31", source: "https://north.invalid/dates" },
      },
      {
        kind: "testland_toll",
        label: "Pay the toll",
        url: "https://realm.invalid/toll",
        offeredBy: { name: "Testland", levelName: "Reich", slugPath: "testland" },
        deadline: null,
      },
    ]);
  });

  it("prefers the chain to a place beside it, and offers nothing it does not hold", () => {
    const actions = placeActions(
      testland,
      CHAIN,
      [
        offered("guild", "testland_moot", "https://guild.invalid/moot"),
        offered("mill", "testland_moot", "https://mill.invalid/moot"),
      ],
      "en",
    );
    expect(actions.map((a) => [a.kind, a.url])).toEqual([
      ["testland_moot", "https://mill.invalid/moot"],
    ]);
    expect(placeActions(testland, CHAIN, [], "en")).toEqual([]);
  });
});

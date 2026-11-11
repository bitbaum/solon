import { describe, expect, it } from "vitest";
import { placesConfig } from "@/lib/config/places";
import type { ChainPlace } from "../chain";
import { view, type AreaRef } from "../atlas-place";
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
  canonicalPath: slugPath,
  depth,
  names: [{ locale: "en", script: null, name, nameType: "self" }],
});

const ref = (feature: string): AreaRef => ({
  file: "/api/v1/places/geography/ab.topojson",
  feature,
});

const CHAIN = [
  place("north", "shire", 0, "Northshire", "testland/northshire"),
  place("realm", "realm", 1, "Testland", "testland"),
];
const PARTS = [
  place("mill", "parish", null, "Millbrook", "testland/northshire/millbrook"),
  place("ash", "parish", null, "Ashford", "testland/northshire/ashford"),
];

describe("atlas view", () => {
  const atlas = view({
    config: testland,
    on: "2026-11-10",
    locale: "en",
    chain: CHAIN,
    parts: PARTS,
    areas: new Map([
      ["north", ref("n")],
      ["mill", ref("m")],
    ]),
  })!;

  it("names the place, its own outline, and the pack it belongs to", () => {
    expect(atlas.place).toMatchObject({
      path: "/places/testland/northshire",
      name: "Northshire",
      pack: "testland",
      area: { feature: "n" },
    });
  });

  it("gives what it is part of, widest first, from data", () => {
    expect(atlas.chain.map((c) => c.name)).toEqual(["Testland"]);
  });

  it("groups children by level, by name, each with its outline when it has one", () => {
    expect(atlas.children).toHaveLength(1);
    expect(atlas.children[0]!.places.map((c) => [c.name, c.area?.feature ?? null])).toEqual([
      ["Ashford", null],
      ["Millbrook", "m"],
    ]);
  });

  it("says how many of its children are drawn, so a map can say the rest are not", () => {
    expect(atlas.drawn).toEqual({ children: 1, total: 2 });
  });

  it("is null for a place the config does not know", () => {
    expect(
      view({
        config: testland,
        on: "2026-11-10",
        locale: "en",
        chain: [{ ...CHAIN[0]!, countryPack: "elsewhere" }],
        parts: [],
        areas: new Map(),
      }),
    ).toBeNull();
  });
});

/**
 * A link to a place is built from its canonical path, never from `slug_path`:
 * a place whose `slug_path` is a path it once had (a pack root written with
 * underscores) must still be linked by the path `findPlace` answers 200 for,
 * or every click redirects once. The two differ here on purpose.
 */
import { describe, expect, it } from "vitest";
import { placesConfig } from "@/lib/config/places";
import type { ChainPlace } from "../chain";
import { view as atlasView } from "../atlas-place";
import { packHref, placeHref } from "../place-href";
import { placeView } from "../place-view";
import { withTestland } from "./fixtures/testland/config";

const testland = withTestland(placesConfig);
/** The slug_path of every place below is the old form; its canonical path is this. */
const OLD = "test_land";
const NEW = "test-land";

const place = (
  id: string,
  levelKey: string,
  depth: number | null,
  name: string,
  rest: string,
): ChainPlace => ({
  id,
  countryPack: "testland",
  levelKey,
  slugPath: `${OLD}${rest}`,
  canonicalPath: `${NEW}${rest}`,
  depth,
  names: [{ locale: "en", script: null, name, nameType: "self" }],
});

const CHAIN = [
  place("north", "shire", 0, "Northshire", "/northshire"),
  place("realm", "realm", 1, "Testland", ""),
];
const PARTS = [place("mill", "parish", null, "Millbrook", "/northshire/millbrook")];

describe("links to a place", () => {
  it("name a pack's root as place_paths writes it", () => {
    expect(packHref("test_land")).toBe("/places/test-land");
    expect(placeHref("test-land/northshire")).toBe("/places/test-land/northshire");
  });

  it("on a place page use the canonical path, for the crumbs and the places inside", () => {
    const page = placeView({
      config: testland,
      chain: CHAIN,
      parts: PARTS,
      facts: [],
      identifiers: [],
      instruments: [],
      sources: [],
      locale: "en",
    })!;
    const links = [...page.partOf, ...page.parts.flatMap((g) => g.places)];
    expect(links.length).toBeGreaterThan(1);
    for (const link of links) {
      expect(link.canonicalPath, link.name).toMatch(new RegExp(`^${NEW}`));
    }
  });

  it("on the atlas use the canonical path, for the place, its chain and its children", () => {
    const atlas = atlasView({
      config: testland,
      on: "2026-11-10",
      locale: "en",
      chain: CHAIN,
      parts: PARTS,
      areas: new Map(),
    })!;
    const paths = [
      atlas.place.path,
      ...atlas.chain.map((l) => l.path),
      ...atlas.children.flatMap((g) => g.places.map((p) => p.path)),
    ];
    expect(paths.length).toBeGreaterThan(2);
    for (const path of paths) {
      expect(path).toMatch(new RegExp(`^/places/${NEW}`));
    }
  });
});

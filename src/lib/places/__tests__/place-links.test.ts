/**
 * A link to a place is built from its canonical path, never from `slug_path`:
 * a place whose `slug_path` is a path it once had (a pack root written with
 * underscores) must still be linked by the path `findPlace` answers 200 for,
 * or every click redirects once. The two differ here on purpose.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { WORLD } from "@/lib/config/world";
import { placesConfig } from "@/lib/config/places";
import type { ChainPlace } from "../chain";
import { view as atlasView } from "../atlas-place";
import { packHref, placeHref, regionHref } from "../place-href";
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

const entry = (slug: string) => WORLD.find((r) => r.slug === slug)!;
const packOf = (slug: string) =>
  placesConfig.packs.find((p) => p.region && p.region === entry(slug).code)?.key;

describe("links to a world-list entry", () => {
  it("name a country no pack holds by its place in the world pack", () => {
    for (const slug of ["france", "georgia", "hong-kong-sar-china", "u-s-virgin-islands"])
      expect(regionHref(entry(slug), packOf(slug)), slug).toBe(`/places/world/${slug}`);
  });

  it("name a country a pack holds by the pack's root", () => {
    expect(regionHref(entry("switzerland"), packOf("switzerland"))).toBe("/places/switzerland");
    expect(regionHref(entry("united-states"), packOf("united-states"))).toBe(
      "/places/united-states",
    );
  });

  it("keep a claimed place, and an entry the world pack does not hold, on their own page", () => {
    expect(regionHref(entry("abkhazia"))).toBe("/places/abkhazia");
    expect(regionHref(entry("kosovo"))).toBe("/places/kosovo");
    expect(regionHref(entry("south-ossetia"))).toBe("/places/south-ossetia");
    const noCode = WORLD.find((r) => !r.code && !r.claimedBy)!;
    expect(regionHref(noCode)).toBe(`/places/${noCode.slug}`);
  });
});

/**
 * Every link to a place goes through place-href.ts. A path written by hand
 * (`/places/${...}`) is how the index and the world list came to link
 * addresses that redirect; only a redirect's own target may be built here.
 */
describe("place paths are built in one place", () => {
  const ALLOWED = new Set([
    "src/lib/places/place-href.ts",
    "src/lib/places/world-slug-redirects.ts",
    "src/app/[locale]/places/[...slug]/page.tsx",
    "src/app/[locale]/places/by/[scheme]/[value]/page.tsx",
  ]);
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return name === "__tests__" ? [] : files(path);
      return /\.(ts|tsx)$/.test(name) ? [path] : [];
    });

  it("no other file writes a /places/ path from a variable", () => {
    const handBuilt = files("src")
      .filter((path) => !ALLOWED.has(path))
      .filter((path) => /[`"']\/places\/\$\{/.test(readFileSync(path, "utf8")));
    expect(handBuilt).toEqual([]);
  });
});

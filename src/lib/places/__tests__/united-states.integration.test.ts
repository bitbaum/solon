/**
 * The United States pack through the real importer into a real database: the
 * nation, its states and the District of Columbia, and Wyoming's counties
 * from the Census Bureau's codes (data/places/united-states/administrative-units.json),
 * their outlines (county-boundaries.json), the federal income tax for 2026
 * (federal-income-tax.json, Rev. Proc. 2025-32) and Wyoming's rate of zero
 * (wyoming-income-tax.json). Laramie County resolves up its chain to
 * Wyoming and the United States; its tax is the federal tax alone, checked
 * by hand against the rate schedules.
 *
 * Safe to rerun on the same database: the second pass changes nothing.
 *
 * Runs only with INTEGRATION=1 against a migrated database.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { and, eq, isNull } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { placesConfig } from "@/lib/config/places";
import { unitedStatesIncomeTax } from "@/lib/config/places/countries/united_states";
import { db } from "@/lib/db/client";
import { jurisdictionIdentifiers, jurisdictions } from "@/lib/db/places-schema";
import { evaluate } from "@/lib/tax-model";
import { evaluatorFacts, loadChain, loadFacts } from "../chain";
import type { GeometryStore } from "../importer/geometry-store";
import { runImport, type ImportReport } from "../importer/run";
import type { SnapshotStore } from "../importer/snapshots";
import { loadAtlasPlace } from "../atlas-place";
import { findPlace } from "../paths";
import { placeHref } from "../place-href";
import { loadPlacePage } from "../place-page";
import { findPlaceByIdentifier } from "../by-identifier";
import { countWithin } from "../ancestors";
import { loadMapData } from "../map-data";
import { searchPlaces } from "../search";
import { withTestland } from "./fixtures/testland/config";

const RUN = process.env.INTEGRATION === "1";
const ON = "2026-11-08";
const PACK = "united_states";

/** CI's database also holds Testland, and sync refuses a config that drops data. */
const config = withTestland(placesConfig);

const snapshots: SnapshotStore = {
  async put(sha) {
    return `memory/${sha}`;
  },
  async get() {
    throw new Error("not needed here");
  },
};
const geometry: GeometryStore = {
  async put() {},
  async get() {
    return null;
  },
};

const DATA = join(__dirname, "../../../../data/places/united-states");
/** In the order a first load imports them: the places, their outlines, then their tax. */
const RETRIEVALS: [sourceKey: string, path: string][] = [
  ["us-census-units", join(DATA, "administrative-units.json")],
  ["us-census-county-boundaries", join(DATA, "county-boundaries.json")],
  ["us-federal-income-tax", join(DATA, "federal-income-tax.json")],
  ["wy-income-tax", join(DATA, "wyoming-income-tax.json")],
];

const importFile = (sourceKey: string, path: string): Promise<ImportReport> =>
  runImport(db, {
    config,
    sourceKey,
    retrieval: {
      bytes: new Uint8Array(readFileSync(path)),
      url: `fixture:${path.replace(/^.*\//, "")}`,
      retrievedAt: new Date(),
    },
    snapshots,
    geometry,
  });

async function placeId(scheme: string, value: string): Promise<string> {
  const [row] = await db
    .select({ id: jurisdictionIdentifiers.jurisdictionId })
    .from(jurisdictionIdentifiers)
    .where(
      and(
        eq(jurisdictionIdentifiers.scheme, scheme),
        eq(jurisdictionIdentifiers.value, value),
        isNull(jurisdictionIdentifiers.supersededAt),
      ),
    );
  expect(row, `${scheme}:${value}`).toBeDefined();
  return row!.id;
}

/** The tax at an adjusted gross income, for a place by one of its identifiers. */
async function taxAt(scheme: string, value: string) {
  const chain = await loadChain(db, await placeId(scheme, value), ON);
  const facts = evaluatorFacts(
    chain,
    await loadFacts(
      db,
      chain.map((p) => p.id),
      ON,
    ),
  );
  return (income: number, variant: "single" | "married") =>
    evaluate(unitedStatesIncomeTax, facts, {
      values: { adjusted_gross_income: income },
      variant,
    });
}

describe.skipIf(!RUN)("United States, imported", () => {
  it("imports the states, Wyoming's counties and their outlines, then the tax", async () => {
    for (const [sourceKey, path] of RETRIEVALS) {
      const report = await importFile(sourceKey, path);
      expect(report.problems, sourceKey).toEqual([]);
      expect(report.status, sourceKey).toBe("applied");
    }
  });

  it("changes nothing when the same state arrives again", async () => {
    for (const [sourceKey, path] of RETRIEVALS) {
      const report = await importFile(sourceKey, path);
      expect(report.status, sourceKey).toBe("applied");
      expect(
        Object.entries(report.counts).filter(([, n]) => n > 0),
        sourceKey,
      ).toEqual([]);
    }
  });

  it("holds fifty states and the District of Columbia, and Wyoming's 23 counties", async () => {
    const count = async (level: string) =>
      (
        await db
          .select({ id: jurisdictions.id })
          .from(jurisdictions)
          .where(and(eq(jurisdictions.countryPack, PACK), eq(jurisdictions.levelKey, level)))
      ).length;
    expect(await count("nation")).toBe(1);
    expect(await count("state")).toBe(51);
    expect(await count("county")).toBe(23);
  });

  it("resolves Laramie County up its chain to Wyoming and the United States", async () => {
    const chain = await loadChain(db, await placeId("us_county_fips", "56021"), ON);
    const ladder = chain
      .filter((p) => p.depth !== null)
      .sort((a, b) => a.depth! - b.depth!)
      .map((p) => [p.levelKey, p.names.find((n) => n.locale === "en")?.name]);
    expect(ladder).toEqual([
      ["county", "Laramie County"],
      ["state", "Wyoming"],
      ["nation", "United States"],
    ]);
  });

  it("knows Wyoming by its ISO 3166-2 code, which the law registry keys it by", async () => {
    expect(await placeId("iso_3166_2", "US-WY")).toBe(await placeId("us_state_fips", "56"));
  });

  it("finds Laramie County by its name", async () => {
    const found = await searchPlaces(db, config, "Laramie County", ON, "en");
    expect(found.hits[0]).toMatchObject({ packName: "United States" });
  });

  it("draws Wyoming's counties on the map", async () => {
    const map = await loadMapData(db, config, PACK, ON, "en");
    expect(map?.places).toHaveLength(23);
  });

  it("finds Wyoming by its FIPS code and by its ISO code", async () => {
    const wyoming = await findPlaceByIdentifier(db, { scheme: "us_state_fips", value: "56" }, ON);
    expect(wyoming).toMatch(/\/wyoming$/);
    expect(await findPlaceByIdentifier(db, { scheme: "iso_3166_2", value: "US-WY" }, ON)).toBe(
      wyoming,
    );
    expect(
      await findPlaceByIdentifier(db, { scheme: "us_state_fips", value: "03" }, ON),
    ).toBeNull();
  });

  it("gives the map the nation's 51 states with none drawn, and Wyoming's counties all drawn", async () => {
    const wyoming = await findPlaceByIdentifier(db, { scheme: "us_state_fips", value: "56" }, ON);
    const nation = await loadAtlasPlace(db, config, PACK, ON, "en");
    expect(nation?.children[0]).toMatchObject({ levelKey: "state" });
    expect(nation?.children[0]?.places).toHaveLength(51);
    expect(nation?.drawn).toEqual({ children: 0, total: 51 });
    const state = await loadAtlasPlace(db, config, wyoming!, ON, "en");
    expect(state?.chain.map((c) => c.name)).toEqual(["United States"]);
    expect(state?.children[0]?.places).toHaveLength(23);
    expect(state?.drawn).toEqual({ children: 23, total: 23 });
  });

  it("answers the old form of a path with the canonical one at every depth, the same for the page and the atlas", async () => {
    const wyoming = (await findPlaceByIdentifier(
      db,
      { scheme: "us_state_fips", value: "56" },
      ON,
    ))!;
    const county = (await loadAtlasPlace(db, config, wyoming, ON, "en"))!.children[0]!.places[0]!;
    const countyOld = county.path.replace(/^\/places\/united-/, "united_");
    const hyphen = (path: string) => path.replace(/^united_states/, "united-states");
    for (const old of [PACK, wyoming, countyOld]) {
      expect(old.startsWith("united_states")).toBe(true);
      const canonical = hyphen(old);
      for (const asked of [old, canonical]) {
        const atlas = await loadAtlasPlace(db, config, asked, ON, "en");
        const page = await loadPlacePage(db, config, asked, ON, "en");
        expect(atlas?.canonicalPath, asked).toBe(canonical);
        expect(page?.canonicalPath, asked).toBe(canonical);
        expect(page?.id, asked).toBeDefined();
      }
    }
    expect(await loadAtlasPlace(db, config, "united-states/nowhere", ON, "en")).toBeNull();
    expect(await loadPlacePage(db, config, "united-states/nowhere", ON, "en")).toBeNull();
  });

  it("links every place by its canonical path, so no click answers 308", async () => {
    const wyoming = (await findPlaceByIdentifier(
      db,
      { scheme: "us_state_fips", value: "56" },
      ON,
    ))!;
    const hrefs = new Set<string>();
    for (const path of [PACK, wyoming]) {
      const page = (await loadPlacePage(db, config, path, ON, "en"))!;
      const atlas = (await loadAtlasPlace(db, config, path, ON, "en"))!;
      for (const link of [...page.partOf, ...page.parts.flatMap((g) => g.places)]) {
        if (link.canonicalPath) hrefs.add(placeHref(link.canonicalPath));
      }
      hrefs.add(atlas.place.path);
      for (const link of [...atlas.chain, ...atlas.children.flatMap((g) => g.places)]) {
        hrefs.add(link.path);
      }
    }
    for (const hit of (await searchPlaces(db, config, "Laramie County", ON, "en")).hits) {
      hrefs.add(placeHref(hit.canonicalPath));
    }
    for (const place of (await loadMapData(db, config, PACK, ON, "en"))!.places) {
      hrefs.add(placeHref(place.canonicalPath));
    }
    expect(hrefs.size).toBeGreaterThan(10);
    for (const href of hrefs) {
      const asked = href.replace(/^\/places\//, "");
      const found = await findPlace(db, config, asked);
      expect(found?.canonicalPath, href).toBe(asked);
    }
  });

  it("knows what lies within the nation and within Wyoming, at every depth", async () => {
    const within = async (scheme: string, value: string) =>
      Object.fromEntries(
        (await countWithin(db, await placeId(scheme, value))).map((r) => [r.levelKey, r.places]),
      );
    expect(await within("iso_3166_1", "US")).toEqual({ state: 51, county: 23 });
    expect(await within("us_state_fips", "56")).toEqual({ county: 23 });
    expect(await within("us_county_fips", "56021")).toEqual({});
  });

  // By hand, from Rev. Proc. 2025-32 § 4.01 and § 4.14(1): taxable income is
  // the adjusted gross income less the standard deduction (16,100 single,
  // 32,200 joint), then the table's tax at the step it falls in.
  it("taxes Laramie County at the federal rates alone, Wyoming's being zero", async () => {
    const at = await taxAt("us_county_fips", "56021");
    // Single, 50,000: taxable 33,900; 1,240 + 12 % of 21,500 = 3,820.
    expect(at(50_000, "single")).toMatchObject({ complete: true, currency: "USD" });
    expect(at(50_000, "single").total).toBeCloseTo(3_820, 2);
    // Single, 120,000: taxable 103,900; 5,800 + 22 % of 53,500 = 17,570.
    expect(at(120_000, "single").total).toBeCloseTo(17_570, 2);
    // Single, 700,000: taxable 683,900; 192,979.25 + 37 % of 43,300 = 209,000.25.
    expect(at(700_000, "single").total).toBeCloseTo(209_000.25, 2);
    // Single, 16,000: below the standard deduction.
    expect(at(16_000, "single").total).toBe(0);
    // Joint, 100,000: taxable 67,800; 2,480 + 12 % of 43,000 = 7,640.
    expect(at(100_000, "married").total).toBeCloseTo(7_640, 2);
    // Joint, 1,000,000: taxable 967,800; 206,583.50 + 37 % of 199,100 = 280,250.50.
    expect(at(1_000_000, "married").total).toBeCloseTo(280_250.5, 2);
    const parts = at(120_000, "single").components;
    expect(parts.find((c) => c.key === "state")?.amount).toBe(0);
  });

  it("leaves a state whose own tax is not recorded incomplete, rather than zero", async () => {
    const at = await taxAt("us_state_fips", "08");
    expect(at(50_000, "single").complete).toBe(false);
  });
});

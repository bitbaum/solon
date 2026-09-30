/**
 * The Swiss pack through the real importer into a real database, from cuts of
 * the actual retrievals (fixtures/switzerland): the FSO commune register on
 * 1 January 2021 and on 29 September 2026, its mutations in between, the City
 * of Zürich's statistical quarters, the canton's municipal multipliers,
 * swisstopo's postcode directory for the communes in the cut, and three of
 * their boundaries.
 * The P1 acceptance (§11) as far as it is built: Witikon resolves up its chain
 * to Switzerland, a merger is a succession, not an edit, and the City of Zürich
 * and Küsnacht at CHF 100,000 match the Federal Tax Administration's
 * calculator (the golden fixtures).
 *
 * Safe to rerun on the same database: the second pass of every import must
 * change nothing, which is also what the scheduled runs rely on.
 *
 * Runs only with INTEGRATION=1 against a migrated database.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { validateGeographyManifest } from "@bitbaum/geo-kit";
import { and, eq, isNull } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ComponentProps } from "react";
import { NextIntlClientProvider, createTranslator } from "next-intl";
import CompareIndex from "@/components/places/compare-index";
import CoverageReport from "@/components/places/coverage-report";
import de from "../../../../messages/de.json";
import en from "../../../../messages/en.json";
import { placesConfig } from "@/lib/config/places";
import { db } from "@/lib/db/client";
import {
  areaAssertions,
  areas,
  facts,
  jurisdictionIdentifiers,
  jurisdictionRelations,
  jurisdictions,
} from "@/lib/db/places-schema";
import { switzerlandIncomeTax } from "@/lib/config/places/countries/switzerland";
import { evaluate } from "@/lib/tax-model";
import { evaluatorFacts, loadChain, loadFacts } from "../chain";
import { loadComparison } from "../compare";
import { estimateColumn, type ColumnEstimate } from "../compare-view";
import { runImport, type ImportReport } from "../importer/run";
import type { GeometryStore } from "../importer/geometry-store";
import type { SnapshotStore } from "../importer/snapshots";
import { loadPlacePage } from "../place-page";
import { loadCoverage } from "../coverage";
import { geographyFileHref, geographyManifest, parseGeometryRef } from "../geography";
import { resolvePostcode } from "../postcodes";
import { loadPackIndex, placesAtLevel, searchPlaces } from "../search";
import { withTestland } from "./fixtures/testland/config";

const RUN = process.env.INTEGRATION === "1";
const ON = "2026-09-29";
const FIXTURES = join(__dirname, "fixtures", "switzerland");

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

/** In the order `places:fetch --backfill` then the schedule would import them. */
const RETRIEVALS: [sourceKey: string, file: string][] = [
  ["bfs-communes-snapshot", "communes-2026-09-29.csv"],
  ["bfs-communes-snapshot", "communes-2021-01-01.csv"],
  ["bfs-communes-snapshot", "communes-2026-09-29.csv"],
  ["bfs-communes-mutations", "mutations-2021-2026.csv"],
  ["zurich-statistical-quarters", "statistical-quarters.json"],
  ["zurich-municipal-multipliers", "multipliers-2020-2026.csv"],
  ["estv-income-tax-scales", "estv-scales-2025.json"],
  ["estv-canton-multipliers", "estv-rates-2025.json"],
  ["estv-commune-multipliers", "estv-commune-rates-2025.json"],
  ["swisstopo-postcode-localities", "postcode-localities-2026-09-30.csv"],
  ["swisstopo-commune-boundaries", "swissboundaries3d_2026-01_cut.shp.zip"],
];

/**
 * The Federal Tax Administration's calculator (API_calculateSimpleTaxes), 2025,
 * taxable income CHF 100,000, no church tax, asked on 2026-09-29 (Zürich and
 * Küsnacht) and 2026-09-30 (Biel/Bienne, Canton of Bern). Zürich's CHF 24 per
 * person Personalsteuer is left out: the model has no fixed amounts yet.
 */
const GOLDEN_2025 = [
  { commune: "261", variant: "single", federal: 2688, canton: 6083, communal: 7386 },
  { commune: "261", variant: "married", federal: 1816, canton: 4689, communal: 5694 },
  { commune: "154", variant: "single", federal: 2688, canton: 6083, communal: 4531 },
  { commune: "154", variant: "married", federal: 1816, canton: 4689, communal: 3493 },
  { commune: "371", variant: "single", federal: 2688, canton: 13373, communal: 7327 },
  { commune: "371", variant: "married", federal: 1816, canton: 11365, communal: 6227 },
] as const;

const geometryFiles = new Map<string, Uint8Array>();
const geometry: GeometryStore = {
  async put(sha, text) {
    geometryFiles.set(sha, new TextEncoder().encode(text));
  },
  async get(sha) {
    return geometryFiles.get(sha) ?? null;
  },
};

const importFixture = (sourceKey: string, file: string): Promise<ImportReport> =>
  runImport(db, {
    config,
    sourceKey,
    retrieval: {
      bytes: new Uint8Array(readFileSync(join(FIXTURES, file))),
      url: `fixture:${file}`,
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

describe.skipIf(!RUN)("Switzerland, imported (P1)", () => {
  it("imports the register's snapshots, its mergers, the city's quarters and the multipliers", async () => {
    for (const [sourceKey, file] of RETRIEVALS) {
      const report = await importFixture(sourceKey, file);
      expect(report.problems, file).toEqual([]);
      expect(report.status, file).toBe("applied");
    }
  });

  it("changes nothing when a scheduled run brings the same state again", async () => {
    // The first two are backfill: a schedule never refetches the past.
    for (const [sourceKey, file] of RETRIEVALS.slice(2)) {
      const report = await importFixture(sourceKey, file);
      expect(report.status, file).toBe("applied");
      expect(
        Object.entries(report.counts).filter(([, n]) => n > 0),
        file,
      ).toEqual([]);
    }
  });

  it("resolves Witikon up its chain to Switzerland", async () => {
    const chain = await loadChain(db, await placeId("zurich_statistical_quarter", "74"), ON);
    const ladder = chain
      .filter((p) => p.depth !== null)
      .sort((a, b) => a.depth! - b.depth!)
      .map((p) => [
        p.levelKey,
        p.names.find((n) => n.nameType === "self" && n.locale === "de")?.name,
      ]);
    expect(ladder).toEqual([
      ["statistical_quarter", "Witikon"],
      ["city_district", "Kreis 7"],
      ["municipality", "Zürich"],
      ["district", "Bezirk Zürich"],
      ["canton", "Zürich"],
      ["nation", "Schweiz"],
    ]);
  });

  it("draws communes from the boundary file, each administered by its place", async () => {
    const drawn = await db
      .select({ ref: areas.geometryRef, place: areaAssertions.jurisdictionId })
      .from(areas)
      .innerJoin(areaAssertions, eq(areaAssertions.areaId, areas.id))
      .where(and(isNull(areas.supersededAt), isNull(areaAssertions.supersededAt)));
    const byFeature = new Map(drawn.map((d) => [parseGeometryRef(d.ref)?.featureId, d]));
    for (const code of ["154", "261", "371"]) {
      expect(byFeature.get(code)?.place, code).toBe(await placeId("bfs_municipality", code));
      expect(parseGeometryRef(byFeature.get(code)!.ref)).toMatchObject({
        sourceId: "swisstopo-commune-boundaries",
        datasetVersion: "2026-01",
      });
    }
  });

  it("publishes the boundary file in a manifest a map can check", async () => {
    const manifest = await geographyManifest(db, config, geometry, new Date());
    const licensePolicy = config.licences.map((l) => ({
      spdx: l.spdx,
      requiresAttribution: l.requiresAttribution,
    }));
    expect(validateGeographyManifest(manifest, { licensePolicy })).toEqual([]);
    const communes = manifest.resources.find(
      (r) => r.id === "swisstopo-commune-boundaries:2026-01",
    );
    expect(communes).toMatchObject({
      geographyId: "switzerland",
      levelKey: "municipality",
      format: "topojson",
      featureCount: 3,
      viewpointKey: null,
    });
    expect(communes?.href).toBe(geographyFileHref(communes!.sha256));
    expect(geometryFiles.get(communes!.sha256)?.byteLength).toBe(communes?.byteSize);
    expect(manifest.sources.map((s) => s.id)).toContain("swisstopo-commune-boundaries");
  });

  it("replaces a commune's area when a new edition of the boundaries arrives", async () => {
    const zip = new Uint8Array(
      readFileSync(join(FIXTURES, "swissboundaries3d_2026-01_cut.shp.zip")),
    );
    const edition = (name: string) =>
      runImport(db, {
        config,
        sourceKey: "swisstopo-commune-boundaries",
        retrieval: { bytes: zip, url: `fixture:${name}`, retrievedAt: new Date() },
        snapshots,
        geometry,
      });
    const next = await edition("swissboundaries3d_2027-01_cut.shp.zip");
    expect(next.counts).toMatchObject({ areasSuperseded: 3, areasInserted: 3 });
    const back = await edition("swissboundaries3d_2026-01_cut.shp.zip");
    expect(back.counts).toMatchObject({ areasSuperseded: 3, areasInserted: 3 });
  });

  it("resolves a postcode to the commune it lies in", async () => {
    // Witikon's own postcode reaches the City of Zürich; the quarter needs the
    // city's address register, which is not imported yet.
    expect(await resolvePostcode(db, "switzerland", "8053", ON)).toEqual([
      {
        jurisdictionId: await placeId("bfs_municipality", "261"),
        localities: [{ name: "Zürich", share: 1 }],
      },
    ]);
    const kuesnacht = await resolvePostcode(db, "switzerland", "8700", ON);
    expect(kuesnacht.map((m) => m.jurisdictionId)).toEqual([
      await placeId("bfs_municipality", "154"),
    ]);
    expect(await resolvePostcode(db, "switzerland", "9999", ON)).toEqual([]);
  });

  it("finds a place by postcode or by name, with its level and parent", async () => {
    const byPostcode = await searchPlaces(db, config, "8053", ON, "de");
    expect(byPostcode.kind).toBe("postcode");
    expect(byPostcode.hits).toEqual([
      expect.objectContaining({
        name: "Zürich",
        levelName: "Gemeinde",
        parentName: "Bezirk Zürich",
        localities: [{ name: "Zürich", share: 1 }],
      }),
    ]);
    const byName = await searchPlaces(db, config, "witik", ON, "de");
    expect(byName.hits.map((h) => [h.name, h.parentName])).toEqual([["Witikon", "Kreis 7"]]);
    expect((await searchPlaces(db, config, "zürich", ON, "de")).hits[0]?.name).toBe("Zürich");
    // Typed without the umlaut, or with it spelled out, a name is still found.
    for (const typed of ["zurich", "Zuerich", "ZÜRICH"]) {
      expect((await searchPlaces(db, config, typed, ON, "de")).hits[0]?.name, typed).toBe("Zürich");
    }
    expect((await searchPlaces(db, config, "kusnacht", ON, "de")).hits.map((h) => h.name)).toEqual([
      "Küsnacht (ZH)",
    ]);
    expect((await searchPlaces(db, config, "z", ON, "de")).hits).toEqual([]);
  });

  it("lists a level's places by name and counts every level", async () => {
    // The cut holds two of the city's districts and eight current communes.
    const districts = await placesAtLevel(db, config, "switzerland", "city_district", ON, "de");
    expect(districts.map((d) => [d.name, d.parentName])).toEqual([
      ["Kreis 1", "Zürich"],
      ["Kreis 7", "Zürich"],
    ]);
    const swiss = (await loadPackIndex(db, config, ON, "de")).find((p) => p.key === "switzerland");
    expect(swiss?.levels.find((l) => l.key === "municipality")?.count).toBe(8);
  });

  it("gives Witikon a page at its path, taking no tax", async () => {
    const view = await loadPlacePage(
      db,
      config,
      "switzerland/zurich/bezirk-zurich/zurich/kreis-7/witikon",
      ON,
      "de",
    );
    expect(view).toMatchObject({
      name: "Witikon",
      levelName: "Statistisches Quartier",
      takesTax: false,
    });
    expect(view!.partOf.map((p) => p.name)).toEqual([
      "Schweiz",
      "Zürich",
      "Bezirk Zürich",
      "Zürich",
      "Kreis 7",
    ]);
  });

  it("ends the merged communes and links the new one to each", async () => {
    const andelfingen = await placeId("bfs_municipality", "291");
    const successions = await db
      .select({ to: jurisdictionRelations.toId, validFrom: jurisdictionRelations.validFrom })
      .from(jurisdictionRelations)
      .where(
        and(
          eq(jurisdictionRelations.fromId, andelfingen),
          eq(jurisdictionRelations.relation, "succeeds"),
          isNull(jurisdictionRelations.supersededAt),
        ),
      );
    const predecessors = await Promise.all(
      ["21", "32", "30"].map((value) => placeId("bfs_municipality", value)),
    );
    expect(successions.map((s) => s.to).sort()).toEqual([...predecessors].sort());
    expect(new Set(successions.map((s) => s.validFrom))).toEqual(new Set(["2023-01-01"]));

    const ended = await db
      .select({ validTo: jurisdictions.validTo })
      .from(jurisdictions)
      .where(eq(jurisdictions.id, predecessors[0]!));
    expect(ended[0]!.validTo).toBe("2023-01-01");
  });

  it("keeps the plain path for the commune that exists now", async () => {
    const paths = await db
      .select({ slugPath: jurisdictions.slugPath, validTo: jurisdictions.validTo })
      .from(jurisdictions)
      .where(eq(jurisdictions.id, await placeId("bfs_municipality", "291")));
    expect(paths[0]!.slugPath).toBe("switzerland/zurich/bezirk-andelfingen/andelfingen");
    const [old] = await db
      .select({ slugPath: jurisdictions.slugPath })
      .from(jurisdictions)
      .where(eq(jurisdictions.id, await placeId("bfs_municipality", "30")));
    expect(old!.slugPath).toBe("switzerland/zurich/bezirk-andelfingen/andelfingen-30");
  });

  it("keeps Kloten current through its territory exchange, under its new version", async () => {
    const kloten = await placeId("bfs_municipality", "62");
    const [row] = await db
      .select({ validTo: jurisdictions.validTo })
      .from(jurisdictions)
      .where(eq(jurisdictions.id, kloten));
    expect(row!.validTo).toBeNull();
    const versions = await db
      .select({ value: jurisdictionIdentifiers.value })
      .from(jurisdictionIdentifiers)
      .where(
        and(
          eq(jurisdictionIdentifiers.jurisdictionId, kloten),
          eq(jurisdictionIdentifiers.scheme, "bfs_municipality_version"),
          isNull(jurisdictionIdentifiers.supersededAt),
        ),
      );
    expect(versions.map((v) => v.value)).toEqual(["16656"]);
  });

  it("records a commune's multiplier for each year, and leaves out a commune with two rates", async () => {
    const multipliers = async (commune: string) =>
      db
        .select({ validFrom: facts.validFrom, value: facts.valueNumeric, unit: facts.unit })
        .from(facts)
        .where(
          and(
            eq(facts.jurisdictionId, await placeId("bfs_municipality", commune)),
            eq(facts.metricKey, "tax.multiplier"),
            isNull(facts.supersededAt),
          ),
        )
        .orderBy(facts.validFrom);
    const zurich = await multipliers("261");
    expect(zurich.map((f) => f.validFrom)).toEqual(
      [2021, 2022, 2023, 2024, 2025, 2026].map((year) => `${year}-01-01`),
    );
    expect(zurich.every((f) => Number(f.value) === 1.19)).toBe(true);
    expect(await multipliers("21")).toEqual([]);
  });

  it.each(GOLDEN_2025)(
    "estimates commune $commune, $variant, at CHF 100,000 as the federal calculator does",
    async ({ commune, variant, federal, canton, communal }) => {
      const chain = await loadChain(db, await placeId("bfs_municipality", commune), "2025-06-30");
      const chainFacts = await loadFacts(
        db,
        chain.map((p) => p.id),
        "2025-06-30",
      );
      const estimate = evaluate(switzerlandIncomeTax, evaluatorFacts(chain, chainFacts), {
        values: { taxable_income: 100_000 },
        variant,
      });
      expect(estimate.complete).toBe(true);
      expect(estimate.currency).toBe("CHF");
      const amount = (key: string) => estimate.components.find((c) => c.key === key)!.amount!;
      // The calculator rounds each tax to the franc; canton and commune share one component.
      expect(Math.abs(amount("federal") - federal)).toBeLessThan(1);
      expect(Math.abs(amount("cantonal_and_communal") - (canton + communal))).toBeLessThan(2);
    },
  );

  it("compares places as the federal calculator does, and says why a figure is missing", async () => {
    const pathOf = async (id: string) =>
      (
        await db
          .select({ path: jurisdictions.slugPath })
          .from(jurisdictions)
          .where(eq(jurisdictions.id, id))
      )[0]!.path!;
    const zurich = await pathOf(await placeId("bfs_municipality", "261"));
    const kusnacht = await pathOf(await placeId("bfs_municipality", "154"));
    const witikon = (await searchPlaces(db, config, "witik", ON, "de")).hits[0]!.slugPath;
    const [canton] = await db
      .select({ path: jurisdictions.slugPath })
      .from(jurisdictions)
      .where(and(eq(jurisdictions.levelKey, "canton"), isNull(jurisdictions.validTo)));
    const comparison = await loadComparison(
      db,
      config,
      [zurich, kusnacht, witikon, canton!.path!, "switzerland/nowhere"],
      "2025-06-30",
      "de",
    );
    expect(comparison.notFound).toEqual(["switzerland/nowhere"]);
    expect(comparison.earlierYear).toBe(false);
    // The cut's tariffs end with 2025, so a day in 2026 compares 2025, and says so.
    const later = await loadComparison(db, config, [zurich, kusnacht], "2026-09-30", "de");
    expect(later.earlierYear).toBe(true);
    expect(later.taxPacks[0]!.taxYear).toBe("2025");
    const pack = comparison.taxPacks.find((p) => p.key === "switzerland")!;
    expect(pack.taxYear).toBe("2025");
    // Amounts in Swiss number formats, in the reader's language: CHF 13’050.
    expect(pack.formatLocale).toBe("de-CH");
    const run = (i: number, variant: string): ColumnEstimate =>
      estimateColumn(comparison.columns[i]!, pack, { base: 100_000, variant, conditions: {} });
    const total = (i: number, variant: string) => {
      const e = run(i, variant);
      if (e.kind !== "estimate") {
        throw new Error(`column ${i}: ${e.kind}`);
      }
      return e.estimate.total;
    };
    const columnOf: Record<string, number> = { "261": 0, "154": 1 };
    for (const g of GOLDEN_2025.filter((g) => g.commune in columnOf)) {
      const i = columnOf[g.commune]!;
      expect(Math.abs(total(i, g.variant) - (g.federal + g.canton + g.communal))).toBeLessThan(3);
    }
    // Witikon levies nothing itself: its tax is the City of Zürich's.
    expect(total(2, "single")).toBe(total(0, "single"));
    expect(comparison.columns[2]!.taxedBy.at(-1)).toEqual({
      name: "Zürich",
      levelName: "Gemeinde",
    });
    expect(run(3, "single")).toEqual({ kind: "needs_lower_place", levels: ["municipality"] });
    expect(comparison.columns[0]!.multipliers["municipality/tax.multiplier"]).toBe(1.19);
    expect(comparison.sources.map((s) => s.publisher)).toEqual(
      expect.arrayContaining([expect.stringContaining("Tax Administration")]),
    );

    const t = createTranslator({ locale: "de", messages: de, namespace: "Places" });
    const html = renderToStaticMarkup(
      createElement(
        NextIntlClientProvider,
        { locale: "de", messages: de } as ComponentProps<typeof NextIntlClientProvider>,
        createElement(CompareIndex, {
          slugPaths: comparison.columns.map((c) => c.slugPath),
          comparison,
          limit: 4,
          query: "",
          searchAction: "/de/compare",
          search: null,
          t,
        }),
      ),
    );
    expect(html).toContain("Steuerfuss (Gemeinde)");
    expect(html).toContain("Direkte Bundessteuer");
    expect(html).toContain("höchstens 4 Orte");
    // Rendered on the server, before the reader has typed anything.
    expect(html).toContain("Geben Sie oben Ihr Einkommen ein");
  });

  it("still finds a year's tariffs and multipliers on its last day", async () => {
    const chain = await loadChain(db, await placeId("bfs_municipality", "261"), "2025-12-31");
    const chainFacts = await loadFacts(
      db,
      chain.map((p) => p.id),
      "2025-12-31",
    );
    const estimate = evaluate(switzerlandIncomeTax, evaluatorFacts(chain, chainFacts), {
      values: { taxable_income: 100_000 },
      variant: "single",
    });
    expect(estimate.missing).toEqual([]);
  });

  it("counts its coverage from the data and renders it", async () => {
    const packs = await loadCoverage(db, config, "2025-06-01", "en");
    const swiss = packs.find((p) => p.key === "switzerland")!;
    const metric = (level: string) => swiss.metrics.find((m) => m.levelName === level)!;
    expect(metric("Confederation")).toMatchObject({ places: 1, of: 1, inTaxModel: true });
    const communal = swiss.metrics.find((m) => m.levelName === "Municipality" && m.inTaxModel)!;
    expect(communal.places).toBeGreaterThanOrEqual(2);
    expect(communal.places).toBeLessThan(communal.of);
    expect(swiss.sources.every((s) => s.retrievedOn !== null)).toBe(true);

    const t = createTranslator({ locale: "en", messages: en, namespace: "Places" });
    const html = renderToStaticMarkup(
      createElement(CoverageReport, { packs, on: "2025-06-01", t }),
    );
    expect(html).toContain("Switzerland");
    expect(html).toContain(`${communal.places} of ${communal.of}`);
  });
});

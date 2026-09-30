import { describe, expect, it } from "vitest";
import { placesConfig } from "@/lib/config/places";
import type { Tariff } from "@/lib/tax-model";
import type { ChainFact, ChainPlace } from "../chain";
import {
  comparisonView,
  figuresPublished,
  taxYear,
  yearsBefore,
  type ComparedPlace,
} from "../compare";
import {
  compareHref,
  estimateColumn,
  lowestTotals,
  parseAmount,
  type ColumnEstimate,
} from "../compare-view";
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
const flat = (rate: number): Tariff => ({ kind: "flat", currency: "XTS", rate });
const fact = (jurisdictionId: string, metricKey: string, value: number | Tariff): ChainFact => ({
  jurisdictionId,
  metricKey,
  variant: null,
  validFrom: "2026-04-01",
  value,
  sourceId: "src",
});

const realm = place("realm", "realm", 3, "Testland", "testland");
const shire = place("north", "shire", 2, "Northshire", "testland/northshire");
const parish = place("mill", "parish", 1, "Millbrook", "testland/northshire/millbrook");
const hamlet = place("oak", "hamlet", 0, "Oak Hollow", "testland/northshire/millbrook/oak-hollow");
const FACTS = [
  fact("realm", "test.income.tariff", flat(0.1)),
  fact("north", "test.income.tariff.basic", flat(0.05)),
  fact("north", "test.multiplier", 1),
  fact("mill", "test.multiplier", 0.5),
];

const compare = (places: ComparedPlace[]) =>
  comparisonView({ config: testland, places, on: "2026-09-30", locale: "en" });
const atDepth0 = (p: ChainPlace, depth: number) => ({ ...p, depth: p.depth! - depth });

const view = compare([
  { chain: [hamlet, parish, shire, realm], facts: FACTS },
  // The shire itself: its chain stops above the parishes, which set a multiplier.
  { chain: [atDepth0(shire, 2), atDepth0(realm, 2)], facts: FACTS },
]);
const [oak, north] = view.columns;
const pack = view.taxPacks[0]!;
const estimate = (column = oak!, base: number | null = 1000, conditions = {}) =>
  estimateColumn(column, pack, { base, variant: "alone", conditions });

describe("comparisonView", () => {
  it("names each place, where it sits, and who levies its tax, root first", () => {
    expect(oak).toMatchObject({
      name: "Oak Hollow",
      levelName: "Hamlet",
      parentName: "Millbrook",
      taxedBy: [
        { name: "Testland", levelName: "Realm" },
        { name: "Northshire", levelName: "Shire" },
        { name: "Millbrook", levelName: "Parish" },
      ],
    });
  });

  it("labels the model from the pack and counts the pack's own fiscal year", () => {
    expect(pack).toMatchObject({
      currency: "XTS",
      formatLocale: "en",
      taxYear: "2026/27",
      base: { key: "taxable_income", label: "Income", hint: null },
      conditions: [{ key: "guild_member", label: "Guild member" }],
      variants: [
        { key: "alone", label: "Alone" },
        { key: "together", label: "Together" },
      ],
      excludes: "Not included: the tithe.",
    });
    expect(pack.multiplierRows.map((r) => [r.key, r.level])).toEqual([
      ["shire/test.multiplier", "Shire"],
      ["parish/test.multiplier", "Parish"],
      ["guild/test.multiplier", "Guild"],
    ]);
  });

  it("shows each multiplier, a missing one as missing, and none for a level it lacks", () => {
    expect(oak!.multipliers).toEqual({
      "shire/test.multiplier": 1,
      "parish/test.multiplier": 0.5,
    });
    // The shire has no parish or guild above or beside it: those rows do not apply.
    expect(north!.multipliers).toEqual({ "shire/test.multiplier": 1 });
  });

  it("leaves out a place whose pack the config lacks", () => {
    const stray = { ...hamlet, countryPack: "atlantis", slugPath: "atlantis/x" };
    expect(compare([{ chain: [stray], facts: [] }]).notFound).toEqual(["atlantis/x"]);
  });
});

describe("estimateColumn", () => {
  it("estimates from the column's facts alone", () => {
    const e = estimate() as Extract<ColumnEstimate, { kind: "estimate" }>;
    expect(e.kind).toBe("estimate");
    // 10% crown, plus 5% times (1 + 0.5) for shire and parish.
    expect(e.estimate.total).toBeCloseTo(175, 10);
    expect(e.currency).toBe("XTS");
  });

  it("says a lower place decides when the model reads a level below this one", () => {
    expect(estimate(north)).toEqual({ kind: "needs_lower_place", levels: ["parish"] });
  });

  it("says a figure is not recorded when the chain reaches its level", () => {
    const bare = compare([{ chain: [hamlet, parish, shire, realm], facts: FACTS.slice(0, 3) }]);
    expect(estimate(bare.columns[0])).toEqual({ kind: "not_recorded", levels: ["parish"] });
  });

  it("waits for an amount, and runs no model without a pack", () => {
    expect(estimate(oak, null)).toEqual({ kind: "no_input" });
    expect(estimateColumn(oak!, undefined, { base: 1, variant: "", conditions: {} })).toEqual({
      kind: "no_model",
    });
  });
});

describe("lowestTotals", () => {
  const at = (total: number, currency: string): ColumnEstimate => ({
    kind: "estimate",
    currency,
    formatLocale: "en",
    estimate: {
      components: [],
      total,
      effectiveRate: 0,
      currency,
      complete: true,
      missing: [],
    },
  });
  it("sets totals against each other only within a currency", () => {
    const lowest = lowestTotals([at(300, "XTS"), at(200, "XTS"), at(50, "XXX"), { kind: "error" }]);
    expect([...lowest]).toEqual([
      ["XTS", 200],
      ["XXX", 50],
    ]);
  });
});

describe("parseAmount", () => {
  it.each([
    ["85000", 85000],
    ["85'000", 85000],
    ["85 000", 85000],
    ["85,000", 85000],
    ["85000.50", 85000],
    ["85000,5", 85000],
    ["", null],
    ["abc", null],
  ])("reads %j as %j", (text, value) => {
    expect(parseAmount(text)).toBe(value);
  });
});

describe("taxYear", () => {
  it("counts a calendar fiscal year by its year, and a split one by both", () => {
    expect(taxYear("01-01", "2026-09-30")).toBe("2026");
    expect(taxYear("04-01", "2026-03-31")).toBe("2025/26");
    expect(taxYear("04-01", "2026-04-01")).toBe("2026/27");
  });
});

describe("going back to the latest published year", () => {
  it("steps back whole years, and 29 February to the 28th", () => {
    expect(yearsBefore("2026-09-30", 1)).toBe("2025-09-30");
    expect(yearsBefore("2024-02-29", 1)).toBe("2023-02-28");
  });

  it("counts a year published when every figure at the place's own levels is recorded", () => {
    const chain = [hamlet, parish, shire, realm];
    expect(figuresPublished(testland, { chain, facts: FACTS })).toBe(true);
    expect(figuresPublished(testland, { chain, facts: FACTS.slice(1) })).toBe(false);
    // A shire lacks a parish's multiplier in every year; that is no reason to go back.
    const shireChain = [atDepth0(shire, 2), atDepth0(realm, 2)];
    expect(figuresPublished(testland, { chain: shireChain, facts: FACTS })).toBe(true);
  });
});

describe("compareHref", () => {
  it("links the places in order, and nothing else", () => {
    expect(compareHref([])).toBe("/compare");
    expect(compareHref(["switzerland/zurich", "a&b"])).toBe(
      "/compare?p=switzerland/zurich&p=a%26b",
    );
  });
});

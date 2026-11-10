import { describe, expect, it } from "vitest";
import { BUDGET_DOCUMENTS, BUDGET_TAXONOMIES } from "@/lib/config/budgets";
import { COFOG } from "@/lib/config/budgets/cofog";
import { ESA_REVENUE } from "@/lib/config/budgets/revenue";
import { placesConfig } from "@/lib/config/places";
import { WORLD } from "@/lib/config/world";
import { breakdown, history, latestWith, pickBudget, selfReliance } from "../analysis";
import { budgetIndexRows, budgetSections } from "../page";
import { conversionOf, formatBudgetValue, ofGdp } from "../format";
import { RATES } from "@/lib/config/money";

const DISPLAY = { locale: "en", currency: "CHF", rates: RATES };
import { budgetOfDocument, budgetDocumentSchema, documentProblems } from "../documents";
import { holderOfRegion, regionOfHolder } from "../holders";
import type { Budget } from "../model";
import { budgetsFromFacts } from "../read";
import { budgetMetricKey, parseBudgetMetricKey } from "../scopes";
import { childrenOf, defineTaxonomy } from "../taxonomy";

const document = (key: string) =>
  budgetOfDocument(
    BUDGET_DOCUMENTS.find((d) => d.key === key)!,
    BUDGET_TAXONOMIES,
  );

describe("the taxonomies", () => {
  it("COFOG: ten divisions under the total, every group under a division", () => {
    expect(childrenOf(COFOG, "TOTAL").map((c) => c.code)).toEqual(
      ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10"].map((n) => `GF${n}`),
    );
    for (const c of COFOG.categories.filter((c) => c.depth === 2)) {
      expect(c.parent, c.code).toBe(c.code.slice(0, 4));
    }
  });

  it("every division has a name in every language the site speaks", () => {
    for (const t of [COFOG, ESA_REVENUE]) {
      for (const c of t.categories.filter((c) => c.depth <= 1)) {
        for (const l of ["en", "de", "fr", "it", "ru"]) {
          expect((c.plain ?? c.label)[l], `${c.code} ${l}`).toBeTruthy();
        }
      }
    }
  });

  it("refuses a second root, an unknown parent and a cycle", () => {
    const base = { key: "t", side: "revenue" as const, total: "T" };
    const label = { en: "x" };
    expect(() =>
      defineTaxonomy({
        ...base,
        categories: [
          { code: "T", parent: null, label },
          { code: "U", parent: null, label },
        ],
      }),
    ).toThrow(/second root/);
    expect(() =>
      defineTaxonomy({
        ...base,
        categories: [
          { code: "T", parent: null, label },
          { code: "A", parent: "Z", label },
        ],
      }),
    ).toThrow(/unknown parent/);
    expect(() =>
      defineTaxonomy({
        ...base,
        categories: [
          { code: "T", parent: null, label },
          { code: "A", parent: "B", label },
          { code: "B", parent: "A", label },
        ],
      }),
    ).toThrow(/own ancestor/);
  });

  it("every category is a metric in the catalog, named the one way", () => {
    for (const t of [COFOG, ESA_REVENUE]) {
      for (const c of t.categories) {
        const key = budgetMetricKey("gg", t, c.code);
        expect(
          placesConfig.metrics.some((m) => m.key === key),
          key,
        ).toBe(true);
        expect(parseBudgetMetricKey(key)).toEqual({
          scope: "gg",
          side: t.side,
          code: c.code === t.total ? "total" : c.code.toLowerCase(),
          measure: "share",
        });
      }
    }
    expect(budgetMetricKey("gg", COFOG, "TOTAL")).toBe("budget.gg.expenditure.total");
  });
});

describe("South Ossetia's 2023 budget, from its own laws", () => {
  const executed = document("rso-state-2023-executed");
  const enacted = document("rso-state-2023-enacted");

  it("states what came in, line by line, adding up to the law's total", () => {
    expect(executed.revenue.get("TR")).toBeCloseTo(9108338.64705, 4);
    expect(executed.expenditure.get("TOTAL")).toBe(9234425.6);
    expect(executed.balance).toBe(-126087.0);
    // Placed lines roll up: taxes on income (profit, personal income, the special regimes)
    // and the property taxes together are taxes on income and wealth.
    expect(executed.revenue.get("D51REC")).toBeCloseTo(
      341515.51316 + 693966.75359 + 24034.86228,
      4,
    );
    expect(executed.revenue.get("D5REC")).toBeCloseTo(
      executed.revenue.get("D51REC")! + 10283.73369,
      4,
    );
  });

  it("is mostly money received: 81% of revenue, and own revenue covered 18.5% of spending", () => {
    const r = selfReliance(executed, BUDGET_TAXONOMIES)!;
    expect(r.own).toBeCloseTo(1707844.9, 0);
    expect(r.receivedShare).toBeCloseTo(0.8125, 3);
    expect(r.ownCoverage).toBeCloseTo(0.1849, 3);
    expect(r.ownMultipleNeeded!).toBeCloseTo(5.41, 2);
    expect(r.spendingCutNeeded).toBeCloseTo(0.8151, 3);
    expect(r.byGiver.map((g) => g.from.en)).toEqual([
      "Russian Federation",
      "Non-state organisations",
    ]);
  });

  it("allocated by function, with what fits no function said so", () => {
    const b = breakdown(enacted, COFOG);
    expect(b.value).toBeCloseTo(8952405.27, 1);
    expect(b.rows[0]!.code).toBe("GF09"); // education and science, the largest section
    // Transfers to the extra-budgetary funds are not a function: they are the remainder.
    expect(b.rest).toBeCloseTo(128580.01, 1);
    expect(selfReliance(enacted, BUDGET_TAXONOMIES)).toBeNull();
  });
});

describe("budget documents", () => {
  const doc = (lines: unknown[], totals: object) =>
    budgetDocumentSchema.parse({
      key: "x",
      holder: { scheme: "wikidata", value: "Q1" },
      scope: "state",
      year: 2023,
      basis: "executed",
      currency: "EUR",
      unit: 1,
      lang: "en",
      title: "t",
      titleTranslation: { en: "t" },
      act: null,
      totals,
      lines,
      placement: { en: "p" },
      evidence: [{ publisher: "p", url: "https://example.org", read: "2026-11-10" }],
    });

  it("refuses lines that do not reach the stated total, an unknown category, or money from no one", () => {
    const problems = documentProblems(
      doc(
        [
          {
            side: "revenue",
            code: "1",
            label: { en: "a" },
            amount: 50,
            category: "D51REC",
            origin: "own",
          },
          {
            side: "revenue",
            code: "2",
            label: { en: "b" },
            amount: 30,
            category: "NOPE",
            origin: "received",
          },
        ],
        { revenue: 100 },
      ),
      BUDGET_TAXONOMIES,
    ).join("\n");
    expect(problems).toMatch(/add up to 80, not the stated 100/);
    expect(problems).toMatch(/placed in NOPE/);
    expect(problems).toMatch(/received from no one/);
  });

  it("every document in config is sound and names a holder with a page", () => {
    for (const d of BUDGET_DOCUMENTS) {
      expect(documentProblems(d, BUDGET_TAXONOMIES), d.key).toEqual([]);
      expect(regionOfHolder(d.holder), d.key).toBeDefined();
    }
  });
});

describe("budgets from imported facts", () => {
  const ch = { scheme: "iso_3166_1", value: "CH" };
  const row = (metric: string, year: number, value: number) => ({
    holder: ch,
    metric,
    year,
    value,
    sourceKey: "eurostat-gov-ch",
    url: null,
    retrievedAt: "2026-11-10",
  });
  const budgets = budgetsFromFacts([
    row("budget.gg.expenditure.total", 2023, 0.322),
    row("budget.gg.expenditure.gf07", 2023, 0.022),
    row("budget.gg.expenditure.gf0701", 2023, 0),
    row("budget.gg.expenditure.gf0702", 2023, 0),
    row("budget.gg.revenue.total", 2023, 0.33),
    row("budget.gg.balance", 2023, 0.008),
    row("budget.gg.expenditure.total", 2022, 0.315),
    row("economy.government.expenditure", 2023, 0.3),
  ]);

  it("gathers one budget per year, every figure on its taxonomy's code", () => {
    expect(budgets.map((b) => b.year).sort()).toEqual([2022, 2023]);
    const b2023 = budgets.find((b) => b.year === 2023)!;
    expect(b2023.measure).toEqual({ kind: "share_of_gdp", precision: 0.001 });
    expect(b2023.expenditure.get("TOTAL")).toBe(0.322);
    expect(b2023.expenditure.get("GF07")).toBe(0.022);
    expect(b2023.revenue.get("TR")).toBe(0.33);
    expect(b2023.balance).toBe(0.008);
  });

  it("says when the publisher gives a division but no breakdown of it", () => {
    const b2023 = budgets.find((b) => b.year === 2023)!;
    expect(breakdown(b2023, COFOG, "GF07").noBreakdown).toBe(true);
  });

  it("reads a category over the years, and finds the latest budget that states it", () => {
    expect(history(budgets, "expenditure", "TOTAL")).toEqual([
      { year: 2022, value: 0.315 },
      { year: 2023, value: 0.322 },
    ]);
    expect(latestWith(budgets, "revenue", "TR")?.year).toBe(2023);
  });
});

describe("holders", () => {
  it("a country is held by its ISO code, a place without one by the identifier the world list names", () => {
    const ch = WORLD.find((r) => r.slug === "switzerland")!;
    expect(holderOfRegion(ch)).toEqual({ scheme: "iso_3166_1", value: "CH" });
    const so = WORLD.find((r) => r.slug === "south-ossetia")!;
    expect(holderOfRegion(so)).toEqual({ scheme: "wikidata", value: "Q23427" });
    expect(regionOfHolder({ scheme: "wikidata", value: "Q23427" })?.slug).toBe("south-ossetia");
  });
});

// A budget is the same shape whichever way it was read.
const _shape: Budget = document("rso-state-2023-executed");
void _shape;

describe("which budget a page shows", () => {
  const ge = { scheme: "iso_3166_1", value: "DE" };
  const year = (y: number, spending: boolean): Budget => ({
    holder: ge,
    scope: "gg",
    year: y,
    basis: "executed",
    measure: { kind: "share_of_gdp", precision: 0.001 },
    revenue: new Map([["TR", 0.46]]),
    expenditure: spending
      ? new Map([
          ["TOTAL", 0.49],
          ["GF10", 0.2],
        ])
      : new Map(),
    balance: -0.03,
    gdp: null,
    lines: [],
    sources: [],
  });
  const budgets = [year(2025, false), year(2024, true), year(2023, true)];

  it("unasked, the newest year that says what was spent; asked, the year asked", () => {
    expect(pickBudget(budgets, "TOTAL")?.year).toBe(2024);
    expect(pickBudget(budgets, "TOTAL", 2025)?.year).toBe(2025);
    expect(pickBudget(budgets, "TOTAL", 1990)?.year).toBe(2024);
  });

  it("the page's sections and the index's rows show the same year", () => {
    const [section] = budgetSections(budgets, DISPLAY);
    expect(section?.budget.year).toBe(2024);
    expect(section?.years).toEqual([2025, 2024, 2023]);
    expect(section?.history.spending.map((p) => p.year)).toEqual([2023, 2024]);
    const [row] = budgetIndexRows(budgets, DISPLAY);
    expect(row).toMatchObject({ slug: "germany", year: 2024, spending: "49%", balance: "-3%" });
    expect(row?.largest).toMatch(/^Social protection · 41%$/);
  });

  it("orders a holder's sections by scope, outturn before allocation", () => {
    const so = budgetSections(
      [document("rso-state-2023-enacted"), document("rso-state-2023-executed")],
      DISPLAY,
    );
    expect(so.map((s) => [s.scope.key, s.basis])).toEqual([
      ["state", "executed"],
      ["state", "enacted"],
    ]);
    expect(so[0]?.reliance?.receivedShare).toBeCloseTo(0.8125, 3);
  });
});

describe("one currency for the reader", () => {
  const ch = { scheme: "iso_3166_1", value: "DE" };
  const row = (metric: string, value: number) => ({
    holder: ch,
    metric,
    year: 2023,
    value,
    sourceKey: "eurostat-gov-de",
    url: null,
    retrievedAt: "2026-11-10",
  });
  const [de] = budgetsFromFacts([
    row("budget.gg.expenditure.total", 0.481),
    row("budget.gg.expenditure.total.meur", 2_000_000),
    row("budget.gg.expenditure.gf10.meur", 800_000),
    row("budget.gg.revenue.total.meur", 1_900_000),
    row("budget.gg.balance.meur", -100_000),
  ]);

  it("a budget held in million euro is in money, and knows its GDP from a total held both ways", () => {
    expect(de?.measure).toEqual({ kind: "money", currency: "EUR", unit: 1_000_000 });
    expect(de?.expenditure.get("GF10")).toBe(800_000);
    expect(de?.balance).toBe(-100_000);
    expect(de?.gdp).toBeCloseTo(2_000_000 / 0.481, 3);
    expect(ofGdp(2_000_000, de!)).toBeCloseTo(0.481, 6);
  });

  it("shows money in the reader's currency at the budget year's rate, and says from what", () => {
    const chf = 2_000_000e6 * RATES.rates.CHF!["2023"]!.perBase;
    expect(formatBudgetValue(2_000_000, de!, DISPLAY)).toBe(
      new Intl.NumberFormat("en", {
        style: "currency",
        currency: "CHF",
        notation: "compact",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(chf),
    );
    expect(conversionOf(de!, DISPLAY)).toMatchObject({ from: "EUR", to: "CHF", converted: true });
    expect(conversionOf(de!, { ...DISPLAY, currency: "EUR" })).toBeNull();
  });

  it("South Ossetia's roubles reach the reader in francs, at 2023's rates", () => {
    const so = document("rso-state-2023-executed");
    const c = conversionOf(so, DISPLAY);
    expect(c).toMatchObject({ from: "RUB", to: "CHF", year: 2023, converted: true });
    expect(c?.sources.sort()).toEqual(["cbr-official", "eurostat-ert"]);
  });

  it("keys name their measure, and the catalog holds every amount beside its share", () => {
    expect(parseBudgetMetricKey("budget.gg.expenditure.gf07.meur")).toEqual({
      scope: "gg",
      side: "expenditure",
      code: "gf07",
      measure: "meur",
    });
    expect(parseBudgetMetricKey("budget.gg.balance")).toMatchObject({
      side: null,
      measure: "share",
    });
    for (const c of COFOG.categories) {
      const key = budgetMetricKey("gg", COFOG, c.code, "meur");
      expect(
        placesConfig.metrics.some((m) => m.key === key && !m.statistic),
        key,
      ).toBe(true);
    }
  });

  it("history over thirty years is drawn in shares of GDP when every year knows its GDP", () => {
    const year = (y: number, gdp: number | null): Budget => ({
      ...de!,
      year: y,
      gdp,
    });
    const [s] = budgetSections([year(2022, 4e6), year(2023, 4e6)], DISPLAY);
    expect(s?.history.unit).toEqual({ kind: "share_of_gdp" });
    expect(s?.history.spending[0]?.value).toBeCloseTo(0.5, 6);
    const [m] = budgetSections([year(2022, null), year(2023, null)], DISPLAY);
    expect(m?.history.unit).toEqual({ kind: "money", currency: "CHF" });
  });
});

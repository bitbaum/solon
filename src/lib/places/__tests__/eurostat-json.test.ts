import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { placesConfig } from "@/lib/config/places";
import {
  cellsOf,
  eurostatJsonAdapter,
  eurostatUrl,
  qualityOfEurostatFlag,
} from "../adapters/eurostat-json";
import type { MapContext } from "../adapters/types";
import { EUROSTAT_KEY } from "@/lib/config/places/world";

const fixture = (name: string) =>
  JSON.parse(readFileSync(join(__dirname, "fixtures", "eurostat", name), "utf8"));

const pack = placesConfig.packs.find((p) => p.key === "switzerland")!;
const source = placesConfig.sources.find((s) => s.key === EUROSTAT_KEY)!;

type Options = Parameters<NonNullable<typeof eurostatJsonAdapter.map>>[1]["options"];

function run(name: string | object, options: Options) {
  const skipped: string[] = [];
  const reasons: string[] = [];
  const context = {
    source,
    pack,
    options,
    retrieval: { url: null, validFrom: null },
    skip: (row: string, reason: string) => {
      skipped.push(row);
      reasons.push(reason);
    },
  } as MapContext<Options>;
  const cube = typeof name === "string" ? fixture(name) : name;
  const parsed = eurostatJsonAdapter.schema.parse(cube);
  return { batch: eurostatJsonAdapter.map(parsed, context), skipped, reasons };
}

/**
 * Switzerland's cube with Greece (EL) beside it: Greece holds the total only, at twice
 * Switzerland's value, so a cell read onto the wrong country shows.
 */
function withGreece() {
  const cube = fixture("gov_10a_exp-ch.json");
  const ids: string[] = cube.id;
  const sizes: number[] = cube.size;
  const at = (dim: string) => ids.indexOf(dim);
  const decode = (position: number) => {
    const out: number[] = [];
    for (let d = ids.length - 1; d >= 0; d--) {
      out[d] = position % sizes[d]!;
      position = Math.floor(position / sizes[d]!);
    }
    return out;
  };
  const wider = sizes.map((n, d) => (d === at("geo") ? 2 : n));
  const encode = (indices: number[]) => indices.reduce((p, i, d) => p * wider[d]! + i, 0);
  const values: Record<string, number> = {};
  for (const [key, value] of Object.entries(cube.value as Record<string, number>)) {
    const indices = decode(Number(key));
    values[String(encode(indices))] = value;
    if (indices[at("cofog99")] === 0) {
      values[String(encode(indices.map((i, d) => (d === at("geo") ? 1 : i))))] = value * 2;
    }
  }
  cube.size = wider;
  cube.value = values;
  cube.dimension.geo.category.index = { CH: 0, EL: 1 };
  cube.dimension.geo.category.label = { CH: "Switzerland", EL: "Greece" };
  return cube;
}

const CH: Options = {
  place: { scheme: "iso_3166_1", value: "CH" },
  geo: "CH",
  fromYear: 2021,
  requests: [
    {
      dataset: "gov_10a_exp",
      dimension: "cofog99",
      filters: { unit: "PC_GDP", sector: "S13", na_item: "TE" },
      series: [
        { code: "TOTAL", metric: "budget.gg.expenditure.total", divideBy: 100 },
        { code: "GF07", metric: "budget.gg.expenditure.gf07", divideBy: 100 },
        { code: "GF0701", metric: "budget.gg.expenditure.gf0701", divideBy: 100 },
      ],
    },
  ],
};

describe("Eurostat JSON-stat", () => {
  it("reads every cell back to its codes, last dimension fastest", () => {
    const cells = cellsOf(eurostatJsonAdapter.schema.parse(fixture("gov_10a_exp-ch.json")));
    const total2021 = cells.find((c) => c.codes.cofog99 === "TOTAL" && c.codes.time === "2021");
    expect(total2021?.value).toBe(34.7);
    const health2022 = cells.find((c) => c.codes.cofog99 === "GF07" && c.codes.time === "2022");
    expect(health2022?.value).toBe(2.2);
    expect(new Set(cells.map((c) => c.codes.geo))).toEqual(new Set(["CH"]));
  });

  it("makes facts in ratios of GDP, one per series and year, and reports the years with no figure", () => {
    const { batch, skipped } = run("gov_10a_exp-ch.json", CH);
    const total = batch.facts!.filter((f) => f.metricKey === "budget.gg.expenditure.total");
    expect(total.map((f) => f.validFrom)).toEqual([
      "2021-01-01",
      "2022-01-01",
      "2023-01-01",
      "2024-01-01",
    ]);
    [0.347, 0.315, 0.322, 0.325].forEach((v, i) => expect(total[i]!.value).toBeCloseTo(v, 9));
    expect(total.every((f) => f.validTo === `${Number(f.validFrom.slice(0, 4)) + 1}-01-01`)).toBe(
      true,
    );
    // 2025 is in the cube's time dimension but holds no figure for these series yet.
    expect(skipped).toContain("gov_10a_exp TOTAL 2025");
    expect(skipped).toContain("gov_10a_exp GF07 2025");
  });

  it("names Greece by Eurostat's code and reads a negative balance as one", () => {
    const { batch } = run("gov_10a_main-el.json", {
      place: { scheme: "iso_3166_1", value: "GR" },
      geo: "EL",
      fromYear: 2023,
      requests: [
        {
          dataset: "gov_10a_main",
          dimension: "na_item",
          filters: { unit: "PC_GDP", sector: "S13" },
          series: [
            { code: "TR", metric: "budget.gg.revenue.total", divideBy: 100 },
            { code: "B9", metric: "budget.gg.balance", divideBy: 100 },
            { code: "D5REC", metric: "budget.gg.revenue.d5rec", divideBy: 100 },
          ],
        },
      ],
    });
    const balance = batch.facts!.find(
      (f) => f.metricKey === "budget.gg.balance" && f.validFrom === "2023-01-01",
    );
    expect(balance?.value).toBeCloseTo(-0.015, 6);
    expect(batch.facts!.every((f) => f.jurisdiction.value === "GR")).toBe(true);
  });

  it("refuses a cube for another country, or a filter the source did not ask for", () => {
    expect(() =>
      run("gov_10a_exp-ch.json", {
        ...CH,
        geo: undefined,
        place: undefined,
        geos: [{ code: "AT", place: { scheme: "iso_3166_1", value: "AT" } }],
      }),
    ).toThrow(/CH was not asked for/);
    const wrongUnit = {
      ...CH,
      requests: [{ ...CH.requests[0]!, filters: { ...CH.requests[0]!.filters, unit: "MIO_EUR" } }],
    };
    expect(() => run("gov_10a_exp-ch.json", wrongUnit)).toThrow(/not in the source's options/);
  });

  it("answers the request whose filters the cube holds, when a dataset is asked for in two units", () => {
    const meur = { ...CH.requests[0]!, filters: { ...CH.requests[0]!.filters, unit: "MIO_EUR" } };
    const both = {
      ...CH,
      requests: [
        { ...meur, series: meur.series.map((s) => ({ ...s, metric: `${s.metric}.meur` })) },
        CH.requests[0]!,
      ],
    };
    const { batch } = run("gov_10a_exp-ch.json", both);
    expect(batch.facts!.every((f) => !f.metricKey.endsWith(".meur"))).toBe(true);
  });

  it("reads many countries from one cube, each onto its own place", () => {
    const many: Options = {
      ...CH,
      geo: undefined,
      place: undefined,
      geos: [
        { code: "CH", place: { scheme: "iso_3166_1", value: "CH" } },
        { code: "EL", place: { scheme: "iso_3166_1", value: "GR" } },
      ],
    };
    const { batch, skipped, reasons } = run(withGreece(), many);
    const total = (country: string, year: string) =>
      batch.facts!.find(
        (f) =>
          f.jurisdiction.value === country &&
          f.metricKey === "budget.gg.expenditure.total" &&
          f.validFrom === `${year}-01-01`,
      )!.value as number;
    expect(total("GR", "2023")).toBeCloseTo(total("CH", "2023") * 2, 10);
    expect(
      batch.facts!.filter((f) => f.jurisdiction.value === "GR").map((f) => f.metricKey),
    ).toEqual(expect.arrayContaining(["budget.gg.expenditure.total"]));
    expect(
      batch.facts!.some(
        (f) => f.jurisdiction.value === "GR" && f.metricKey !== "budget.gg.expenditure.total",
      ),
    ).toBe(false);
    // A line a series, naming the countries it holds no figure for; none for one they all have.
    expect(skipped).toEqual(["gov_10a_exp GF07", "gov_10a_exp GF0701"]);
    expect(reasons[0]).toBe("Eurostat publishes no value from 2021 on for EL");
    const url = new URL(
      eurostatUrl("gov_10a_exp", ["CH", "EL"], 1995, { unit: "PC_GDP" }, "cofog99", ["TOTAL"]),
    );
    expect(url.searchParams.getAll("geo")).toEqual(["CH", "EL"]);
  });

  it("asks for one dataset per request, every series named, from the first year", () => {
    const url = new URL(
      eurostatUrl("gov_10a_exp", "EL", 1995, { unit: "PC_GDP" }, "cofog99", ["TOTAL", "GF07"]),
    );
    expect(url.pathname.endsWith("/gov_10a_exp")).toBe(true);
    expect(url.searchParams.get("geo")).toBe("EL");
    expect(url.searchParams.get("sinceTimePeriod")).toBe("1995");
    expect(url.searchParams.getAll("cofog99")).toEqual(["TOTAL", "GF07"]);
    expect(url.searchParams.has("time")).toBe(false);
  });

  it("reads Eurostat's flags: estimates, provisional and forecast figures say so", () => {
    expect(qualityOfEurostatFlag(undefined)).toBe("normal");
    expect(qualityOfEurostatFlag("b")).toBe("normal");
    expect(qualityOfEurostatFlag("p")).toBe("provisional");
    expect(qualityOfEurostatFlag("e")).toBe("estimated");
    expect(qualityOfEurostatFlag("bp")).toBe("provisional");
    expect(qualityOfEurostatFlag("f")).toBe("forecast");
  });
});

describe("the Eurostat sources as configured", () => {
  it("read Greece as EL and ask for every category of both taxonomies", () => {
    const options = source.options as Options;
    expect(options.geos).toContainEqual({
      code: "EL",
      place: { scheme: "iso_3166_1", value: "GR" },
    });
    expect(options.geos).toContainEqual({
      code: "CH",
      place: { scheme: "iso_3166_1", value: "CH" },
    });
    const codes = options.requests.flatMap((r) => r.series.map((s) => s.code));
    expect(codes).toContain("TOTAL");
    expect(codes).toContain("GF1009");
    expect(codes).toContain("TR");
    expect(codes).toContain("B9");
    for (const metric of options.requests.flatMap((r) => r.series.map((s) => s.metric))) {
      expect(
        placesConfig.metrics.some((m) => m.key === metric),
        metric,
      ).toBe(true);
    }
  });
});

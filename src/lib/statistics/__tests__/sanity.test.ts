import { describe, expect, it } from "vitest";
import type { PlaceSeries } from "../read";
import { checkScatter, checkSeries, screenSeries } from "../sanity";

const series = (
  name: string,
  values: [number, number][],
  source = "worldbank_indicators",
): PlaceSeries => ({
  jurisdictionId: name,
  code: name,
  name,
  slugPath: null,
  points: values.map(([year, value]) => ({ year, value, quality: "normal" as const })),
  source: { key: source, url: null, retrievedAt: "2026-11-09" },
});
const run = (from: number, to: number, f: (y: number) => number): [number, number][] =>
  Array.from({ length: to - from + 1 }, (_, i) => [from + i, f(from + i)]);

describe("screening what cannot be real", () => {
  it("leaves out a figure outside the plausible band and a non-number, and says which", () => {
    const s = series("A", [
      [2020, 0.4],
      [2021, 41],
      [2022, Number.NaN],
      [2023, 0.45],
    ]);
    const { series: kept, findings } = screenSeries({ min: 0, max: 1 }, [s]);
    expect(kept[0]!.points.map((p) => p.year)).toEqual([2020, 2023]);
    expect(findings.map((f) => [f.kind, f.years, f.severity])).toEqual([
      ["non_finite", [2022], "withheld"],
      ["implausible", [2021], "withheld"],
    ]);
  });

  it("changes nothing when every figure is in the band", () => {
    const s = series(
      "A",
      run(2015, 2020, (y) => y / 5000),
    );
    const out = screenSeries({ min: 0, max: 1 }, [s]);
    expect(out.series[0]).toBe(s);
    expect(out.findings).toEqual([]);
  });
});

describe("checks on places side by side", () => {
  it("warns when the places are read at dates more than two years apart, naming the oldest", () => {
    const f = checkSeries([
      series(
        "New",
        run(2015, 2024, () => 1),
      ).points.length
        ? series(
            "New",
            run(2015, 2024, (y) => y),
          )
        : series("x", []),
      series(
        "Old",
        run(2008, 2018, (y) => y),
      ),
    ]);
    const spread = f.find((x) => x.kind === "year_spread")!;
    expect(spread.places).toEqual(["Old"]);
    expect(spread.detail.spread).toBe(6);
  });

  it("does not warn at two years apart or when the sources agree", () => {
    const f = checkSeries([
      series(
        "A",
        run(2015, 2024, (y) => y),
      ),
      series(
        "B",
        run(2015, 2022, (y) => y + 1),
      ),
      series(
        "C",
        run(2015, 2023, (y) => y + 2),
      ),
    ]);
    expect(f.map((x) => x.kind)).toEqual([]);
  });

  it("flags a trend from two figures, a long identical run and a ranking of two", () => {
    const kinds = checkSeries([
      series(
        "A",
        run(2010, 2011, (y) => y),
      ),
      series(
        "B",
        run(2000, 2012, () => 0.22),
      ),
    ]).map((x) => x.kind);
    expect(kinds).toEqual(
      expect.arrayContaining(["short_series", "constant_series", "few_places"]),
    );
  });

  it("lets a rate fixed by law stay put for years, if the run does not reach the latest year", () => {
    const plateau = series("A", [
      ...run(2000, 2012, () => 0.2),
      ...run(2013, 2020, (y) => 0.2 + (y - 2012) / 100),
    ]);
    expect(
      checkSeries([
        plateau,
        series(
          "B",
          run(2000, 2020, (y) => y),
        ),
        series(
          "C",
          run(2000, 2020, (y) => y * 2),
        ),
      ]),
    ).toEqual([]);
  });

  it("does not call a rate fixed by law stuck, even when it has not moved for years", () => {
    const fixed = ["A", "B", "C"].map((n) =>
      series(
        n,
        run(2005, 2025, () => 0.45),
      ),
    );
    expect(checkSeries(fixed).map((x) => x.kind)).toContain("constant_series");
    expect(checkSeries(fixed, { fixedByLaw: true })).toEqual([]);
  });

  it("is silent on three well-covered places", () => {
    expect(
      checkSeries(
        ["A", "B", "C"].map((n, i) =>
          series(
            n,
            run(2010, 2020, (y) => y * (i + 1)),
          ),
        ),
      ),
    ).toEqual([]);
  });
});

describe("a scatter", () => {
  const dot = (name: string, year: number) => ({ code: name, name, x: 1, y: 2, year });
  it("says four dots show no pattern and that years far apart are not one date", () => {
    const f = checkScatter([dot("A", 2024), dot("B", 2024), dot("C", 2015), dot("D", 2024)]);
    expect(f.map((x) => x.kind)).toEqual(["thin_scatter", "scatter_years"]);
    expect(f[1]!.places).toEqual(["C"]);
  });
  it("accepts five dots of one year", () => {
    expect(checkScatter(["A", "B", "C", "D", "E"].map((n) => dot(n, 2024)))).toEqual([]);
  });
});

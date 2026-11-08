import { describe, expect, it } from "vitest";
import { placesConfig } from "@/lib/config/places";
import { EXAMPLE_AXES } from "@/lib/config/statistics/axes";
import { STATISTIC_RECORDS } from "@/lib/config/statistics/records";
import { scoreAxis, weightsFromQuery, type Axis } from "../axes";
import { placesFromQuery, specQuery } from "../metric-page";
import {
  chartValue,
  findStatistic,
  metricFromSlug,
  metricSlug,
  pickPlaces,
  pickYears,
  seriesPageFor,
  statisticMetrics,
} from "../present";
import type { PlaceSeries } from "../read";
import { defineCuratedRecords } from "../records";
import { citedViewHashes, normalizeSpec, viewHash, type ViewSpec } from "../views";

const series = (code: string, points: [number, number][]): PlaceSeries => ({
  jurisdictionId: `id-${code}`,
  code,
  name: code,
  slugPath: null,
  points: points.map(([year, value]) => ({ year, value })),
  source: { key: "s", url: null, retrievedAt: "2026-11-08" },
});

describe("the statistic catalog", () => {
  it("names every statistic's publisher series and keeps tariffs out", () => {
    const stats = statisticMetrics(placesConfig);
    expect(stats.map((m) => m.key)).toEqual(
      expect.arrayContaining(["tax.income.top_rate", "crime.homicide.rate"]),
    );
    expect(stats.some((m) => m.valueType === "tariff")).toBe(false);
    for (const m of stats) expect(m.statistic!.series.url).toMatch(/^https:\/\//);
  });

  it("gives every statistic a path without a dot, and reads it back", () => {
    for (const m of statisticMetrics(placesConfig)) {
      expect(metricSlug(m.key)).not.toContain(".");
      expect(metricFromSlug(metricSlug(m.key))).toBe(m.key);
    }
  });

  it("shows a ratio in per cent and narrows the World Bank's page to the place", () => {
    const metric = findStatistic(placesConfig, "economy.government.consumption")!;
    expect(chartValue(metric, 0.117415)).toBe(11.74);
    expect(seriesPageFor(metric, "CH")).toBe(
      "https://data.worldbank.org/indicator/NE.CON.GOVT.ZS?locations=CH",
    );
  });
});

describe("choosing places and years", () => {
  const all = [
    series("CH", [
      [2000, 1],
      [2010, 2],
    ]),
    series("EE", [
      [1995, 3],
      [2020, 4],
    ]),
  ];

  it("keeps the places named, every place when none is", () => {
    expect(pickPlaces(all, "EE").map((s) => s.code)).toEqual(["EE"]);
    expect(pickPlaces(all, undefined)).toHaveLength(2);
    expect(placesFromQuery({ p: ["CH", "EE"], places: "LI,bad code" })).toEqual(["CH", "EE", "LI"]);
  });

  it("clamps the years to the data and puts them in order", () => {
    expect(pickYears(all, undefined, undefined)).toEqual({ from: 1995, to: 2020 });
    expect(pickYears(all, "1900", "2015")).toEqual({ from: 1995, to: 2015 });
    expect(pickYears(all, "2015", "2001")).toEqual({ from: 2001, to: 2015 });
  });
});

describe("axes", () => {
  const axis: Axis = {
    key: "test",
    version: 1,
    label: { en: "Test" },
    direction: { en: "Higher: more." },
    author: "A test",
    components: [
      { metric: "a", sign: 1, weight: 1 },
      { metric: "b", sign: -1, weight: 1 },
    ],
  };
  const data = new Map([
    ["a", [series("X", [[2020, 10]]), series("Y", [[2020, 20]])]],
    ["b", [series("X", [[2020, 5]]), series("Y", [[2020, 1]]), series("Z", [[2020, 3]])]],
    ["c", [series("W", [[2020, 1]])]],
  ]);

  it("places each among the places shown, turned by sign, and never names a place it has nothing on", () => {
    const scores = new Map(scoreAxis(axis, data).map((s) => [s.code, s]));
    expect(scores.get("X")!.score).toBe(0);
    expect(scores.get("Y")!.score).toBe(100);
    expect(scores.get("Z")!.score).toBe(50); // b only: half way
    expect(scores.has("W")).toBe(false);
  });

  it("follows the reader's weights; a weight of zero leaves a component out", () => {
    const scores = new Map(scoreAxis(axis, data, { b: 0 }).map((s) => [s.code, s]));
    expect(scores.get("X")!.score).toBe(0);
    expect(scores.get("Z")!.score).toBeNull();
    expect(weightsFromQuery(axis, { "w.a": "3", "w.b": "99", "w.z": "1" })).toEqual({
      a: 3,
      b: 10,
    });
  });

  it("ships only examples whose components are statistics", () => {
    for (const a of EXAMPLE_AXES) {
      expect(a.author).toMatch(/example/i);
      for (const c of a.components) expect(findStatistic(placesConfig, c.metric)).toBeDefined();
    }
  });
});

describe("saved views", () => {
  const spec: ViewSpec = {
    version: 1,
    metric: "tax.income.top_rate",
    places: ["EE", "CH", "EE"],
    from: 2000,
    to: null,
    axis: null,
  };

  it("has one address whatever order the places came in", () => {
    expect(viewHash(spec)).toBe(viewHash({ ...spec, places: ["CH", "EE"] }));
    expect(viewHash(spec)).not.toBe(viewHash({ ...spec, from: 2001 }));
    expect(normalizeSpec(spec).places).toEqual(["CH", "EE"]);
    expect(specQuery(normalizeSpec(spec))).toBe("?p=CH&p=EE&from=2000");
  });

  it("finds the views a proposal's text links, once each", () => {
    const h = "a".repeat(64);
    const text = `See https://solon.orangecat.ch/statistics/view/${h} and /de/statistics/view/${h}.`;
    expect(citedViewHashes(text)).toEqual([h]);
    expect(citedViewHashes("/statistics/view/abc")).toEqual([]);
  });
});

describe("the curated records", () => {
  it("each name a metric in the catalog and a page someone read", () => {
    expect(STATISTIC_RECORDS.length).toBeGreaterThan(0);
    for (const r of STATISTIC_RECORDS) {
      expect(r.body.evidence.length).toBeGreaterThan(0);
      if (r.metric) expect(findStatistic(placesConfig, r.metric), r.key).toBeDefined();
    }
  });

  it("refuses an unknown metric, authority or a rate without its metric", () => {
    const known = {
      metrics: new Set(["m"]),
      authorities: new Set(["ch"]),
      schemes: new Set(["s"]),
    };
    const evidence = [{ publisher: "P", url: "https://example.org", read: "2026-11-08" }];
    const act = { authority: "xx", scheme: "s", value: "1" };
    expect(() =>
      defineCuratedRecords(
        [
          {
            key: "law_link:a",
            kind: "law_link",
            metric: "nope",
            body: { place: null, act, provision: null, why: { en: "w" }, evidence },
          },
          {
            key: "enforcement:b",
            kind: "enforcement",
            metric: null,
            body: {
              place: { scheme: "iso_3166_1", value: "CH" },
              act: { ...act, authority: "ch" },
              provision: null,
              from: "2020-01-01",
              to: null,
              form: "rate",
              summary: { en: "s" },
              statedBy: "S",
              evidence,
            },
          },
        ],
        known,
      ),
    ).toThrow(/not in the catalog[\s\S]*unknown authority "xx"[\s\S]*a rate names the metric/);
  });
});

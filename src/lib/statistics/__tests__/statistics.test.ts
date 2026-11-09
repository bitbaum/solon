import { describe, expect, it } from "vitest";
import { placesConfig } from "@/lib/config/places";
import { EXAMPLE_AXES } from "@/lib/config/statistics/axes";
import { STATISTIC_RECORDS } from "@/lib/config/statistics/records";
import { DIMENSIONS } from "@/lib/config/statistics/dimensions";
import { numericOf } from "@/lib/config/statistics/world";
import { defineDimensions, measuresOf, type DimensionInput } from "../dimensions";
import { filterEvents, pivotYear } from "../event-page";
import { scoreAxis, weightsFromQuery, type Axis } from "../axes";
import { qualityOfObsStatus } from "@/lib/places/adapters/oecd-sdmx";
import { assessSeries } from "../quality";
import { customAxisFromQuery, parallelData, scatterPoints } from "../compare";
import { placesFromQuery, specQuery } from "../metric-page";
import {
  chartValue,
  compareAround,
  eventPath,
  findStatistic,
  metricFromSlug,
  metricSlug,
  pickPlaces,
  pickYears,
  seriesPageFor,
  splitAt,
  statisticMetrics,
  windowAround,
} from "../present";
import type { PlaceSeries } from "../read";
import { defineCuratedRecords } from "../records";
import { citedViewHashes, normalizeSpec, viewHash, type ViewSpec } from "../views";

const series = (code: string, points: [number, number][]): PlaceSeries => ({
  jurisdictionId: `id-${code}`,
  code,
  name: code,
  slugPath: null,
  points: points.map(([year, value]) => ({ year, value, quality: "normal" as const })),
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

describe("two measures against each other", () => {
  const s = (code: string, id: string, points: [number, number][]) => ({
    ...series(code, points),
    jurisdictionId: id,
  });

  it("pairs each place's values at the latest year it has both, never across years", () => {
    const xs = [
      s("CH", "a", [
        [2020, 1],
        [2021, 2],
        [2022, 3],
      ]),
      s("EE", "b", [[2020, 5]]),
    ];
    const ys = [
      s("CH", "a", [
        [2020, 10],
        [2021, 20],
      ]),
      s("EE", "b", [[2021, 99]]),
      s("US", "c", [[2020, 1]]),
    ];
    expect(scatterPoints(xs, ys)).toEqual([{ code: "CH", name: "CH", x: 2, y: 20, year: 2021 }]);
  });

  it("scales each column between its own lowest and highest value, and leaves gaps as gaps", () => {
    const axis: Axis = {
      key: "t",
      version: 1,
      label: { en: "T" },
      direction: { en: "H" },
      author: "test",
      components: [
        { metric: "a", sign: 1, weight: 1 },
        { metric: "b", sign: -1, weight: 1 },
      ],
    };
    const scores = [
      {
        jurisdictionId: "1",
        code: "X",
        name: "X",
        score: 0,
        parts: [
          { metric: "a", value: 10, year: 1 },
          { metric: "b", value: null, year: null },
        ],
      },
      {
        jurisdictionId: "2",
        code: "Y",
        name: "Y",
        score: 1,
        parts: [
          { metric: "a", value: 30, year: 1 },
          { metric: "b", value: 4, year: 1 },
        ],
      },
    ];
    const { columns, lines } = parallelData(axis, scores);
    expect(columns).toEqual([
      { metric: "a", min: 10, max: 30 },
      { metric: "b", min: 4, max: 4 },
    ]);
    expect(lines[0]!.at).toEqual([0, null]);
    expect(lines[1]!.at).toEqual([1, 0.5]);
  });

  it("builds a reader's axis from the link, keeping only statistics and clamping weights", () => {
    const stats = new Set(["a", "b"]);
    const axis = customAxisFromQuery(
      { use: ["a", "b", "nope"], "w.a": "99", "d.b": "-1", "w.b": "x" },
      stats,
      { en: "Yours" },
      { en: "Higher." },
      "You",
    )!;
    expect(axis.components).toEqual([
      { metric: "a", sign: 1, weight: 10 },
      { metric: "b", sign: -1, weight: 1 },
    ]);
    expect(customAxisFromQuery({}, stats, { en: "" }, { en: "" }, "")).toBeNull();
  });
});

describe("the curated law events", () => {
  const events = STATISTIC_RECORDS.flatMap((r) => (r.kind === "event" ? [r] : []));

  it("each has its own page address, a decision date and a source on every line", () => {
    expect(events.length).toBeGreaterThanOrEqual(5);
    const slugs = events.map((e) => e.body.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const e of events) {
      const b = e.body;
      expect(b.evidence.length, e.key).toBeGreaterThan(0);
      for (const line of [...b.process, ...b.votes, ...b.actors, ...b.reported]) {
        expect(line.evidence.length, `${e.key}: a line without a source`).toBeGreaterThan(0);
      }
      for (const m of b.series)
        expect(findStatistic(placesConfig, m), `${e.key} ${m}`).toBeDefined();
      if (b.effective) expect(b.effective >= b.on, e.key).toBe(true);
    }
  });

  it("keeps what people claimed apart from what happened", () => {
    const kennesaw = events.find((e) => e.body.slug === "us-kennesaw-gun-ordinance-1982")!;
    const kinds = kennesaw.body.reported.map((r) => r.kind);
    expect(kinds).toEqual(expect.arrayContaining(["claim", "critique", "context"]));
    // A burglary figure is a reported claim with its author, never a series Solon holds.
    expect(kennesaw.body.series).toEqual([]);
    expect(kennesaw.body.caveat).toBeDefined();
  });

  it("states a vote's counts the way its record does: breakdowns add up to the totals", () => {
    const estonia = events.find((e) => e.body.slug === "ee-income-tax-22-percent-2023")!;
    const vote = estonia.body.votes[0]!;
    expect(vote.for! + vote.against! + vote.absent!).toBe(101);
    expect(vote.breakdown.reduce((n, g) => n + g.for, 0)).toBe(vote.for);
    expect(vote.breakdown.reduce((n, g) => n + g.absent, 0)).toBe(vote.absent);
  });

  it("leaves no event in a language its place's reader cannot find an English line for", () => {
    for (const e of events) {
      expect(e.body.title.en, e.key).toBeTruthy();
      expect(e.body.summary.en, e.key).toBeTruthy();
    }
  });
});

describe("the numbers around a change", () => {
  const data = [
    series("EE", [
      [2023, 0.2],
      [2024, 0.2],
      [2025, 0.22],
      [2026, 0.22],
    ]),
    series("CH", [
      [2023, 0.41],
      [2024, 0.41],
      [2025, 0.41],
    ]),
  ];

  it("states what each place's number did across the year a change applies, focal place first", () => {
    const rows = compareAround(data, "EE", 2025, 1);
    expect(rows.map((r) => r.code)).toEqual(["EE", "CH"]);
    expect(rows[0]).toMatchObject({ focal: true, change: expect.closeTo(0.02, 10) });
    expect(rows[0]!.before).toEqual({ year: 2024, value: 0.2 });
    expect(rows[0]!.later).toEqual({ year: 2026, value: 0.22 });
    expect(rows[1]).toMatchObject({ focal: false, change: 0, later: null });
  });

  it("cuts a line at the change, the two parts sharing the last year before so it stays joined", () => {
    const cut = splitAt(data[0]!.points, 2025);
    expect(cut.before.map((p) => p.year)).toEqual([2023, 2024]);
    expect(cut.from.map((p) => p.year)).toEqual([2024, 2025, 2026]);
    expect(splitAt([{ year: 2025, value: 1 }], 2025).from).toEqual([{ year: 2025, value: 1 }]);
  });

  it("frames the years either side of the change within what the series hold", () => {
    expect(windowAround(data, 2025, 8)).toEqual({ from: 2023, to: 2026 });
    expect(windowAround([], 2025, 3)).toEqual({ from: 2022, to: 2028 });
  });

  it("opens an event by its slug and filters the list by place and kind", () => {
    expect(eventPath("x-y")).toBe("/statistics/event/x-y");
    const rows = [
      { placeCode: "EE", body: { category: "statute" } },
      { placeCode: "CH", body: { category: "referendum" } },
    ] as never;
    expect(filterEvents(rows, { place: "CH" })).toHaveLength(1);
    expect(filterEvents(rows, { kind: "statute", place: "EE" })).toHaveLength(1);
    expect(filterEvents(rows, {})).toHaveLength(2);
    expect(pivotYear({ on: "2023-06-19", effective: "2025-01-01" })).toBe(2025);
    expect(pivotYear({ on: "2011-02-13" })).toBe(2011);
  });
});

describe("the world map", () => {
  it("has an outline code for every country a pack holds, so none is left off the map", () => {
    for (const pack of placesConfig.packs.filter((p) => p.region)) {
      expect(numericOf(pack.region!), `${pack.key} (${pack.region})`).toMatch(/^\d{3}$/);
    }
  });
});

describe("the metric catalog says what each number covers", () => {
  it("gives every live statistic a scope and never charts a central-government-only series", () => {
    for (const m of statisticMetrics(placesConfig)) {
      expect(m.statistic!.scope?.en, m.key).toBeTruthy();
    }
    const retired = placesConfig.metrics.filter((m) => m.retired).map((m) => m.key);
    expect(statisticMetrics(placesConfig).some((m) => retired.includes(m.key))).toBe(false);
  });
});

describe("a publisher's reliability flag", () => {
  it("reads SDMX observation statuses as qualities, keeping everything else ordinary", () => {
    expect(qualityOfObsStatus("A")).toBe("normal");
    expect(qualityOfObsStatus("P")).toBe("provisional");
    expect(qualityOfObsStatus("E")).toBe("estimated");
    expect(qualityOfObsStatus("i")).toBe("estimated");
    expect(qualityOfObsStatus("F")).toBe("forecast");
    // A break in series or a different definition annotates the figure; it does not doubt it.
    expect(qualityOfObsStatus("B")).toBe("normal");
    expect(qualityOfObsStatus(undefined)).toBe("normal");
  });
});

describe("is a series fit to be read", () => {
  const q = (points: [number, number, ("normal" | "provisional")?][]) =>
    assessSeries(
      {
        ...series("X", []),
        points: points.map(([year, value, quality]) => ({
          year,
          value,
          quality: quality ?? "normal",
        })),
      },
      2026,
    );
  const wobble = (from: number, n: number): [number, number][] =>
    Array.from({ length: n }, (_, i) => [from + i, 10 + (i % 2) * 0.1]);

  it("names the missing years between a series' first and last", () => {
    const r = q([...wobble(2010, 4), [2016, 10], [2017, 10.1], [2018, 10]]);
    expect(r.notes.find((n) => n.kind === "gap")!.years).toEqual([2014, 2015]);
  });

  it("flags a step far larger than the series' usual one, and leaves a steady series alone", () => {
    const stepped = q([...wobble(2010, 8), [2018, 25], [2019, 25.1]]);
    expect(stepped.notes.find((n) => n.kind === "jump")!.years).toEqual([2018]);
    expect(q(wobble(2010, 12)).notes.filter((n) => n.kind === "jump")).toEqual([]);
  });

  it("calls a series stale when its last year is long past, and short when it has too few points to judge", () => {
    expect(q(wobble(2005, 8)).notes.some((n) => n.kind === "stale")).toBe(true);
    expect(q(wobble(2020, 3)).notes.some((n) => n.kind === "short")).toBe(true);
  });

  it("lists the years the publisher calls provisional", () => {
    const r = q([...wobble(2018, 7), [2025, 10, "provisional"]]);
    expect(r.notes.find((n) => n.kind === "provisional")!.years).toEqual([2025]);
  });
});

describe("dimensions: what the law says, what happens in practice, what results", () => {
  const live = new Set(["a", "b", "c"]);
  const dim = (layers: DimensionInput["layers"]) => ({
    key: "d",
    version: 1,
    label: { en: "D" },
    summary: { en: "S" },
    author: "test",
    layers,
  });
  const empty = { metrics: [], wanted: { en: "what would fill it" } };

  it("ships dimensions whose measures are live statistics, each on one layer only", () => {
    expect(DIMENSIONS.length).toBeGreaterThan(0);
    const seen = new Set<string>();
    for (const d of DIMENSIONS) {
      for (const { metric } of measuresOf(d)) {
        expect(findStatistic(placesConfig, metric), metric).toBeDefined();
        expect(seen.has(metric), `${metric} on two layers`).toBe(false);
        seen.add(metric);
      }
    }
  });

  it("states a layer's gap in the data: an empty layer must say what would fill it", () => {
    expect(() =>
      defineDimensions(
        [dim({ de_jure: { metrics: ["a"] }, de_facto: { metrics: [] }, outcome: empty })],
        live,
      ),
    ).toThrow(/de_facto layer has no series and does not say what would fill it/);
    expect(() =>
      defineDimensions(
        [dim({ de_jure: { metrics: ["a", "zzz"] }, de_facto: empty, outcome: empty })],
        live,
      ),
    ).toThrow(/"zzz" is not a live statistic/);
    expect(() =>
      defineDimensions(
        [dim({ de_jure: { metrics: ["a"] }, de_facto: { metrics: ["a"] }, outcome: empty })],
        live,
      ),
    ).toThrow(/"a" is on two layers/);
  });

  it("lists every measure with its layer, in layer order", () => {
    const [d] = defineDimensions(
      [dim({ de_jure: { metrics: ["a", "b"] }, de_facto: empty, outcome: { metrics: ["c"] } })],
      live,
    );
    expect(measuresOf(d!)).toEqual([
      { metric: "a", layer: "de_jure" },
      { metric: "b", layer: "de_jure" },
      { metric: "c", layer: "outcome" },
    ]);
  });
});

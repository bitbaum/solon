import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { placesConfig } from "@/lib/config/places";
import { switzerlandIncomeTax } from "@/lib/config/places/countries/switzerland";
import { evaluate } from "@/lib/tax-model";
import { ADAPTERS, type Probe } from "../adapters";
import { unzipSync, zipSync } from "fflate";
import { decodeCsvAnyForm, isoFromDottedDate, parseCsv } from "../adapters/csv";
import { readShapefile } from "../adapters/shapefile";
import { fiscalYearPeriod } from "../adapters/csv-facts";
import { plannedRetrievals } from "../importer/fetch";
import { importBatchSchema, type BatchJurisdiction, type ImportBatch } from "../importer/batch";

const FIXTURES = join(__dirname, "fixtures", "switzerland");
const fixture = (name: string) => new Uint8Array(readFileSync(join(FIXTURES, name)));

/** A retrieval of a registered source, through its adapter as a run would. */
function mapSource(
  sourceKey: string,
  bytes: Uint8Array,
  skipped: { row: string; reason: string }[] = [],
  retrieval: { url: string | null; validFrom: string | null } = { url: null, validFrom: null },
): ImportBatch {
  const source = placesConfig.sources.find((s) => s.key === sourceKey)!;
  const adapter = ADAPTERS.get(source.adapter)!;
  const decoded = adapter.decode
    ? adapter.decode(bytes)
    : (JSON.parse(new TextDecoder().decode(bytes)) as unknown);
  return importBatchSchema.parse(
    adapter.map(adapter.schema.parse(decoded), {
      source,
      pack: placesConfig.packs.find((p) => p.key === source.packs[0]),
      options: adapter.options?.parse(source.options),
      retrieval,
      skip: (row, reason) => skipped.push({ row, reason }),
    }),
  );
}

const plannedUrls = async (sourceKey: string, today: string, backfill = false) =>
  (await plannedRetrievals(placesConfig, sourceKey, today, { backfill })).map((r) => r.url);

const byRef = (batch: ImportBatch, scheme: string, value: string): BatchJurisdiction => {
  const place = batch.jurisdictions.find((j) => j.ref.scheme === scheme && j.ref.value === value);
  if (!place) {
    throw new Error(`no ${scheme}:${value} in the batch`);
  }
  return place;
};
const parentOf = (batch: ImportBatch, scheme: string, value: string) =>
  batch.relations.find(
    (r) => r.relation === "part_of" && r.from.scheme === scheme && r.from.value === value,
  )?.to;

describe("parseCsv", () => {
  it("reads quoted fields, doubled quotes, line breaks in quotes, CRLF and a BOM", () => {
    const text = '\uFEFFa,b,c\r\n1,"two, too","say ""hi"""\r\n"multi\nline",,x\r\n';
    expect(parseCsv(text)).toEqual([
      { a: "1", b: "two, too", c: 'say "hi"' },
      { a: "multi\nline", b: "", c: "x" },
    ]);
  });

  it("turns a register's dotted date into an ISO date", () => {
    expect(isoFromDottedDate("31.12.2022")).toBe("2022-12-31");
    expect(isoFromDottedDate("")).toBeNull();
    expect(() => isoFromDottedDate("2022-12-31")).toThrow();
  });
});

describe("every registered source", () => {
  it("has options its adapter accepts", () => {
    for (const source of placesConfig.sources) {
      const adapter = ADAPTERS.get(source.adapter);
      expect(adapter, `adapter for ${source.key}`).toBeDefined();
      expect(() => adapter!.options?.parse(source.options), source.key).not.toThrow();
    }
  });
});

describe("the FSO commune register snapshot", () => {
  const y2021 = mapSource("bfs-communes-snapshot", fixture("communes-2021-01-01.csv"));
  const y2026 = mapSource("bfs-communes-snapshot", fixture("communes-2026-09-29.csv"));

  it("fetches today's snapshot on schedule, and one a year since its start to backfill", async () => {
    const today = "https://www.agvchapp.bfs.admin.ch/api/communes/snapshot?date=29-09-2026";
    expect(await plannedUrls("bfs-communes-snapshot", "2026-09-29")).toEqual([today]);
    expect(await plannedUrls("bfs-communes-snapshot", "2026-09-29", true)).toEqual([
      today,
      ...[2021, 2022, 2023, 2024, 2025, 2026].map(
        (year) => `https://www.agvchapp.bfs.admin.ch/api/communes/snapshot?date=01-01-${year}`,
      ),
      today,
    ]);
  });

  it("puts the country at the root, named as the pack names it", () => {
    const root = byRef(y2026, "iso_3166_1", "CH");
    expect(root.levelKey).toBe("nation");
    expect(root.names.find((n) => n.locale === "de")).toMatchObject({
      name: "Schweiz",
      nameType: "self",
    });
    expect(root.names.find((n) => n.locale === "en")?.nameType).toBe("common");
    expect(parentOf(y2026, "bfs_canton", "1")).toEqual({ scheme: "iso_3166_1", value: "CH" });
  });

  it("keys places by their lasting number, at the level the options give", () => {
    expect(byRef(y2026, "bfs_canton", "1").levelKey).toBe("canton");
    expect(byRef(y2026, "bfs_district", "112").levelKey).toBe("district");
    expect(byRef(y2026, "bfs_municipality", "261")).toMatchObject({
      levelKey: "municipality",
      names: [expect.objectContaining({ name: "Zürich", locale: "de", nameType: "self" })],
    });
    expect(parentOf(y2026, "bfs_municipality", "261")).toEqual({
      scheme: "bfs_district",
      value: "112",
    });
  });

  it("looks a parent up within its level: a historical code repeats across levels", () => {
    // Bezirk Horgen and Vionnaz (VS) both carry historical code 10078.
    expect(parentOf(y2026, "bfs_municipality", "6158")).toEqual({
      scheme: "bfs_district",
      value: "2308",
    });
    expect(parentOf(y2026, "bfs_municipality", "141")).toEqual({
      scheme: "bfs_district",
      value: "106",
    });
  });

  it("splits a multilingual canton name over the canton's locales", () => {
    const bern = byRef(y2026, "bfs_canton", "2");
    expect(bern.names.map((n) => [n.locale, n.name])).toEqual([
      ["de", "Bern"],
      ["fr", "Berne"],
    ]);
    expect(byRef(y2026, "bfs_municipality", "371").names[0]).toMatchObject({
      name: "Biel/Bienne",
      locale: "de",
    });
  });

  it("keeps the district a canton without districts is registered with", () => {
    expect(parentOf(y2026, "bfs_municipality", "1206")).toEqual({
      scheme: "bfs_district",
      value: "400",
    });
    expect(byRef(y2026, "bfs_district", "400").names.map((n) => n.name)).toEqual([
      "Kanton Uri",
      "Kt. Uri",
    ]);
  });

  it("ends a commune on the day after the last day the register gives", () => {
    expect(byRef(y2021, "bfs_municipality", "21")).toMatchObject({
      validTo: "2023-01-01",
      identifiers: [
        {
          scheme: "bfs_municipality_version",
          value: "11735",
          validFrom: "1872-01-01",
          validTo: "2023-01-01",
        },
      ],
    });
  });

  it("keeps a commune's number through a territory exchange", () => {
    expect(byRef(y2021, "bfs_municipality", "62")).toMatchObject({ validTo: "2024-01-01" });
    expect(byRef(y2026, "bfs_municipality", "62")).toMatchObject({
      validTo: null,
      identifiers: [expect.objectContaining({ value: "16656", validFrom: "2024-01-01" })],
    });
  });
});

describe("the FSO commune register mutations", () => {
  const batch = mapSource("bfs-communes-mutations", fixture("mutations-2021-2026.csv"));

  it("records a merger as the new commune succeeding each old one", () => {
    expect(batch.jurisdictions).toEqual([]);
    expect(batch.relations.map((r) => [r.from.value, r.relation, r.to.value, r.validFrom])).toEqual(
      [
        ["291", "succeeds", "21", "2023-01-01"],
        ["291", "succeeds", "32", "2023-01-01"],
        ["291", "succeeds", "30", "2023-01-01"],
      ],
    );
  });

  it("plans one retrieval from the day after the first snapshot", async () => {
    expect(await plannedUrls("bfs-communes-mutations", "2026-09-29")).toEqual([
      "https://www.agvchapp.bfs.admin.ch/api/communes/mutations?includeTerritoryExchange=false&startPeriod=02-01-2021&endPeriod=29-09-2026",
    ]);
  });
});

describe("the City of Zürich's statistical quarters", () => {
  const batch = mapSource("zurich-statistical-quarters", fixture("statistical-quarters.json"));

  const fixtureWithGeometry = (geometry: unknown) => {
    const collection = JSON.parse(
      new TextDecoder().decode(fixture("statistical-quarters.json")),
    ) as {
      type: "FeatureCollection";
      features: {
        type: "Feature";
        geometry: unknown | null;
        properties: Record<string, unknown>;
      }[];
    };
    collection.features = [{ ...collection.features[0]!, geometry }];
    return new TextEncoder().encode(JSON.stringify(collection));
  };

  it("maps each tier of a feature to a place part of the tier above", () => {
    expect(byRef(batch, "zurich_statistical_quarter", "74")).toMatchObject({
      levelKey: "statistical_quarter",
      names: [expect.objectContaining({ name: "Witikon", locale: "de" })],
    });
    expect(parentOf(batch, "zurich_statistical_quarter", "74")).toEqual({
      scheme: "zurich_city_district",
      value: "7",
    });
    expect(parentOf(batch, "zurich_city_district", "7")).toEqual({
      scheme: "bfs_municipality",
      value: "261",
    });
  });

  it("lists a district once, however many quarters it has", () => {
    const districts = batch.jurisdictions.filter((j) => j.levelKey === "city_district");
    expect(districts.map((d) => d.ref.value).sort()).toEqual(["1", "7"]);
    expect(batch.jurisdictions).toHaveLength(7);
  });

  it("accepts checked polygon geometry while keeping area persistence separate", () => {
    const geometry = {
      type: "Polygon",
      coordinates: [
        [
          [8.5, 47.3],
          [8.6, 47.3],
          [8.6, 47.4],
          [8.5, 47.4],
          [8.5, 47.3],
        ],
      ],
    };
    const withGeometry = mapSource("zurich-statistical-quarters", fixtureWithGeometry(geometry));
    expect(withGeometry.jurisdictions).toHaveLength(2);
    expect(parentOf(withGeometry, "zurich_statistical_quarter", "11")).toEqual({
      scheme: "zurich_city_district",
      value: "1",
    });
    expect(withGeometry.areas).toEqual([]);
    expect(withGeometry.geometry).toBeNull();
  });

  it("rejects malformed or out-of-WGS84 source polygons before mapping", () => {
    const geometry = {
      type: "Polygon",
      coordinates: [
        [
          [181, 47.3],
          [181, 47.4],
          [182, 47.4],
          [182, 47.3],
          [181, 47.3],
        ],
      ],
    };
    expect(() => mapSource("zurich-statistical-quarters", fixtureWithGeometry(geometry))).toThrow(
      "feature 0: invalid geometry",
    );
  });
});

describe("the canton of Zürich's municipal multipliers", () => {
  const skipped: { row: string; reason: string }[] = [];
  const batch = mapSource(
    "zurich-municipal-multipliers",
    fixture("multipliers-2020-2026.csv"),
    skipped,
  );
  const multiplier = (commune: string, year: number) =>
    batch.facts.find((f) => f.jurisdiction.value === commune && f.validFrom === `${year}-01-01`);

  it("records each commune's multiplier as a ratio for its fiscal year", () => {
    expect(multiplier("261", 2025)).toEqual({
      jurisdiction: { scheme: "bfs_municipality", value: "261" },
      metricKey: "tax.multiplier",
      variant: null,
      validFrom: "2025-01-01",
      validTo: "2026-01-01",
      value: 1.19,
    });
    expect(multiplier("154", 2026)?.value).toBe(0.73);
    expect(batch.jurisdictions).toEqual([]);
  });

  it("reads no year before the one the options start at", () => {
    expect(multiplier("261", 2020)).toBeUndefined();
    expect(multiplier("261", 2021)).toBeDefined();
  });

  it("leaves out a commune with more than one rate, and says why", () => {
    expect(multiplier("198", 2025)).toBeUndefined();
    expect(multiplier("21", 2022)).toBeUndefined();
    expect(skipped.map((s) => s.row)).toContain("bfs_municipality:198 2025");
    expect(skipped.find((s) => s.row === "bfs_municipality:198 2025")?.reason).toMatch(
      /more than one rate.*STF_O_KIRCHE2 = 110/,
    );
  });

  it("dates a fiscal year half-open, also when it does not start in January", () => {
    expect(fiscalYearPeriod(2025, "04-06")).toEqual({
      validFrom: "2025-04-06",
      validTo: "2026-04-06",
    });
  });
});

describe("swisstopo's postcode directory", () => {
  const SOURCE = "swisstopo-postcode-localities";
  const csv = fixture("postcode-localities-2026-09-30.csv");

  it("reads the zipped, semicolon-separated directory as published, and the plain CSV alike", () => {
    const batch = mapSource(SOURCE, zipSync({ "AMTOVZ_CSV_LV95/AMTOVZ_CSV_LV95.csv": csv }));
    expect(batch.postcodes).toHaveLength(29);
    expect(batch.postcodes.find((p) => p.postcode === "8053")).toEqual({
      postcode: "8053",
      locality: "Zürich",
      place: { scheme: "bfs_municipality", value: "261" },
      share: 1,
      validFrom: "2008-07-01",
      validTo: null,
    });
    expect(mapSource(SOURCE, csv)).toEqual(batch);
  });

  it("reads a locality's share of addresses in percent", () => {
    const text =
      "PLZ4;Ortschaftsname;BFS-Nr;Adressenanteil;Validity\r\n8051;Zürich;191;0.412 %;2008-07-01\r\n";
    const batch = mapSource(SOURCE, new TextEncoder().encode(text));
    expect(batch.postcodes[0]?.share).toBeCloseTo(0.00412, 10);
  });

  it("leaves out Liechtenstein's communes and the commune-free areas, and reports them", () => {
    const text = [
      "PLZ4;Ortschaftsname;BFS-Nr;Kantonskürzel;Adressenanteil;Validity",
      "1793;Jeuss;2233;FR;96.875 %;2008-07-01",
      "1793;Jeuss;2391;FR;3.125 %;2008-07-01",
      "9487;Gamprin-Bendern;7009;;99.507 %;2008-07-01",
      "",
    ].join("\r\n");
    const skipped: { row: string; reason: string }[] = [];
    const batch = mapSource(SOURCE, new TextEncoder().encode(text), skipped);
    expect(batch.postcodes.map((p) => p.place.value)).toEqual(["2233"]);
    expect(skipped.map((s) => s.row)).toEqual([
      "1793 Jeuss (bfs_municipality:2391)",
      "9487 Gamprin-Bendern (bfs_municipality:7009)",
    ]);
    expect(skipped[1]?.reason).toMatch(/Liechtenstein/);
  });

  it("refuses an archive that does not hold exactly one CSV", () => {
    expect(() => decodeCsvAnyForm(zipSync({ "a.csv": csv, "b.csv": csv }))).toThrow(
      /holds 2 CSV files/,
    );
  });
});

describe("the Federal Tax Administration's exports", () => {
  const skipped: { row: string; reason: string }[] = [];
  const scales = mapSource("estv-income-tax-scales", fixture("estv-scales-2025.json"), skipped);
  const tariff = (scheme: string, value: string, variant: string) =>
    scales.facts.find(
      (f) =>
        f.jurisdiction.scheme === scheme && f.jurisdiction.value === value && f.variant === variant,
    );

  it("reads the year from the request, since the response does not name it", () => {
    expect(
      scales.facts.every((f) => f.validFrom === "2025-01-01" && f.validTo === "2026-01-01"),
    ).toBe(true);
  });

  it("reads a federal table as the tax it states at each step, once, however many cantons repeat it", () => {
    const federal = tariff("iso_3166_1", "CH", "single")!;
    expect(federal.metricKey).toBe("tax.income.tariff");
    const { kind, steps } = federal.value as {
      kind: string;
      steps: { from: number; base: number; rate: number }[];
    };
    expect(kind).toBe("stepped");
    expect(steps.slice(0, 3)).toEqual([
      { from: 0, base: 0, rate: 0 },
      { from: 15200, base: 0, rate: 0.0077 },
      { from: 33200, base: 138.6, rate: 0.0088 },
    ]);
    // 11.5% of the whole income from here on, which the rates below would overstate.
    expect(steps.at(-1)).toEqual({ from: 793400, base: 91241, rate: 0.115 });
    expect(scales.facts.filter((f) => f.jurisdiction.value === "CH")).toHaveLength(2);
  });

  it("reads Fribourg's table as average rates, with a couple's table of its own", () => {
    const single = tariff("bfs_canton", "10", "single")!.value as {
      kind: string;
      points: { from: number; rate: number }[];
    };
    expect(single.kind).toBe("average");
    expect(single.points.slice(2, 4)).toEqual([
      { from: 5200, rate: 0.01 },
      { from: 17500, rate: 0.041745 },
    ]);
    // Its single table says splitting 2: how the couple's table was derived, not a divisor.
    const divisors = scales.facts
      .filter((f) => f.metricKey === "tax.income.divisor" && f.jurisdiction.value === "10")
      .map((f) => f.value);
    expect(divisors).toEqual([1, 1]);
  });

  it("reads a cantonal table as bracket widths, for the listed cantons only", () => {
    const basic = tariff("bfs_canton", "1", "single")!;
    expect(basic.metricKey).toBe("tax.income.tariff.basic");
    expect((basic.value as { brackets: unknown[] }).brackets.slice(0, 3)).toEqual([
      { from: 0, rate: 0 },
      { from: 6900, rate: 0.02 },
      { from: 11800, rate: 0.03 },
    ]);
    expect(tariff("bfs_canton", "1", "married")).toBeDefined();
    expect(tariff("bfs_canton", "2", "single")).toBeDefined();
    // Two federal tariffs, and per variant a basic tariff, a communal tariff
    // and a divisor for Aargau, Zürich, Bern, Fribourg, Ticino, Nidwalden,
    // Glarus, Schaffhausen, Vaud, Basel-Landschaft, Uri, Obwalden and Schwyz.
    // Valais's rows are not read: it is not modelled.
    expect(scales.facts).toHaveLength(80);
    expect(scales.facts.some((f) => f.jurisdiction.value === "23")).toBe(false);
  });

  it("gives the communes the canton's basic tariff, unless the canton gives them their own", () => {
    const of = (value: string, metric: string) =>
      scales.facts.find(
        (f) => f.jurisdiction.value === value && f.metricKey === metric && f.variant === "married",
      )!.value;
    expect(of("1", "tax.income.tariff.communal")).toEqual(of("1", "tax.income.tariff.basic"));
    // Schwyz: the communes' top rate is 3.65 % where the canton's is 5 %.
    const communal = of("5", "tax.income.tariff.communal") as { brackets: { rate: number }[] };
    const basic = of("5", "tax.income.tariff.basic") as { brackets: { rate: number }[] };
    expect(communal.brackets.at(-1)!.rate).toBe(0.0365);
    expect(basic.brackets.at(-1)!.rate).toBe(0.05);
  });

  it("reads a flat table as one rate, and a formula table as logarithmic pieces", () => {
    expect(tariff("bfs_canton", "4", "single")!.value).toEqual({
      kind: "flat",
      currency: "CHF",
      rate: 0.071,
    });
    const bl = tariff("bfs_canton", "13", "single")!.value as {
      kind: string;
      pieces: { from: number; constant: number; linear: number; xLnX: number }[];
    };
    expect(bl.kind).toBe("logarithmic");
    expect(bl.pieces[0]).toEqual({ from: 0, constant: 0, linear: 0, xLnX: 0 });
    expect(bl.pieces[1]).toEqual({
      from: 16716,
      constant: 829.41877,
      linear: expect.closeTo(-0.827429 - 0.089718, 9),
      xLnX: 0.089718,
    });
  });

  it("does not levy a federal tax below CHF 25", () => {
    expect((tariff("iso_3166_1", "CH", "married")!.value as { minimum?: number }).minimum).toBe(25);
  });

  it("attaches how the calculator rounds the income, per canton", () => {
    const rounding = (scheme: string, value: string) =>
      (tariff(scheme, value, "married")!.value as { rounding?: unknown }).rounding;
    expect(rounding("iso_3166_1", "CH")).toEqual({ base: 100 });
    expect(rounding("bfs_canton", "1")).toEqual({ base: 100 });
    expect(rounding("bfs_canton", "22")).toEqual({ base: 100, divided: 100 });
  });

  it("reads Vaud's single tariff from its cohabiting table, which divides nothing", () => {
    const divisor = (variant: string) =>
      scales.facts.find(
        (f) =>
          f.metricKey === "tax.income.divisor" &&
          f.jurisdiction.value === "22" &&
          f.variant === variant,
      )?.value;
    expect(divisor("single")).toBe(1);
    expect(divisor("married")).toBe(1.8);
  });

  it("records the divisor of a canton that splits a couple's income, and 1 elsewhere", () => {
    const divisor = (value: string, variant: string) =>
      scales.facts.find(
        (f) =>
          f.metricKey === "tax.income.divisor" &&
          f.jurisdiction.value === value &&
          f.variant === variant,
      )?.value;
    // Aargau's one table serves both variants; only a couple's income is divided.
    expect(divisor("19", "married")).toBe(2);
    expect(divisor("19", "single")).toBe(1);
    expect(divisor("1", "married")).toBe(1);
    expect(tariff("bfs_canton", "19", "single")!.value).toEqual(
      tariff("bfs_canton", "19", "married")!.value,
    );
  });

  const vaudReduction = mapSource(
    "vd-income-tax-reduction",
    new Uint8Array(readFileSync("data/places/switzerland/vd-income-tax-reduction.csv")),
  ).facts.filter((f) => f.validFrom === "2025-01-01");
  const vaudLimit = mapSource(
    "vd-income-tax-limit",
    new Uint8Array(readFileSync("data/places/switzerland/vd-income-tax-limit.csv")),
  ).facts.filter((f) => f.validFrom === "2025-01-01");

  it.each([
    // The calculator (API_calculateSimpleTaxes), 2025, taxable income CHF
    // 100,000 unless stated, no church tax, asked on 2026-10-01; the commune's
    // own multiplier as the same export reads it. Aargau splits a couple's
    // income, Fribourg gives average rates, and Ticino states the tax at each
    // step. At CHF 87,654 the income is rounded down to 100, and in Vaud,
    // Schaffhausen, Nidwalden and Glarus a couple's divided income too; Vaud's
    // cantonal tax is cut by 4 %.
    ...[
      {
        commune: "Lausanne",
        canton: "22",
        own: 0.785,
        variant: "single",
        federal: 1870,
        cantonal: 10752,
        communal: 5672,
      },
      {
        commune: "Lausanne",
        canton: "22",
        own: 0.785,
        variant: "married",
        federal: 1269,
        cantonal: 8795,
        communal: 4640,
      },
      {
        commune: "Schaffhausen",
        canton: "14",
        own: 0.86,
        variant: "married",
        federal: 1269,
        cantonal: 3615,
        communal: 3935,
      },
      {
        commune: "Stans",
        canton: "7",
        own: 2.35,
        variant: "married",
        federal: 1269,
        cantonal: 4311,
        communal: 3808,
      },
      {
        commune: "Glarus",
        canton: "8",
        own: 0.56,
        variant: "married",
        federal: 1269,
        cantonal: 4707,
        communal: 4415,
      },
      {
        commune: "Aarau",
        canton: "19",
        own: 0.96,
        variant: "married",
        federal: 1269,
        cantonal: 4191,
        communal: 3625,
      },
      {
        commune: "Liestal",
        canton: "13",
        own: 0.65,
        variant: "single",
        federal: 1870,
        cantonal: 9186,
        communal: 5971,
      },
      {
        commune: "Liestal",
        canton: "13",
        own: 0.65,
        variant: "married",
        federal: 1269,
        cantonal: 5319,
        communal: 3457,
      },
      {
        commune: "Schwyz",
        canton: "5",
        own: 1.75,
        variant: "single",
        federal: 1870,
        cantonal: 3266,
        communal: 4971,
      },
      {
        commune: "Altdorf",
        canton: "4",
        own: 0.95,
        variant: "single",
        federal: 1870,
        cantonal: 6223,
        communal: 5912,
      },
      {
        commune: "Sarnen",
        canton: "6",
        own: 3.86,
        variant: "married",
        federal: 1269,
        cantonal: 5125,
        communal: 6086,
      },
    ].map((c) => ({ ...c, income: 87_654 })),
    // The communes' own tariff in Schwyz, above where it parts from the canton's.
    {
      commune: "Schwyz",
      canton: "5",
      own: 1.75,
      variant: "married",
      federal: 86988,
      cantonal: 44717,
      communal: 49675,
      income: 777_777,
    },
    // Vaud's cantonal and communal tax together are limited to 30 % of the income.
    {
      commune: "Lausanne",
      canton: "22",
      own: 0.785,
      variant: "single",
      federal: 89170,
      cantonal: 152749,
      communal: 80584,
      income: 777_777,
    },
    // The federal tariff gives CHF 3, which is not levied.
    {
      commune: "Aarau",
      canton: "19",
      own: 0.96,
      variant: "married",
      federal: 0,
      cantonal: 457,
      communal: 396,
      income: 30_000,
    },
    ...[
      {
        commune: "Aarau",
        canton: "19",
        own: 0.96,
        variant: "single",
        federal: 2688,
        cantonal: 7701,
        communal: 6660,
      },
      {
        commune: "Aarau",
        canton: "19",
        own: 0.96,
        variant: "married",
        federal: 1816,
        cantonal: 5292,
        communal: 4577,
      },
      {
        commune: "Fribourg",
        canton: "10",
        own: 0.8,
        variant: "single",
        federal: 2688,
        cantonal: 10359,
        communal: 8633,
      },
      {
        commune: "Fribourg",
        canton: "10",
        own: 0.8,
        variant: "married",
        federal: 1816,
        cantonal: 7826,
        communal: 6522,
      },
      {
        commune: "Bellinzona",
        canton: "21",
        own: 0.93,
        variant: "single",
        federal: 2688,
        cantonal: 8791,
        communal: 8176,
      },
      {
        commune: "Bellinzona",
        canton: "21",
        own: 0.93,
        variant: "married",
        federal: 1816,
        cantonal: 6521,
        communal: 6065,
      },
    ].map((c) => ({ ...c, income: 100_000 })),
  ])(
    "estimates $commune, $variant, at CHF $income, as the calculator does",
    ({ canton: cantonCode, own, variant, federal, cantonal, communal, income }) => {
      const canton = mapSource("estv-canton-multipliers", fixture("estv-rates-2025.json"));
      const facts = [...scales.facts, ...canton.facts, ...vaudReduction, ...vaudLimit].flatMap(
        (f) => {
          const level = { iso_3166_1: "nation", bfs_canton: "canton" }[f.jurisdiction.scheme];
          return (level === "nation" && f.jurisdiction.value === "CH") ||
            (level === "canton" && f.jurisdiction.value === cantonCode)
            ? [
                {
                  level,
                  metric: f.metricKey,
                  ...(f.variant ? { variant: f.variant } : {}),
                  value: f.value,
                },
              ]
            : [];
        },
      );
      facts.push({ level: "municipality", metric: "tax.multiplier", value: own });
      const estimate = evaluate(switzerlandIncomeTax, facts, {
        values: { taxable_income: income },
        variant,
      });
      const amount = (key: string) => estimate.components.find((c) => c.key === key)!.amount!;
      expect(estimate.complete).toBe(true);
      expect(Math.abs(amount("federal") - federal)).toBeLessThan(1);
      expect(Math.abs(amount("cantonal") - cantonal)).toBeLessThan(1);
      expect(Math.abs(amount("communal") - communal)).toBeLessThan(1);
    },
  );

  it("refuses a divided tariff where the calculator divides nothing, or no divisor is recorded", () => {
    const envelope = JSON.parse(new TextDecoder().decode(fixture("estv-scales-2025.json"))) as {
      request: unknown;
      response: string;
    };
    const exported = JSON.parse(envelope.response) as { response: Record<string, unknown>[] };
    const canton = (row: Record<string, unknown>) => (row.Location as { Canton: string }).Canton;
    // Schaffhausen's federal rows read splitting 1.9; without the other
    // cantons' federal rows, nothing gives their tariff instead.
    exported.response = exported.response.filter(
      (row) => row.Target !== "BUND" || canton(row) === "SH",
    );
    for (const row of exported.response) {
      if (canton(row) === "ZH" && row.Target === "KANTON") row.Splitting = 2;
    }
    envelope.response = JSON.stringify(exported);
    const refused: { row: string; reason: string }[] = [];
    const batch = mapSource(
      "estv-income-tax-scales",
      new TextEncoder().encode(JSON.stringify(envelope)),
      refused,
    );
    const zurich = batch.facts.filter((f) => f.jurisdiction.value === "1");
    expect(zurich.map((f) => `${f.metricKey} ${f.variant} ${String(f.value)}`)).toContain(
      "tax.income.divisor married 2",
    );
    expect(zurich.some((f) => f.variant === "single")).toBe(false);
    expect(refused.map((r) => r.reason)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/variant the calculator does not divide \(splitting 2\)/),
        expect.stringMatching(/does not record a divisor/),
      ]),
    );
  });

  it("reports no row it could not read when another row gives the same tariff", () => {
    expect(skipped).toEqual([]);
  });

  const multiplier = (scheme: string, value: string, multiplier: number) => ({
    jurisdiction: { scheme, value },
    metricKey: "tax.multiplier",
    variant: null,
    validFrom: "2025-01-01",
    validTo: "2026-01-01",
    value: multiplier,
  });

  it("records the canton's own multiplier", () => {
    const rates = mapSource("estv-canton-multipliers", fixture("estv-rates-2025.json"));
    expect(rates.facts).toEqual([
      multiplier("bfs_canton", "19", 1.11),
      multiplier("bfs_canton", "1", 0.98),
      multiplier("bfs_canton", "2", 2.975),
      multiplier("bfs_canton", "10", 0.96),
      multiplier("bfs_canton", "21", 1),
      multiplier("bfs_canton", "8", 0.597),
      multiplier("bfs_canton", "7", 2.66),
      multiplier("bfs_canton", "14", 0.79),
      multiplier("bfs_canton", "22", 1.55),
      multiplier("bfs_canton", "13", 1),
      multiplier("bfs_canton", "6", 3.25),
      multiplier("bfs_canton", "5", 1.15),
      multiplier("bfs_canton", "4", 1),
    ]);
  });

  it("records each commune's multiplier by its FSO number, for the listed cantons only", () => {
    // Zürich's communes have their own source.
    const rates = mapSource("estv-commune-multipliers", fixture("estv-commune-rates-2025.json"));
    expect(rates.facts).toEqual([
      multiplier("bfs_municipality", "371", 1.63),
      multiplier("bfs_municipality", "1206", 1.03),
    ]);
  });

  it("refuses rates that name both a place per canton and each row's own", () => {
    const adapter = ADAPTERS.get("estv_simple_rates")!;
    const source = placesConfig.sources.find((s) => s.key === "estv-canton-multipliers")!;
    const options = source.options as Record<string, unknown>;
    expect(
      adapter.options!.safeParse({
        ...options,
        communes: { scheme: "bfs_municipality", cantons: ["BE"] },
      }).success,
    ).toBe(false);
  });

  describe("planning", () => {
    const source = placesConfig.sources.find((s) => s.key === "estv-income-tax-scales")!;
    const adapter = ADAPTERS.get(source.adapter)!;
    const options = adapter.options!.parse(source.options);
    const publishedUpTo =
      (maxYear: number): Probe =>
      async () => ({ response: { Calculator: 1, MinYear: 2010, MaxYear: maxYear } });
    const years = (requests: { body?: unknown }[]) =>
      requests.map((r) => (r.body as { TaxYear: number }).TaxYear);

    it("asks for the latest published year on schedule, and the years before it to backfill", async () => {
      expect(years(await adapter.retrievals!(options, "2026-09-29", publishedUpTo(2026)))).toEqual([
        2026,
      ]);
      expect(years(await adapter.backfill!(options, "2026-09-29", publishedUpTo(2026)))).toEqual([
        2021, 2022, 2023, 2024, 2025,
      ]);
    });

    it("never asks for a year the publisher has not released", async () => {
      expect(years(await adapter.retrievals!(options, "2027-01-15", publishedUpTo(2026)))).toEqual([
        2026,
      ]);
      await expect(adapter.retrievals!(options, "2026-09-29", publishedUpTo(0))).rejects.toThrow(
        /no published year/,
      );
    });
  });
});

describe("swisstopo's commune boundaries", () => {
  const SOURCE = "swisstopo-commune-boundaries";
  // A cut of swissBOUNDARIES3D 2026-01: Küsnacht, Zürich and Biel/Bienne, the
  // canton's share of Lake Zürich and Vaduz (LI), snapped to 25 m.
  const zip = fixture("swissboundaries3d_2026-01_cut.shp.zip");
  const retrieval = {
    url: "https://data.geo.admin.ch/ch.swisstopo.swissboundaries3d/swissboundaries3d_2026-01/swissboundaries3d_2026-01_2056_5728.shp.zip",
    validFrom: "2026-01-01",
  };
  const map = () => mapSource(SOURCE, zip, [], retrieval);

  it("reads polygon records with their Z values skipped, and their attributes", () => {
    const files = unzipSync(zip);
    const layer = "swissBOUNDARIES3D_1_5_TLM_HOHEITSGEBIET";
    const records = readShapefile(files[`${layer}.shp`]!, files[`${layer}.dbf`]!, "UTF-8");
    expect(records.map((r) => r.attributes.NAME)).toEqual([
      "Zürichsee (ZH)",
      "Küsnacht (ZH)",
      "Vaduz",
      "Zürich",
      "Biel/Bienne",
    ]);
    const [x, y] = records[3]!.polygons[0]![0]![0]!;
    expect(x).toBeGreaterThan(2_670_000);
    expect(y).toBeGreaterThan(1_240_000);
  });

  it("draws each commune the filter keeps, administered by its place, from the edition's start", () => {
    const batch = map();
    expect(batch.areas).toEqual(
      ["154", "261", "371"].map((code) => ({
        place: { scheme: "bfs_municipality", value: code },
        feature: code,
        validFrom: "2026-01-01",
        validTo: null,
      })),
    );
    expect(batch.geometry?.levelKey).toBe("municipality");
    expect(batch.geometry?.datasetVersion).toBe("2026-01");
  });

  it("publishes one quantised WGS84 topology whose features are the communes' codes", () => {
    const topology = JSON.parse(map().geometry!.topology) as {
      type: string;
      transform: unknown;
      bbox: number[];
      objects: { municipality: { geometries: { id: string; type: string }[] } };
    };
    expect(topology.type).toBe("Topology");
    expect(topology.transform).toBeDefined();
    expect(topology.objects.municipality.geometries.map((g) => [g.id, g.type])).toEqual([
      ["154", "MultiPolygon"],
      ["261", "MultiPolygon"],
      ["371", "MultiPolygon"],
    ]);
    const [west, south, east, north] = topology.bbox;
    expect(west).toBeGreaterThan(7.1);
    expect(east).toBeLessThan(8.7);
    expect(south).toBeGreaterThan(47);
    expect(north).toBeLessThan(47.5);
  });

  it("writes the same file for the same edition, so a rerun changes nothing", () => {
    expect(map().geometry!.topology).toBe(map().geometry!.topology);
  });

  it("refuses a retrieval whose URL names no edition", () => {
    expect(() =>
      mapSource(SOURCE, zip, [], { url: "fixture:boundaries.zip", validFrom: null }),
    ).toThrow(/no edition/);
  });

  describe("planning", () => {
    const source = placesConfig.sources.find((s) => s.key === SOURCE)!;
    const adapter = ADAPTERS.get(source.adapter)!;
    const options = adapter.options!.parse(source.options);
    const edition = (id: string, datetime: string) => ({
      id: `swissboundaries3d_${id}`,
      properties: { datetime },
      assets: {
        [`swissboundaries3d_${id}_2056_5728.gdb.zip`]: {
          href: `https://example.test/swissboundaries3d_${id}_2056_5728.gdb.zip`,
        },
        [`swissboundaries3d_${id}_2056_5728.shp.zip`]: {
          href: `https://example.test/swissboundaries3d_${id}_2056_5728.shp.zip`,
        },
      },
    });
    const catalogue: Probe = async () => ({
      features: [
        edition("2025-01", "2025-01-01T00:00:00Z"),
        edition("2025-04", "2025-04-06T00:00:00Z"),
        edition("2026-01", "2026-01-01T00:00:00Z"),
      ],
    });

    it("fetches the latest edition begun by today, with the date it begins", async () => {
      expect(await adapter.retrievals!(options, "2025-12-31", catalogue)).toEqual([
        {
          url: "https://example.test/swissboundaries3d_2025-04_2056_5728.shp.zip",
          validFrom: "2025-04-06",
        },
      ]);
      expect((await adapter.retrievals!(options, "2026-09-30", catalogue))[0]?.validFrom).toBe(
        "2026-01-01",
      );
    });

    it("fails when no edition has begun", async () => {
      await expect(adapter.retrievals!(options, "2024-12-31", catalogue)).rejects.toThrow(
        /no "_2056_5728.shp.zip" edition begun by 2024-12-31/,
      );
    });
  });
});

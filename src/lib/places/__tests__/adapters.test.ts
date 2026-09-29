import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { placesConfig } from "@/lib/config/places";
import { ADAPTERS } from "../adapters";
import { isoFromDottedDate, parseCsv } from "../adapters/csv";
import { fiscalYearPeriod } from "../adapters/csv-facts";
import { plannedRetrievals } from "../importer/fetch";
import type { BatchJurisdiction, ImportBatch } from "../importer/batch";

const FIXTURES = join(__dirname, "fixtures", "switzerland");
const fixture = (name: string) => new Uint8Array(readFileSync(join(FIXTURES, name)));

/** A retrieval of a registered source, through its adapter as a run would. */
function mapSource(
  sourceKey: string,
  bytes: Uint8Array,
  skipped: { row: string; reason: string }[] = [],
): ImportBatch {
  const source = placesConfig.sources.find((s) => s.key === sourceKey)!;
  const adapter = ADAPTERS.get(source.adapter)!;
  const decoded = adapter.decode
    ? adapter.decode(bytes)
    : (JSON.parse(new TextDecoder().decode(bytes)) as unknown);
  return adapter.map(adapter.schema.parse(decoded), {
    source,
    pack: placesConfig.packs.find((p) => p.key === source.packs[0]),
    options: adapter.options?.parse(source.options),
    retrieval: { url: null },
    skip: (row, reason) => skipped.push({ row, reason }),
  });
}

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

  it("fetches today's snapshot on schedule, and one a year since its start to backfill", () => {
    const today = "https://www.agvchapp.bfs.admin.ch/api/communes/snapshot?date=29-09-2026";
    expect(plannedRetrievals(placesConfig, "bfs-communes-snapshot", "2026-09-29")).toEqual([today]);
    expect(
      plannedRetrievals(placesConfig, "bfs-communes-snapshot", "2026-09-29", { backfill: true }),
    ).toEqual([
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

  it("ends a commune the register ended, and dates its territorial version", () => {
    expect(byRef(y2021, "bfs_municipality", "21")).toMatchObject({
      validTo: "2022-12-31",
      identifiers: [
        {
          scheme: "bfs_municipality_version",
          value: "11735",
          validFrom: "1872-01-01",
          validTo: "2022-12-31",
        },
      ],
    });
  });

  it("keeps a commune's number through a territory exchange", () => {
    expect(byRef(y2021, "bfs_municipality", "62")).toMatchObject({ validTo: "2023-12-31" });
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

  it("plans one retrieval from the day after the first snapshot", () => {
    expect(plannedRetrievals(placesConfig, "bfs-communes-mutations", "2026-09-29")).toEqual([
      "https://www.agvchapp.bfs.admin.ch/api/communes/mutations?includeTerritoryExchange=false&startPeriod=02-01-2021&endPeriod=29-09-2026",
    ]);
  });
});

describe("the City of Zürich's statistical quarters", () => {
  const batch = mapSource("zurich-statistical-quarters", fixture("statistical-quarters.json"));

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
      validTo: "2025-12-31",
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

  it("dates a fiscal year that does not start in January", () => {
    expect(fiscalYearPeriod(2025, "04-06")).toEqual({
      validFrom: "2025-04-06",
      validTo: "2026-04-05",
    });
  });
});

import { describe, expect, it } from "vitest";
import { placesConfig } from "@/lib/config/places";
import { coverageView, type CoverageInput } from "../coverage";
import { withTestland } from "./fixtures/testland/config";

const testland = withTestland(placesConfig);

const input = (overrides: Partial<CoverageInput> = {}): CoverageInput => ({
  config: testland,
  locale: "de",
  placeCounts: [
    { countryPack: "testland", levelKey: "realm", places: 1 },
    { countryPack: "testland", levelKey: "shire", places: 2 },
    { countryPack: "testland", levelKey: "parish", places: 5 },
  ],
  factCounts: [
    { countryPack: "testland", levelKey: "parish", metricKey: "test.multiplier", places: 3 },
    { countryPack: "testland", levelKey: "hamlet", metricKey: "test.multiplier", places: 1 },
  ],
  retrievals: [{ sourceKey: "testland-register", retrievedAt: new Date("2025-06-01T03:00:00Z") }],
  runs: [
    {
      sourceKey: "testland-register",
      status: "failed",
      startedAt: new Date("2025-07-01T03:00:00Z"),
    },
  ],
  ...overrides,
});

const pack = (packs: ReturnType<typeof coverageView>) => packs.find((p) => p.key === "testland")!;

describe("coverageView", () => {
  it("counts every level of the pack, empty ones included, in the reader's language", () => {
    const levels = pack(coverageView(input())).levels;
    expect(levels.map((l) => [l.name, l.places])).toEqual([
      ["Reich", 1],
      ["Grafschaft", 2],
      ["Gemeinde", 5],
      ["Weiler", 0],
      ["Zunft", 0],
    ]);
    expect(levels.find((l) => l.key === "hamlet")!.partial).toBe(true);
    expect(levels.find((l) => l.key === "guild")!.overlapping).toBe(true);
  });

  it("lists each fact the tax model reads, held or not, and facts it does not read", () => {
    const metrics = pack(coverageView(input())).metrics;
    const row = (level: string, metric: string) =>
      metrics.find((m) => m.levelName === level && m.metricLabel === metric);
    expect(row("Gemeinde", "Multiplier")).toMatchObject({ places: 3, of: 5, inTaxModel: true });
    expect(row("Reich", "Crown income tariff")).toMatchObject({
      places: 0,
      of: 1,
      inTaxModel: true,
    });
    expect(row("Weiler", "Multiplier")).toMatchObject({ places: 1, of: 0, inTaxModel: false });
    expect(metrics.filter((m) => m.inTaxModel)).toHaveLength(5);
  });

  it("dates each source by its latest retrieval and its latest real run", () => {
    expect(pack(coverageView(input())).sources).toEqual([
      expect.objectContaining({
        key: "testland-register",
        retrievedOn: "2025-06-01",
        lastRun: { status: "failed", on: "2025-07-01" },
      }),
    ]);
    const never = pack(coverageView(input({ retrievals: [], runs: [] }))).sources[0]!;
    expect(never).toMatchObject({ retrievedOn: null, lastRun: null });
  });
});

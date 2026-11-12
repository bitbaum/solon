import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { placesConfig } from "@/lib/config/places";
import { ADAPTERS } from "../adapters";
import { plannedRetrievals, send, setRetryDelayForTests } from "../importer/fetch";
import { importBatchSchema } from "../importer/batch";
import { checkBatch } from "../importer/validate";

const FIXTURES = join(__dirname, "fixtures", "worldbank");
const fixture = (name: string): unknown => JSON.parse(readFileSync(join(FIXTURES, name), "utf8"));

function mapSource(sourceKey: string, body: unknown, skipped: { row: string; reason: string }[]) {
  const source = placesConfig.sources.find((s) => s.key === sourceKey)!;
  const adapter = ADAPTERS.get(source.adapter)!;
  return importBatchSchema.parse(
    adapter.map(adapter.schema.parse(body), {
      source,
      pack: placesConfig.packs.find((p) => p.key === source.packs[0]),
      options: adapter.options?.parse(source.options),
      retrieval: { url: null, validFrom: null },
      skip: (row, reason) => skipped.push({ row, reason }),
    }),
  );
}

describe("the World Bank's indicators", () => {
  const statistics = placesConfig.metrics.filter(
    (m) => !m.retired && m.statistic?.series.publisher.startsWith("World Bank"),
  );

  it("reads every World Bank statistic for each country, the code kept once on the metric", async () => {
    const urls = (await plannedRetrievals(placesConfig, "worldbank-wdi-ch", "2026-11-08")).map(
      (r) => r.url,
    );
    expect(urls).toHaveLength(statistics.length);
    for (const metric of statistics) {
      expect(urls).toContain(
        `https://api.worldbank.org/v2/country/CH/indicator/${metric.statistic!.series.code}?format=json&per_page=1000${
          metric.statistic!.series.code.startsWith("GOV_WGI_") ? "&source=3" : ""
        }&date=1990:2026`,
      );
    }
  });

  it("reads the world's countries in one request an indicator, and passes over the rest", async () => {
    const urls = (await plannedRetrievals(placesConfig, "worldbank-wdi-world", "2026-11-08")).map(
      (r) => r.url,
    );
    expect(urls).toHaveLength(statistics.length);
    expect(
      urls.every((u) => u.includes("/country/all/indicator/") && u.includes("per_page=20000")),
    ).toBe(true);
    const row = (id: string, date: string, value: number | null) => ({
      indicator: { id: "NE.CON.GOVT.ZS", value: "" },
      country: { id, value: "" },
      date,
      value,
    });
    const skipped: { row: string; reason: string }[] = [];
    const batch = mapSource(
      "worldbank-wdi-world",
      [
        { page: 1, pages: 1, total: 5 },
        // Germany, a year with no value, an aggregate, a territory with no code, and a country a pack holds.
        [
          row("DE", "2023", 21.5),
          row("DE", "2024", null),
          row("ZH", "2023", 15),
          row("", "2023", 9),
          row("CH", "2023", 11),
        ],
      ],
      skipped,
    );
    expect(batch.pack).toBe("world");
    expect(batch.facts).toHaveLength(1);
    expect(batch.facts[0]).toMatchObject({
      jurisdiction: { scheme: "iso_3166_1", value: "DE" },
      metricKey: "economy.government.consumption",
      validFrom: "2023-01-01",
    });
    expect(batch.facts[0]!.value).toBeCloseTo(0.215, 5);
    expect(skipped).toEqual([]);
  });

  it("is a source of every pack it names", () => {
    for (const source of placesConfig.sources.filter((s) => s.adapter === "worldbank_indicators")) {
      const pack = placesConfig.packs.find((p) => p.key === source.packs[0])!;
      expect(pack.sources, source.key).toContain(source.key);
    }
  });

  it("turns a percentage of GDP into a ratio per calendar year", () => {
    const skipped: { row: string; reason: string }[] = [];
    const batch = mapSource("worldbank-wdi-ch", fixture("ch-ne-con-govt-zs.json"), skipped);
    expect(batch.pack).toBe("switzerland");
    expect(batch.jurisdictions).toEqual([]);
    expect(batch.facts).toHaveLength(8);
    const y2023 = batch.facts.find((f) => f.validFrom === "2023-01-01")!;
    expect(y2023).toMatchObject({
      jurisdiction: { scheme: "iso_3166_1", value: "CH" },
      metricKey: "economy.government.consumption",
      validTo: "2024-01-01",
    });
    expect(y2023.value).toBeCloseTo(0.117415, 5);
    expect(skipped).toEqual([]);
    expect(checkBatch(batch, placesConfig, "worldbank-wdi-ch").problems).toEqual([]);
  });

  it("leaves out a year with no value and says why, never storing a zero", () => {
    const skipped: { row: string; reason: string }[] = [];
    const batch = mapSource("worldbank-wdi-li", fixture("li-ne-con-govt-zs.json"), skipped);
    expect(batch.facts).toEqual([]);
    expect(skipped.length).toBeGreaterThan(0);
    expect(skipped[0]!.reason).toMatch(/no value/);
  });

  it("refuses an indicator the source did not ask for", () => {
    const body = fixture("ch-ne-con-govt-zs.json") as [unknown, { indicator: { id: string } }[]];
    body[1][0]!.indicator.id = "XX.UNKNOWN";
    expect(() => mapSource("worldbank-wdi-ch", body, [])).toThrow(/not in the source's options/);
  });
});

describe("the OECD Tax Database", () => {
  it("asks for each OECD series of the country with the key its metric names", async () => {
    const urls = (await plannedRetrievals(placesConfig, "oecd-tax-ee", "2026-11-08")).map(
      (r) => r.url,
    );
    expect(urls).toEqual([
      "https://sdmx.oecd.org/public/rest/data/OECD.CTP.TPS,DSD_TAX_PIT@DF_PIT_TOP_EARN_THRESH,1.0/EST.A..TS_PIT........?startPeriod=2000&format=csvfile",
      "https://sdmx.oecd.org/public/rest/data/OECD.GOV.GIP,DSD_GOV@DF_GOV_PF_2025,1.0/A.EST.GE.PT_B1GQ.S13..?startPeriod=2000&format=csvfile",
      "https://sdmx.oecd.org/public/rest/data/OECD.CTP.TPS,DSD_REV_COMP_OECD@DF_RSOECD,2.0/EST.TAX_REV.S13._T..PT_B1GQ.A?startPeriod=2000&format=csvfile",
      "https://sdmx.oecd.org/public/rest/data/OECD.CTP.TPS,DSD_REV_COMP_OECD@DF_RSOECD,2.0/EST.TAX_REV.S1311._T..PT_OTR_REV_CAT.A?startPeriod=2000&format=csvfile",
      "https://sdmx.oecd.org/public/rest/data/OECD.CTP.TPS,DSD_TAX_WAGES_COMP@DF_TW_COMP,2.1/EST.AV_TW.PT_COS_LB.S_C0.AW100._Z.A?startPeriod=2000&format=csvfile",
    ]);
  });

  it("turns the top rate in percent into a ratio per year", () => {
    const source = placesConfig.sources.find((s) => s.key === "oecd-tax-ee")!;
    const adapter = ADAPTERS.get(source.adapter)!;
    const bytes = new Uint8Array(
      readFileSync(join(__dirname, "fixtures", "oecd", "oecd-est-ts-pit.csv")),
    );
    const skipped: { row: string; reason: string }[] = [];
    const batch = importBatchSchema.parse(
      adapter.map(adapter.schema.parse(adapter.decode!(bytes)), {
        source,
        pack: placesConfig.packs.find((p) => p.key === "estonia"),
        options: adapter.options?.parse(source.options),
        retrieval: { url: null, validFrom: null },
        skip: (row, reason) => skipped.push({ row, reason }),
      }),
    );
    const y2023 = batch.facts.find((f) => f.validFrom === "2023-01-01")!;
    expect(y2023).toMatchObject({
      jurisdiction: { scheme: "iso_3166_1", value: "EE" },
      metricKey: "tax.income.top_rate",
      value: 0.2,
    });
    expect(checkBatch(batch, placesConfig, "oecd-tax-ee").problems).toEqual([]);
  });
});

describe("the OECD's all-levels series", () => {
  const read = (file: string) => {
    const source = placesConfig.sources.find((x) => x.key === "oecd-tax-ee")!;
    const adapter = ADAPTERS.get(source.adapter)!;
    const bytes = new Uint8Array(readFileSync(join(__dirname, "fixtures", "oecd", file)));
    return importBatchSchema.parse(
      adapter.map(adapter.schema.parse(adapter.decode!(bytes)), {
        source,
        pack: placesConfig.packs.find((p) => p.key === "estonia"),
        options: adapter.options?.parse(source.options),
        retrieval: { url: null, validFrom: null },
        skip: () => undefined,
      }),
    );
  };

  it("reads government expenditure and total tax revenue of general government as ratios", () => {
    const spend = read("oecd-est-ge.csv").facts.find((f) => f.validFrom === "2023-01-01")!;
    expect(spend.metricKey).toBe("economy.government.expenditure");
    expect(spend.value).toBeCloseTo(0.4368, 4);
    const tax = read("oecd-est-taxrev.csv").facts.find((f) => f.validFrom === "2022-01-01")!;
    expect(tax.metricKey).toBe("tax.revenue.general");
    expect(tax.value).toBeCloseTo(0.329346, 5);
    // Two series of one flow and measure are told apart by their sector and unit.
    const central = read("oecd-est-central-share.csv").facts.find(
      (f) => f.validFrom === "2022-01-01",
    )!;
    expect(central.metricKey).toBe("tax.revenue.central_share");
    expect(central.value).toBeGreaterThan(0.5);
    expect(central.value).toBeLessThan(1);
    // The wedge is for one household type on one wage; the key narrows the request to it.
    const wedge = read("oecd-est-tax-wedge.csv").facts.find((f) => f.validFrom === "2023-01-01")!;
    expect(wedge.metricKey).toBe("tax.wedge.average");
    expect(wedge.value).toBeCloseTo(0.39894, 4);
    expect(wedge.quality).toBe("normal");
    expect(wedge.publisherFlag).toBeNull();
  });

  it("no longer charts the central-government-only series, which made federal countries look small", () => {
    const retired = placesConfig.metrics.filter((m) => m.retired).map((m) => m.key);
    expect(retired).toEqual(
      expect.arrayContaining(["economy.government.expense", "tax.revenue.total"]),
    );
  });
});

describe("fetching a source", () => {
  it("retries a server error five times, then gives up; a client error is not retried", async () => {
    setRetryDelayForTests(1);
    const answers = (codes: number[]) => {
      let calls = 0;
      const impl = (async () =>
        new Response("x", { status: codes[calls++] ?? 200 })) as typeof fetch;
      return { impl, calls: () => calls };
    };
    const flaky = answers([500, 502, 200]);
    expect((await send(flaky.impl, { url: "https://example.org/a" })).status).toBe(200);
    expect(flaky.calls()).toBe(3);

    const down = answers([500, 500, 500, 500, 500, 500, 200]);
    await expect(send(down.impl, { url: "https://example.org/b" })).rejects.toThrow(/HTTP 500/);
    expect(down.calls()).toBe(6);

    const missing = answers([404]);
    await expect(send(missing.impl, { url: "https://example.org/c" })).rejects.toThrow(/HTTP 404/);
    expect(missing.calls()).toBe(1);
  });

  it("asks again when no answer comes, twice, then says so", async () => {
    setRetryDelayForTests(1);
    let calls = 0;
    const hangsOnce = (async () => {
      if (calls++ === 0) throw new Error("The operation was aborted due to timeout");
      return new Response("x");
    }) as typeof fetch;
    expect((await send(hangsOnce, { url: "https://example.org/d" })).status).toBe(200);
    expect(calls).toBe(2);

    let silent = 0;
    const never = (async () => {
      silent += 1;
      throw new Error("fetch failed");
    }) as typeof fetch;
    await expect(send(never, { url: "https://example.org/e" })).rejects.toThrow(/no answer/);
    expect(silent).toBe(3);
  });
});

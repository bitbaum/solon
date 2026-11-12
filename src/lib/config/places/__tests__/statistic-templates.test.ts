import { describe, expect, it } from "vitest";
import { placesConfig } from "@/lib/config/places";
import { ALL_LEVELS_SCOPE, sentence, wgiMetric } from "../statistic-templates";

describe("statistic templates", () => {
  it("make a governance indicator from its key, code and name, in every language", () => {
    const metric = wgiMetric({
      key: "governance.wgi.example",
      code: "GOV_WGI_XX.SC",
      name: { en: "Example", de: "Beispiel", fr: "Exemple", it: "Esempio", ru: "Пример" },
    });
    expect(metric.label).toMatchObject({
      en: "Example (World Bank score, 0–100)",
      ru: "Пример (оценка Всемирного банка, 0–100)",
    });
    expect(metric.statistic!.definition.de).toMatch(/^Beispiel, einer der sechs/);
    expect(metric.statistic!.series).toMatchObject({
      code: "GOV_WGI_XX.SC",
      read: "worldbank_indicators",
      database: 3,
    });
  });

  it("are what the six governance indicators and the all-levels series are written with", () => {
    const wgi = placesConfig.metrics.filter((m) => m.key.startsWith("governance.wgi."));
    expect(wgi).toHaveLength(6);
    for (const m of wgi) expect(m.statistic!.series.database).toBe(3);
    const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
    const allLevels = placesConfig.metrics.filter((m) =>
      same(m.statistic?.scope, ALL_LEVELS_SCOPE),
    );
    expect(allLevels.map((m) => m.key).sort()).toEqual([
      "economy.government.consumption",
      "tax.revenue.general",
    ]);
  });

  it("put a label into a sentence, from the catalog where it has no word of its own", () => {
    const filled = sentence(
      { en: "{label}!", de: "{label}!", fr: "{label}!", it: "{label}!", ru: "{label}!" },
      { en: "Health" },
    );
    expect(filled.en).toBe("Health!");
    expect(filled.de).not.toContain("{label}");
  });
});

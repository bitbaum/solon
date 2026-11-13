import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { METRIC_UNITS } from "@/lib/places/vocabulary";
import { scaled, UNITS } from "../units";

const LOCALES = ["en", "de", "fr", "it", "ru"];
const messages = (locale: string) =>
  JSON.parse(readFileSync(join(process.cwd(), "messages", `${locale}.json`), "utf8")) as {
    Statistics: { units: Record<string, string> };
  };

describe("metric units", () => {
  it("has a rule for every unit, its words in every language", () => {
    for (const unit of METRIC_UNITS) {
      const label = UNITS[unit].label;
      if (!label) continue;
      for (const locale of LOCALES) {
        expect(messages(locale).Statistics.units[label], `${unit} ${locale}`).toBeTruthy();
      }
    }
  });

  it("shows a ratio in per cent, rounded as charts keep it, and anything else as stored", () => {
    expect(scaled("ratio", 0.123456)).toBe(12.35);
    expect(scaled("per_100k", 1.23456)).toBe(1.235);
    expect(scaled("none", 57.4)).toBe(57.4);
    expect(UNITS.ratio.publishedAsPercent).toBe(true);
    expect(UNITS.per_100k.publishedAsPercent).toBe(false);
  });
});

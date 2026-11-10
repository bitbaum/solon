import { describe, expect, it } from "vitest";
import { placesConfig } from "@/lib/config/places";
import { STATISTIC_SEARCHES, searchesFor } from "@/lib/config/statistics/searches";

const RESULTS = ["series_empty", "not_published", "not_covered", "related"];

describe("where Solon looked for a figure it does not have", () => {
  it("names a statistic Solon reads, a place code, and a day that has passed", () => {
    for (const s of STATISTIC_SEARCHES) {
      const metric = placesConfig.metrics.find((m) => m.key === s.metric);
      expect(metric?.statistic, s.metric).toBeDefined();
      expect(s.place, s.metric).toMatch(/^[A-Z]{2}$/);
      expect(s.checkedOn, s.metric).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(s.checkedOn <= new Date().toISOString().slice(0, 10), s.metric).toBe(true);
      expect(s.looked.length, s.metric).toBeGreaterThan(0);
    }
  });

  it("gives every publisher looked at an address to open, a result, and its note in English and German", () => {
    for (const s of STATISTIC_SEARCHES) {
      expect(s.placeName.en, s.metric).toBeTruthy();
      expect(s.placeName.de, s.metric).toBeTruthy();
      for (const l of s.looked) {
        const who = `${s.metric} ${l.publisher}`;
        expect(l.url, who).toMatch(/^https:\/\//);
        expect(RESULTS, who).toContain(l.result);
        expect(l.note.en?.trim(), who).toBeTruthy();
        expect(l.note.de?.trim(), who).toBeTruthy();
      }
      // One publisher is looked at once per series and place.
      expect(new Set(s.looked.map((l) => l.publisher)).size, s.metric).toBe(s.looked.length);
    }
  });

  it("has at most one record for a series and a place", () => {
    const keys = STATISTIC_SEARCHES.map((s) => `${s.metric} ${s.place}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("covers Liechtenstein's government consumption: four publishers, and why none has a figure", () => {
    const [record] = searchesFor("economy.government.consumption", ["li"]);
    expect(record?.looked.map((l) => [l.publisher.split(",")[0], l.result])).toEqual([
      ["World Bank", "series_empty"],
      ["Amt für Statistik", "not_published"],
      ["Eurostat", "not_published"],
      ["OECD", "not_covered"],
    ]);
  });

  it("is asked for by the places a reader chose, in any case, and by no other", () => {
    expect(searchesFor("economy.government.consumption", ["LI", "ch"])).toHaveLength(1);
    expect(searchesFor("economy.government.consumption", ["CH"])).toEqual([]);
    expect(searchesFor("economy.government.consumption", [])).toEqual([]);
    expect(searchesFor("tax.income.top_rate", ["LI"])).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { placesConfig } from "@/lib/config/places";
import { OECD_KEY, WORLD_BANK_KEY } from "@/lib/config/places/world";
import { publishersOf } from "../present";
import { figureSource } from "../source";
import type { PlaceSeries } from "../read";

const metric = (key: string) => placesConfig.metrics.find((m) => m.key === key)!;
const revenue = metric("tax.revenue.general");
const series = (publisher: string): PlaceSeries => ({
  jurisdictionId: publisher,
  code: publisher,
  name: publisher,
  slugPath: null,
  points: [],
  source: {
    key: "k",
    url: null,
    retrievedAt: "2026-11-12",
    publisher,
    page: "https://example.org",
  },
});

describe("who a place's figures are credited to", () => {
  it("credits the metric's series, and links its page, where its reader read them", () => {
    expect(figureSource(placesConfig, revenue, OECD_KEY, "CH")).toEqual({
      publisher: "OECD, Revenue Statistics",
      page: revenue.statistic!.series.url,
    });
    // A figure recorded before the OECD was one source keeps the same credit.
    expect(figureSource(placesConfig, revenue, "oecd-tax-ch", "CH").publisher).toBe(
      "OECD, Revenue Statistics",
    );
    // The World Bank's page narrows to the place.
    const governance = placesConfig.metrics.find(
      (m) => m.statistic?.series.read === "worldbank_indicators" && !m.retired,
    )!;
    expect(figureSource(placesConfig, governance, WORLD_BANK_KEY, "EE").page).toContain(
      "locations=EE",
    );
  });

  it("credits the source that supplied them otherwise, and links its own page", () => {
    // The OECD does not cover Liechtenstein; its statistics office does.
    const office = placesConfig.sources.find((s) => s.key === "li-fiscal-ratio")!;
    expect(figureSource(placesConfig, revenue, "li-fiscal-ratio", "LI")).toEqual({
      publisher: "Amt für Statistik, Liechtenstein",
      page: office.homepage,
    });
  });

  it("credits the series when the source is no longer registered", () => {
    expect(figureSource(placesConfig, revenue, "gone-source", "CH").publisher).toBe(
      "OECD, Revenue Statistics",
    );
  });

  it("names each publisher of the series shown once, or the metric's own when none is shown", () => {
    expect(publishersOf(revenue, [series("A"), series("B"), series("A")])).toEqual(["A", "B"]);
    expect(publishersOf(revenue, [])).toEqual(["OECD, Revenue Statistics"]);
  });
});

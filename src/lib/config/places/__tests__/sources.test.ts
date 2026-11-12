import { describe, expect, it } from "vitest";
import { placesConfig } from "@/lib/config/places";
import { definePlacesConfig, findSource } from "../schema";
import { WORLD_PACK } from "../countries/world";
import { OECD_KEY, WORLD_BANK_KEY } from "../world";

describe("finding the source a stored row names", () => {
  it("finds a source by its key, or by a key it was recorded under before", () => {
    expect(findSource(placesConfig, WORLD_BANK_KEY)?.key).toBe(WORLD_BANK_KEY);
    // Switzerland's figures were read by a source of its own until 2026-11-12.
    expect(findSource(placesConfig, "worldbank-wdi-ch")?.key).toBe(WORLD_BANK_KEY);
    expect(findSource(placesConfig, "oecd-tax-ee")?.key).toBe(OECD_KEY);
    expect(findSource(placesConfig, "no-such-source")).toBeUndefined();
  });

  it("refuses a former key that is a current key, or one two sources claim", () => {
    const [a, b] = placesConfig.sources.filter((s) => s.adapter === "fixture");
    const withSources = (sources: typeof placesConfig.sources) => () =>
      definePlacesConfig({ ...placesConfig, sources: [...sources] });
    expect(
      withSources(
        placesConfig.sources.map((s) => (s.key === a!.key ? { ...s, formerKeys: [b!.key] } : s)),
      ),
    ).toThrow(/is a current source's key/);
    expect(
      withSources(
        placesConfig.sources.map((s) =>
          s.key === a!.key || s.key === b!.key ? { ...s, formerKeys: ["gone-source"] } : s,
        ),
      ),
    ).toThrow(/claimed by two sources/);
  });

  it("refuses a pack that lists sources other than those that name it", () => {
    const [pack] = placesConfig.packs;
    expect(() =>
      definePlacesConfig({
        ...placesConfig,
        packs: placesConfig.packs.map((p) =>
          p.key === pack!.key ? { ...p, sources: [WORLD_BANK_KEY, "gone"] } : p,
        ),
      }),
    ).toThrow(/name the pack on the source instead/);
  });
});

/** Every metric key a source's options name, wherever its adapter keeps them. */
function metricsNamed(options: unknown): Set<string> {
  const text = JSON.stringify(options ?? {});
  return new Set(placesConfig.metrics.map((m) => m.key).filter((k) => text.includes(`"${k}"`)));
}

/** The countries a source states figures for: those its options name, else its packs'. */
function countriesOf(source: (typeof placesConfig.sources)[number]): Set<string> {
  const named = [
    ...JSON.stringify(source.options ?? {}).matchAll(/"scheme":"iso_3166_1","value":"([A-Z]{2})"/g),
  ].map((m) => m[1]!);
  if (named.length > 0) return new Set(named);
  return new Set(
    source.packs.flatMap((key) => {
      const pack = placesConfig.packs.find((p) => p.key === key);
      return pack && pack.key !== WORLD_PACK && pack.region ? [pack.region] : [];
    }),
  );
}

describe("who writes each statistic", () => {
  const live = placesConfig.metrics.filter((m) => m.statistic && !m.retired);

  it("every statistic a reader can chart is read by some source", () => {
    const read = new Set(placesConfig.sources.flatMap((s) => [...metricsNamed(s.options)]));
    expect(live.filter((m) => !read.has(m.key)).map((m) => m.key)).toEqual([]);
  });

  // The facts diff keys a figure on its place, metric and period, not its source: two sources
  // stating one statistic for one country would replace each other's figure on every run.
  it("no two sources state one statistic for the same country", () => {
    const clashes = live.flatMap((metric) => {
      const writers = placesConfig.sources.filter((s) => metricsNamed(s.options).has(metric.key));
      return writers.flatMap((a, i) =>
        writers.slice(i + 1).flatMap((b) => {
          const both = [...countriesOf(a)].filter((c) => countriesOf(b).has(c));
          return both.length > 0
            ? [`${metric.key}: ${a.key} and ${b.key} (${both.join(", ")})`]
            : [];
        }),
      );
    });
    expect(clashes).toEqual([]);
  });

  it("knows the countries of a national source and of a country's own source", () => {
    const oecd = placesConfig.sources.find((s) => s.key === OECD_KEY)!;
    expect(countriesOf(oecd).has("CH")).toBe(true);
    expect(countriesOf(oecd).has("LI")).toBe(false);
    expect([
      ...countriesOf(placesConfig.sources.find((s) => s.key === "li-fiscal-ratio")!),
    ]).toEqual(["LI"]);
  });
});

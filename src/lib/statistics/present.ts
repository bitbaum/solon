/**
 * How a statistic is shown: its values on a chart's scale, its publisher's
 * page for one place, and which metrics are statistics at all. Pure, so the
 * pages and the tests read one answer.
 */
import type { Metric, PlacesConfig } from "@/lib/config/places/schema";
import type { PlaceSeries } from "./read";

/** The metrics a reader can chart, in catalog order. */
export const statisticMetrics = (config: PlacesConfig): Metric[] =>
  config.metrics.filter((m) => m.statistic && !m.retired);

export const findStatistic = (config: PlacesConfig, key: string): Metric | undefined =>
  statisticMetrics(config).find((m) => m.key === key);

/** A value as charts show it: a ratio in per cent, anything else as stored. */
export const chartValue = (metric: Pick<Metric, "unit">, value: number): number =>
  metric.unit === "ratio" ? Math.round(value * 10000) / 100 : Math.round(value * 1000) / 1000;

/** The publisher's own page for the series, narrowed to one place where the publisher can. */
export function seriesPageFor(metric: Metric, placeCode: string | null): string {
  const url = new URL(metric.statistic!.series.url);
  if (placeCode && url.hostname === "data.worldbank.org") {
    url.searchParams.set("locations", placeCode);
  }
  return url.toString();
}

/** The places a query names (`places=CH,EE`), kept only where the metric has a series. */
export function pickPlaces(
  series: readonly PlaceSeries[],
  query: string | undefined,
): PlaceSeries[] {
  const wanted = new Set(
    (query ?? "")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean),
  );
  return wanted.size === 0 ? [...series] : series.filter((s) => wanted.has(s.code));
}

/** A year range from a query, clamped to what the series hold. */
export function pickYears(
  series: readonly PlaceSeries[],
  from: string | undefined,
  to: string | undefined,
): { from: number | null; to: number | null } {
  const years = series.flatMap((s) => s.points.map((p) => p.year));
  if (years.length === 0) return { from: null, to: null };
  const lo = Math.min(...years);
  const hi = Math.max(...years);
  const clamp = (v: string | undefined, fallback: number) => {
    const n = Number(v);
    return v && Number.isInteger(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
  };
  const a = clamp(from, lo);
  const b = clamp(to, hi);
  return a <= b ? { from: a, to: b } : { from: b, to: a };
}

/** The latest point of a series no later than `to`. */
export const latestPoint = (series: PlaceSeries, to: number | null = null) =>
  [...series.points].reverse().find((p) => to === null || p.year <= to) ?? null;

/**
 * A metric's path segment: its key with dots as hyphens (`tax-income-top_rate`),
 * since a path with a dot reads as a file and skips the locale routing. Keys
 * are dotted lower snake case, so no key holds a hyphen and the mapping is
 * reversible.
 */
export const metricSlug = (key: string): string => key.replaceAll(".", "-");
export const metricFromSlug = (slug: string): string => slug.replaceAll("-", ".");

/** The path of a statistic's page, without the locale. */
export const metricPath = (key: string): string => `/statistics/${metricSlug(key)}`;

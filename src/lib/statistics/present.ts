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

/** A place's values just before a change, in the year it applies, and a few years on. */
export interface ComparisonRow {
  code: string;
  name: string;
  /** Whether this is the place the event is about. */
  focal: boolean;
  before: { year: number; value: number } | null;
  at: { year: number; value: number } | null;
  later: { year: number; value: number } | null;
  /** `at` minus `before`, in the metric's own terms; null where either is missing. */
  change: number | null;
}

const valueIn = (series: PlaceSeries, year: number) => {
  const p = series.points.find((x) => x.year === year);
  return p ? { year, value: p.value } : null;
};

/**
 * What every place's series did around `pivot` (the first year a change
 * applies, or the year of a vote): the year before, the year itself and
 * `later` years on, where the series has them. It states the numbers and
 * nothing about why; the focal place is listed first.
 */
export function compareAround(
  series: readonly PlaceSeries[],
  focalCode: string,
  pivot: number,
  later = 3,
): ComparisonRow[] {
  return series
    .map((s) => {
      const before = valueIn(s, pivot - 1);
      const at = valueIn(s, pivot);
      return {
        code: s.code,
        name: s.name,
        focal: s.code === focalCode,
        before,
        at,
        later: valueIn(s, pivot + later),
        change: before && at ? at.value - before.value : null,
      };
    })
    .sort((a, b) => Number(b.focal) - Number(a.focal) || a.name.localeCompare(b.name));
}

/**
 * A series cut at a change into the part before and the part from the year it
 * applies, the two sharing the last year before so the line stays joined. A
 * chart draws the two in different colours: the break is what the reader sees.
 */
export function splitAt<T extends { year: number }>(
  points: readonly T[],
  pivot: number,
): { before: T[]; from: T[] } {
  const before = points.filter((p) => p.year < pivot);
  const from = points.filter((p) => p.year >= pivot);
  const join = before.at(-1);
  return { before, from: join && from.length > 0 ? [join, ...from] : from };
}

/** The years a chart around a change shows: `span` either side, within what the series hold. */
export function windowAround(
  series: readonly PlaceSeries[],
  pivot: number,
  span = 8,
): { from: number; to: number } {
  const years = series.flatMap((s) => s.points.map((p) => p.year));
  if (years.length === 0) return { from: pivot - span, to: pivot + span };
  return {
    from: Math.max(Math.min(...years), pivot - span),
    to: Math.min(Math.max(...years), pivot + span),
  };
}

/** The path of an event's page, without the locale. */
export const eventPath = (slug: string): string => `/statistics/event/${slug}`;

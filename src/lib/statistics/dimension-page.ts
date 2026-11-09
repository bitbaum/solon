/**
 * Everything the page of one dimension shows: each layer's measures with their
 * series, a pair of measures set against each other (and the gap between them
 * where they share a unit), and one place's measures over time on one axis.
 */
import { DIMENSIONS } from "@/lib/config/statistics/dimensions";
import type { Metric, PlacesConfig } from "@/lib/config/places/schema";
import type { Database } from "@/lib/db/client";
import { scatterPoints, type ScatterPoint } from "./compare";
import { measuresOf, type Dimension, type DimensionLayer } from "./dimensions";
import { findStatistic, latestPoint } from "./present";
import { RUBRICS } from "@/lib/config/statistics/rubrics";
import { DIMENSION_LAYERS } from "./dimensions";
import { checkScatter, checkSeries, screenSeries, type SanityFinding } from "./sanity";
import { loadAssessments, loadSeries, type PlaceSeries } from "./read";

export interface Measure {
  metric: Metric;
  layer: DimensionLayer;
  series: PlaceSeries[];
}

export interface GapRow {
  code: string;
  name: string;
  year: number;
  x: number;
  y: number;
  /** `y - x`, in the metric's own terms, only where the two share a unit. */
  gap: number | null;
}

export async function loadDimensionPage(
  db: Database,
  config: PlacesConfig,
  key: string,
  locale: string,
  query: { x?: string; y?: string; p?: string },
) {
  const dimension: Dimension | undefined = DIMENSIONS.find((d) => d.key === key);
  if (!dimension) return null;
  const measures: Measure[] = [];
  const withheld: SanityFinding[] = [];
  for (const { metric: mk, layer } of measuresOf(dimension)) {
    const metric = findStatistic(config, mk);
    if (!metric) continue;
    const screened = screenSeries(metric.plausible, await loadSeries(db, config, mk, locale));
    withheld.push(...screened.findings);
    measures.push({ metric, layer, series: screened.series });
  }
  // Features coded from the law, by rubric, each with the codings that place a country on its scale.
  const rubricKeys = DIMENSION_LAYERS.flatMap((layer) => dimension.layers[layer].rubrics);
  const assessments = await loadAssessments(db, config, rubricKeys, locale);
  const coded = DIMENSION_LAYERS.flatMap((layer) =>
    dimension.layers[layer].rubrics.flatMap((key) => {
      const rubric = RUBRICS.find((r) => r.key === key);
      return rubric
        ? [{ layer, rubric, rows: assessments.filter((a) => a.body.rubric === key) }]
        : [];
    }),
  );
  const byKey = new Map(measures.map((m) => [m.metric.key, m]));
  // The default pair: the headline measure against the next one the dimension names.
  const x = byKey.get(query.x ?? "") ?? measures[0];
  const y = byKey.get(query.y ?? "") ?? measures.find((m) => m !== x) ?? x;
  const points: ScatterPoint[] = x && y ? scatterPoints(x.series, y.series) : [];
  const sameUnit = Boolean(x && y && x.metric.unit === y.metric.unit);
  const gaps: GapRow[] = points.map((p) => ({
    code: p.code,
    name: p.name,
    year: p.year,
    x: p.x,
    y: p.y,
    gap: sameUnit ? p.y - p.x : null,
  }));
  // One place over time: those measures that share the first measure's unit, so one axis serves.
  const places = [
    ...new Map(measures.flatMap((m) => m.series.map((s) => [s.code, s.name] as const))),
  ];
  const place = places.find(([code]) => code === query.p)?.[0] ?? places[0]?.[0] ?? null;
  const timeMeasures = measures.filter((m) => x && m.metric.unit === x.metric.unit);
  // What would mislead on this page: figures left out, places read at different dates, a thin scatter.
  const sanity: SanityFinding[] = [
    ...withheld,
    ...(x ? checkSeries(x.series) : []),
    ...checkScatter(points),
  ];
  return {
    dimension,
    sanity,
    measures,
    coded,
    x: x ?? null,
    y: y ?? null,
    points,
    gaps,
    sameUnit,
    places: places.map(([code, name]) => ({ code, name })),
    place,
    timeMeasures,
    latest: (m: Measure, code: string) => {
      const s = m.series.find((z) => z.code === code);
      return s ? latestPoint(s) : null;
    },
  };
}

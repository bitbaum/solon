/**
 * Everything the page of one law event shows: the event, the numbers around
 * it for its place and its peers, the act in Solon's law register where it is
 * held, and the events beside it.
 */
import type { PlacesConfig } from "@/lib/config/places/schema";
import type { Database } from "@/lib/db/client";
import { compareAround, findStatistic, windowAround, type ComparisonRow } from "./present";
import { actFor, loadEvents, loadSeries, type EventRow, type PlaceSeries } from "./read";
import type { Metric } from "@/lib/config/places/schema";

export interface EventChart {
  metric: Metric;
  series: PlaceSeries[];
  comparison: ComparisonRow[];
  window: { from: number; to: number };
}

/** The year a chart pivots on: the first year the change applies, else the year of the decision. */
export const pivotYear = (body: { on: string; effective?: string }): number =>
  Number((body.effective ?? body.on).slice(0, 4));

export async function loadEventPage(
  db: Database,
  config: PlacesConfig,
  slug: string,
  locale: string,
) {
  const events = await loadEvents(db, config, locale);
  const event = events.find((e) => e.body.slug === slug);
  if (!event) return null;
  const pivot = pivotYear(event.body);
  const charts: EventChart[] = [];
  for (const key of event.body.series) {
    const metric = findStatistic(config, key);
    if (!metric) continue;
    const series = await loadSeries(db, config, key, locale);
    if (!series.some((s) => s.code === event.placeCode)) continue;
    charts.push({
      metric,
      series,
      comparison: compareAround(series, event.placeCode, pivot),
      window: windowAround(series, pivot),
    });
  }
  const act = await actFor(db, event.body.act, locale);
  const related = events
    .filter(
      (e) =>
        e.recordKey !== event.recordKey &&
        (e.jurisdictionId === event.jurisdictionId ||
          e.body.series.some((s) => event.body.series.includes(s))),
    )
    .slice(0, 6);
  return { event, charts, act, related, pivot };
}

/** The events of a list that match a place code and a kind; an empty filter matches all. */
export function filterEvents(
  events: readonly EventRow[],
  { place, kind }: { place?: string; kind?: string },
): EventRow[] {
  return events.filter(
    (e) => (!place || e.placeCode === place) && (!kind || e.body.category === kind),
  );
}

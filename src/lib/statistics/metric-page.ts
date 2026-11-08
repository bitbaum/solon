/**
 * Everything the page of one statistic shows, read once, so the live page
 * and a saved view render from the same loader.
 */
import type { PlacesConfig } from "@/lib/config/places/schema";
import type { Database } from "@/lib/db/client";
import { findStatistic, pickPlaces, pickYears } from "./present";
import { currentRecords, linkedActs, loadSeries, placeLabels } from "./read";
import type { EnforcementBody, EventBody } from "./records";
import type { ViewSpec } from "./views";

export interface MetricPageQuery {
  /** Place codes; empty: every place with a series. */
  places: string[];
  from?: string;
  to?: string;
}

/** `p=CH&p=EE` or `places=CH,EE`, as codes. */
export function placesFromQuery(q: Record<string, string | string[] | undefined>): string[] {
  const raw = [q.p, q.places].flatMap((v) => (Array.isArray(v) ? v : v ? [v] : []));
  return [
    ...new Set(
      raw
        .flatMap((v) => v.split(","))
        .map((c) => c.trim())
        .filter((c) => /^[A-Za-z0-9_-]{1,40}$/.test(c)),
    ),
  ];
}

export async function loadMetricPage(
  db: Database,
  config: PlacesConfig,
  metricKey: string,
  locale: string,
  query: MetricPageQuery,
) {
  const metric = findStatistic(config, metricKey);
  if (!metric) return null;
  const all = await loadSeries(db, config, metric.key, locale);
  const shown = pickPlaces(all, query.places.join(","));
  const years = pickYears(shown, query.from, query.to);
  const shownIds = new Set(shown.map((s) => s.jurisdictionId));
  const records = (await currentRecords(db, { metricKeys: [metric.key] })).filter(
    (r) => r.jurisdictionId === null || shownIds.has(r.jurisdictionId),
  );
  const acts = await linkedActs(db, records, locale);
  const ids = [...new Set(records.flatMap((r) => (r.jurisdictionId ? [r.jurisdictionId] : [])))];
  const labels = ids.length > 0 ? await placeLabels(db, config, ids, locale) : new Map();
  const placeNames = new Map<string, string>([...labels].map(([id, l]) => [id, l.name]));
  const events = records
    .filter((r) => r.kind === "event")
    .map((r) => ({ body: r.body as EventBody }));
  const enforcement = records
    .filter((r) => r.kind === "enforcement")
    .map((r) => ({
      body: r.body as EnforcementBody,
      placeName: placeNames.get(r.jurisdictionId ?? "") ?? "",
    }));
  const spec: ViewSpec = {
    version: 1,
    metric: metric.key,
    places: query.places.length > 0 ? shown.map((s) => s.code) : [],
    from: query.from ? years.from : null,
    to: query.to ? years.to : null,
    axis: null,
  };
  return { metric, all, shown, years, acts, events, enforcement, placeNames, spec };
}

/** The query that reopens a spec on the live page. */
export function specQuery(spec: ViewSpec): string {
  const params = new URLSearchParams();
  for (const code of spec.places) params.append("p", code);
  if (spec.from !== null) params.set("from", String(spec.from));
  if (spec.to !== null) params.set("to", String(spec.to));
  const s = params.toString();
  return s ? `?${s}` : "";
}

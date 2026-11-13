/**
 * Where a place's figures come from: who published them and the page a reader
 * checks them on. Imports only the configuration, so the loader (read.ts) and
 * the presentation (present.ts) can both use it.
 */
import { findSource, type Metric, type PlacesConfig } from "@/lib/config/places/schema";

/** The publisher's own page for the series, narrowed to one place where the publisher can. */
export function seriesPageFor(metric: Metric, placeCode: string | null): string {
  const url = new URL(metric.statistic!.series.url);
  if (placeCode && url.hostname === "data.worldbank.org") {
    url.searchParams.set("locations", placeCode);
  }
  return url.toString();
}

/**
 * Who published a place's figures, and the page a reader checks them on: the metric's own
 * series where its reader read them, else the source that supplied them. Liechtenstein's tax
 * revenue is its statistics office's; the OECD, whose series the statistic is defined by, does
 * not cover it. A source no longer registered is credited to the series.
 */
export function figureSource(
  config: PlacesConfig,
  metric: Metric,
  sourceKey: string,
  placeCode: string | null,
): { publisher: string; page: string } {
  const source = findSource(config, sourceKey);
  const series = metric.statistic?.series;
  if (series && (!source || source.adapter === series.read)) {
    return { publisher: series.publisher, page: seriesPageFor(metric, placeCode) };
  }
  return { publisher: source?.publisher ?? sourceKey, page: source?.homepage ?? "" };
}

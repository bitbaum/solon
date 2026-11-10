/**
 * What the statistics components share: the translator type, how a day and a
 * unit are written, and the props of the metric page. Kept out of
 * metric-view.tsx so the parts that page is made of do not import it back.
 */
import type { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import type { Metric } from "@/lib/config/places/schema";
import type { EventRow, LinkedAct, PlaceSeries } from "@/lib/statistics/read";
import type { EnforcementBody } from "@/lib/statistics/records";
import type { SanityFinding } from "@/lib/statistics/sanity";
import type { ViewSpec } from "@/lib/statistics/views";
import type { MapValue } from "./metric-map";

export type StatisticsTranslator = ReturnType<typeof useTranslations<"Statistics">>;

export interface MetricViewProps {
  metric: Metric;
  locale: Locale;
  /** Every place with a series, for the chooser. */
  all: PlaceSeries[];
  /** The places shown. */
  shown: PlaceSeries[];
  years: { from: number | null; to: number | null };
  acts: LinkedAct[];
  events: EventRow[];
  enforcement: { body: EnforcementBody; placeName: string }[];
  placeNames: Map<string, string>;
  /** The latest value per place, for the map. */
  mapValues: MapValue[];
  /** The spec of what is on screen, for "save this view". */
  spec: ViewSpec;
  /** What the checks on the figures found: warnings, and figures left out. */
  sanity: SanityFinding[];
  /** The page's own address, absolute, for the texts that cite it. */
  selfUrl: string;
  /** Shown above the chart on a saved view's page. */
  banner?: React.ReactNode;
  t: StatisticsTranslator;
}

/** A day as the reader's language writes it; an ISO date, read as UTC so no timezone moves it. */
export function formatDay(day: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${day}T00:00:00Z`),
  );
}

/** The unit a chart names: per cent for a ratio, "per 100,000" for a rate, none otherwise. */
export function unitLabel(metric: Pick<Metric, "unit">, t: StatisticsTranslator): string {
  return metric.unit === "ratio" || metric.unit === "per_100k" ? t(`units.${metric.unit}`) : "";
}

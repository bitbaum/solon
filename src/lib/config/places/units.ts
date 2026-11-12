/**
 * What each metric unit means wherever a figure is shown or stored: one rule
 * a unit, so a statistic in a new unit is a line here and nothing elsewhere.
 * The words a unit is shown with are messages (`Statistics.units.<label>`),
 * translated with the rest of the page.
 */
import type { MetricUnit } from "@/lib/places/vocabulary";

export interface UnitRule {
  /** A stored value as charts and figures show it: a ratio (0.125) in per cent (12.5). */
  scale: number;
  /** Decimals a chart keeps. */
  chartDecimals: number;
  /** Decimals a profile figure shows. */
  figureDecimals: number;
  /** Publishers print it in per cent: a published figure is divided by 100 to be stored. */
  publishedAsPercent: boolean;
  /** Shown as a percentage, and a change between two values is in percentage points. */
  percent: boolean;
  /** The words after the number, by their key under `Statistics.units`; none for a plain number. */
  label: "ratio" | "per_100k" | null;
}

export const UNITS: Record<MetricUnit, UnitRule> = {
  ratio: {
    scale: 100,
    chartDecimals: 2,
    figureDecimals: 1,
    publishedAsPercent: true,
    percent: true,
    label: "ratio",
  },
  per_100k: {
    scale: 1,
    chartDecimals: 3,
    figureDecimals: 1,
    publishedAsPercent: false,
    percent: false,
    label: "per_100k",
  },
  count: {
    scale: 1,
    chartDecimals: 3,
    figureDecimals: 0,
    publishedAsPercent: false,
    percent: false,
    label: null,
  },
  currency: {
    scale: 1,
    chartDecimals: 3,
    figureDecimals: 0,
    publishedAsPercent: false,
    percent: false,
    label: null,
  },
  none: {
    scale: 1,
    chartDecimals: 3,
    figureDecimals: 0,
    publishedAsPercent: false,
    percent: false,
    label: null,
  },
};

/** A stored value as charts show it, rounded as its unit keeps it. */
export function scaled(unit: MetricUnit, value: number): number {
  const rule = UNITS[unit];
  const places = 10 ** rule.chartDecimals;
  return Math.round(value * rule.scale * places) / places;
}

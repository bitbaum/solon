/**
 * How a budget's numbers read: money in the reader's currency, converted at
 * the budget year's average rate; a share of GDP as a percentage. Money that
 * cannot be converted (no rate for that year) is shown in its own currency,
 * and the page says why, never at another year's rate.
 */
import { convert, formatMoney, type RateTable } from "@/lib/money";
import type { Budget } from "./model";

/** Who is reading: their language, the currency they want money in, and the rates to get there. */
export interface MoneyDisplay {
  locale: string;
  currency: string;
  rates: RateTable;
}

export const formatShare = (share: number, locale: string, digits = 1) =>
  new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: digits }).format(share);

/** A budget's figure for the reader. */
export function formatBudgetValue(value: number, budget: Budget, display: MoneyDisplay): string {
  const { measure } = budget;
  if (measure.kind === "share_of_gdp") return formatShare(value, display.locale);
  const amount = value * measure.unit;
  const converted = convert(display.rates, amount, measure.currency, display.currency, budget.year);
  return converted
    ? formatMoney(converted.amount, converted.currency, display.locale)
    : formatMoney(amount, measure.currency, display.locale);
}

/** A figure exactly as its publisher states it, in its own currency: for the publisher's own lines. */
export function formatOriginal(value: number, budget: Budget, locale: string): string {
  const { measure } = budget;
  return measure.kind === "share_of_gdp"
    ? formatShare(value, locale)
    : formatMoney(value * measure.unit, measure.currency, locale);
}

/** What converting this budget's money for the reader means: from what, at which year's rate, or why not. */
export function conversionOf(
  budget: Budget,
  display: MoneyDisplay,
): { from: string; to: string; year: number; converted: boolean; sources: string[] } | null {
  const { measure } = budget;
  if (measure.kind !== "money" || measure.currency === display.currency) return null;
  const c = convert(display.rates, 1, measure.currency, display.currency, budget.year);
  return {
    from: measure.currency,
    to: display.currency,
    year: budget.year,
    converted: c !== null,
    sources: c?.sources ?? [],
  };
}

/** A figure as a share of the economy, when the budget knows its GDP. */
export const ofGdp = (value: number, budget: Budget): number | null =>
  budget.gdp && budget.gdp > 0 ? value / budget.gdp : null;

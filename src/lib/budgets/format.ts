/** How a budget's numbers read: shares of GDP as a percentage, money compact in its currency. */
import type { BudgetMeasure } from "./model";

export const formatShare = (share: number, locale: string, digits = 1) =>
  new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: digits }).format(share);

export function formatBudgetValue(value: number, measure: BudgetMeasure, locale: string): string {
  if (measure.kind === "share_of_gdp") return formatShare(value, locale);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: measure.currency,
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value * measure.unit);
}

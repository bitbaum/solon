/**
 * Converting a year's amount from one currency to another, through the
 * table's base, at that year's average rates. A conversion either has both
 * rates for the year or does not happen: no rate of another year is borrowed,
 * so a figure is never shown at a rate it was not earned at.
 */
import { perBase, type RateTable } from "./rates";

export interface Converted {
  amount: number;
  currency: string;
  year: number;
  /** The table's sources the conversion used (none when nothing was converted). */
  sources: string[];
}

export function convert(
  table: RateTable,
  amount: number,
  from: string,
  to: string,
  year: number,
): Converted | null {
  if (from === to) return { amount, currency: to, year, sources: [] };
  const fromRate = perBase(table, from, year);
  const toRate = perBase(table, to, year);
  if (fromRate === null || toRate === null) return null;
  const sources = [from, to]
    .filter((c) => c !== table.base)
    .map((c) => table.rates[c]![String(year)]!.source);
  return {
    amount: (amount / fromRate) * toRate,
    currency: to,
    year,
    sources: [...new Set(sources)],
  };
}

/** The years a currency can be converted in, newest first. */
export const yearsFor = (table: RateTable, cur: string): number[] =>
  cur === table.base
    ? []
    : Object.keys(table.rates[cur] ?? {})
        .map(Number)
        .sort((a, b) => b - a);

/**
 * Exchange rates as data: for each currency and year, how many units of it
 * one euro bought on average that year, and which publisher says so. Annual
 * averages, because what is converted here are yearly figures (a budget, a
 * year's GDP); a day's rate would make a year's budget depend on the day.
 *
 * Self-contained (zod only), so it can move to a fleet package unchanged.
 */
import { z } from "zod";

const currency = z.string().regex(/^[A-Z]{3}$/, "an ISO 4217 code");

export const rateTableSchema = z.object({
  /** The currency every rate is quoted against. */
  base: currency,
  generatedOn: z.iso.date(),
  sources: z
    .array(
      z.object({
        key: z.string().regex(/^[a-z0-9-]+$/),
        publisher: z.string().min(1),
        /** What was read, and how a yearly figure was made from it. */
        dataset: z.string().min(1),
        url: z.url({ protocol: /^https$/ }),
        licence: z.string().min(1),
        read: z.iso.date(),
      }),
    )
    .min(1),
  /** currency → year → units of the currency per one unit of the base, and the source key. */
  rates: z.record(
    currency,
    z.record(
      z.string().regex(/^\d{4}$/),
      z.object({ perBase: z.number().positive(), source: z.string().min(1) }),
    ),
  ),
});
export type RateTable = z.infer<typeof rateTableSchema>;

/** A table, checked: every rate names a source the table lists, and the base is worth one of itself. */
export function defineRateTable(input: unknown): RateTable {
  const table = rateTableSchema.parse(input);
  const sources = new Set(table.sources.map((s) => s.key));
  for (const [cur, years] of Object.entries(table.rates)) {
    for (const [year, rate] of Object.entries(years)) {
      if (!sources.has(rate.source)) {
        throw new Error(`rates: ${cur} ${year} names an unknown source "${rate.source}"`);
      }
    }
  }
  if (table.rates[table.base]) throw new Error("rates: the base currency has no rate of its own");
  return table;
}

/** Units of `cur` per one unit of the base in `year`; 1 for the base; null when the table has none. */
export function perBase(table: RateTable, cur: string, year: number): number | null {
  if (cur === table.base) return 1;
  return table.rates[cur]?.[String(year)]?.perBase ?? null;
}

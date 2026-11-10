/**
 * The exchange rates Solon converts with (data/money/rates.json, written by
 * `pnpm run money:rates` from official publishers) and the currencies a
 * reader may show money in. One table and one list, so every page that shows
 * money shows it the same way.
 */
import { defineRateTable } from "@/lib/money";
import { LICENCES } from "@/lib/config/places/licences";
import data from "../../../data/money/rates.json";

export const RATES = defineRateTable(data);

for (const source of RATES.sources) {
  if (!LICENCES.some((l) => l.spdx === source.licence)) {
    throw new Error(`rates: source "${source.key}" has a licence the policy does not list`);
  }
}

/** The currencies a reader can choose to see money in, the first the default. */
export const DISPLAY_CURRENCIES = ["CHF", "EUR", "USD", "GBP", "RUB", "GEL"] as const;
export type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number];

export const displayCurrencyOf = (asked: string | undefined | null): DisplayCurrency =>
  (DISPLAY_CURRENCIES as readonly string[]).includes(asked ?? "")
    ? (asked as DisplayCurrency)
    : DISPLAY_CURRENCIES[0];

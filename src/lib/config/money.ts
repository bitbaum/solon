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

/**
 * The currencies a reader can choose to see money in. The first is the default:
 * the US dollar, the unit statistics are most often read in across countries.
 */
export const DISPLAY_CURRENCIES = ["USD", "EUR", "CHF", "GBP", "RUB", "GEL"] as const;
export type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number];

/** The cookie that remembers the reader's choice across the site, set by /api/preferences/currency. */
export const CURRENCY_COOKIE = "solon-currency";

const offered = (c: string | undefined | null): c is DisplayCurrency =>
  (DISPLAY_CURRENCIES as readonly string[]).includes(c ?? "");

/** The currency to show: the one the address asks for, else the one the reader chose before, else the default. */
export const displayCurrencyOf = (
  asked: string | undefined | null,
  remembered?: string | null,
): DisplayCurrency =>
  offered(asked) ? asked : offered(remembered) ? remembered : DISPLAY_CURRENCIES[0];

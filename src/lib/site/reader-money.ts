/**
 * How money is shown to the reader of this request: their language, the
 * currency the address asks for or they chose before (a cookie), and the
 * rates. One function, so every page that shows money shows it the same way.
 */
import { cookies } from "next/headers";
import type { MoneyDisplay } from "@/lib/budgets/format";
import { CURRENCY_COOKIE, RATES, displayCurrencyOf } from "@/lib/config/money";

export async function readerMoney(locale: string, asked?: string | null): Promise<MoneyDisplay> {
  const remembered = (await cookies()).get(CURRENCY_COOKIE)?.value;
  return { locale, currency: displayCurrencyOf(asked, remembered), rates: RATES };
}

/** The address that remembers a currency and comes back to `next` (a path on this site). */
export const chooseCurrencyHref = (currency: string, next: string) =>
  `/api/preferences/currency?${new URLSearchParams({ c: currency, next }).toString()}`;

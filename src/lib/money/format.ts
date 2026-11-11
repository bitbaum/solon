/** Money for a reader: compact ("CHF 2.1 bn"), in their language's own way of writing it. */
export const formatMoney = (amount: number, currency: string, locale: string): string =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    notation: "compact",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

const exact = (amount: number, currency: string, locale: string) =>
  new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(
    amount,
  );

/**
 * An amount in the currency it is set in, and beside it, when the reader reads
 * money in another, roughly what it is in theirs: "CHF 30,000 (≈ US$33,500)".
 * `converted` is the amount in the reader's currency, or null when there is no
 * rate to give one; then only the amount itself is shown.
 */
export function formatWithEquivalent(
  amount: number,
  currency: string,
  converted: number | null,
  readerCurrency: string,
  locale: string,
): string {
  const own = exact(amount, currency, locale);
  if (currency === readerCurrency || converted === null) return own;
  return `${own} (≈ ${exact(converted, readerCurrency, locale)})`;
}

/** Money for a reader: compact ("CHF 2.1 bn"), in their language's own way of writing it. */
export const formatMoney = (amount: number, currency: string, locale: string): string =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    notation: "compact",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

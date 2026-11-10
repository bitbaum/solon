/**
 * A calendar day (YYYY-MM-DD, as the register stores it) in the reader's
 * convention: 23.10.2026 in German, 23/10/2026 in French and Italian,
 * 23.10.2026 in Russian. English keeps the ISO form, which is unambiguous.
 * A day is formatted in UTC so that no time zone moves it to its neighbour.
 * Anything that is not a plain day is returned as it came.
 */
export function formatDay(iso: string, locale: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match || locale === "en") return iso;
  const [, y, m, d] = match;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  if (Number.isNaN(date.getTime()) || date.getUTCMonth() !== Number(m) - 1) return iso;
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

import { chooseCurrencyHref } from "@/lib/site/reader-money";

/**
 * The currencies a reader can see money in. Choosing one remembers it for the
 * whole site and comes back to this page (`next`, the page's own path).
 */
export default function CurrencyPicker({
  label,
  current,
  currencies,
  next,
}: {
  label: string;
  current: string;
  currencies: readonly string[];
  next: string;
}) {
  return (
    <nav aria-label={label} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <span className="text-fg-tertiary">{label}:</span>
      {currencies.map((c) => (
        // A plain link: the preference route sets the cookie and redirects back.
        <a
          key={c}
          href={chooseCurrencyHref(c, next)}
          aria-current={c === current ? "true" : undefined}
          className={
            c === current ? "font-semibold text-fg-primary" : "text-fg-secondary hover:underline"
          }
        >
          {c}
        </a>
      ))}
    </nav>
  );
}

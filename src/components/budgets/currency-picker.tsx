import { Link } from "@/i18n/navigation";

/** The currencies a reader can see money in, as links that keep the rest of the address. */
export default function CurrencyPicker({
  label,
  current,
  currencies,
  hrefFor,
}: {
  label: string;
  current: string;
  currencies: readonly string[];
  hrefFor: (currency: string) => string;
}) {
  return (
    <nav aria-label={label} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <span className="text-fg-tertiary">{label}:</span>
      {currencies.map((c) => (
        <Link
          key={c}
          href={hrefFor(c)}
          aria-current={c === current ? "true" : undefined}
          className={
            c === current ? "font-semibold text-fg-primary" : "text-fg-secondary hover:underline"
          }
        >
          {c}
        </Link>
      ))}
    </nav>
  );
}

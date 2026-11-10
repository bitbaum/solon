import type { SanityFinding } from "@/lib/statistics/sanity";
import type { StatisticsTranslator } from "./shared";

const years = (list: number[]) =>
  list.length > 6 ? `${list.slice(0, 5).join(", ")} … ${list.at(-1)}` : list.join(", ");

function line(f: SanityFinding, t: StatisticsTranslator): string {
  const places = f.places.join(", ");
  const base = { places, years: years(f.years), from: f.years[0] ?? "", to: f.years.at(-1) ?? "" };
  const detail = f.detail as Record<string, string | number>;
  return f.severity === "withheld"
    ? t(`sanity.withheld.${f.kind as "non_finite" | "implausible"}`, { ...base, ...detail })
    : t(`sanity.warn.${f.kind as "year_spread"}`, { ...base, ...detail });
}

/**
 * Whether the picture can bear the weight a reader would put on it: a figure
 * that cannot be real (withheld from the chart, listed here) and comparisons
 * that mislead (places read at different years, a trend from two points).
 * Shown above the chart, where it is read first, only when there is something
 * to say.
 */
export default function SanityPanel({
  findings,
  t,
}: {
  findings: SanityFinding[];
  t: StatisticsTranslator;
}) {
  if (findings.length === 0) return null;
  return (
    <section
      aria-labelledby="sanity-title"
      className="space-y-2 rounded-surface border border-default bg-surface-raised p-5"
    >
      <h2 id="sanity-title" className="text-lg font-semibold text-fg-primary">
        {t("sanity.title")}
      </h2>
      <ul className="list-disc space-y-1 pl-5 text-sm text-fg-secondary">
        {findings.map((f, i) => (
          <li key={`${f.kind}-${i}`}>{line(f, t)}</li>
        ))}
      </ul>
      <p className="mb-0 text-xs text-fg-tertiary">{t("sanity.how")}</p>
    </section>
  );
}

import { BarChart } from "@bitbaum/chartkit/react";
import { breakdown } from "@/lib/budgets/analysis";
import { formatBudgetValue } from "@/lib/budgets/format";
import type { Budget } from "@/lib/budgets/model";
import { categoryLabel, categoryOf, type Taxonomy } from "@/lib/budgets/taxonomy";
import { localized } from "@/lib/places/place-view";
import type { BudgetsTranslator } from "./translator";

interface BudgetBreakdownProps {
  budget: Budget;
  taxonomy: Taxonomy;
  /** The heading: what this breakdown answers. */
  title: string;
  caption: string;
  /** Where a category's own series can be charted across places, when it has one. */
  statisticHref?: (code: string) => string | undefined;
  locale: string;
  t: BudgetsTranslator;
}

/**
 * One side of a budget, by category: each division's share of the total as a
 * ranked bar with its amount, then each division opened into its groups. What
 * the categories do not account for is shown as such, never spread over them,
 * and a division its publisher does not break down says so.
 */
export default function BudgetBreakdown({
  budget,
  taxonomy,
  title,
  caption,
  statisticHref,
  locale,
  t,
}: BudgetBreakdownProps) {
  const top = breakdown(budget, taxonomy);
  if (top.value === null || top.rows.length === 0) return null;
  const nameOf = (code: string) => {
    const c = categoryOf(taxonomy, code);
    return c ? localized(categoryLabel(c), locale) : code;
  };
  const amount = (v: number) => formatBudgetValue(v, budget.measure, locale);
  const rows = (b: ReturnType<typeof breakdown>, linked: boolean) => [
    ...b.rows.map((r) => ({
      label: nameOf(r.code),
      value: r.share === null ? null : Math.round(r.share * 1000) / 10,
      note: amount(r.value),
      href: linked ? statisticHref?.(r.code) : undefined,
    })),
    ...(b.rest !== 0 && b.value
      ? [
          {
            label: t("rest"),
            value: Math.round((b.rest / b.value) * 1000) / 10,
            note: amount(b.rest),
          },
        ]
      : []),
  ];
  return (
    <section className="space-y-5 rounded-surface border border-default bg-surface-base p-5 sm:p-6">
      <h2 className="font-semibold text-fg-primary">{title}</h2>
      <BarChart rows={rows(top, true)} unit="%" max={100} caption={caption} locale={locale} />
      <div className="divide-y divide-default border-t border-default">
        {top.rows.map((division) => {
          const inner = breakdown(budget, taxonomy, division.code);
          if (inner.rows.length === 0) return null;
          return (
            <details key={division.code} className="py-3">
              <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm">
                <span className="font-medium text-fg-primary">{nameOf(division.code)}</span>
                <span className="shrink-0 text-fg-tertiary">{amount(division.value)}</span>
              </summary>
              <div className="mt-3">
                {inner.noBreakdown ? (
                  <p className="mb-0 text-sm text-fg-secondary">{t("noBreakdown")}</p>
                ) : (
                  <BarChart
                    rows={rows(inner, false)}
                    unit="%"
                    max={100}
                    caption={t("detailCaption", { category: nameOf(division.code) })}
                    locale={locale}
                  />
                )}
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}

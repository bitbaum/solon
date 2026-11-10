import { ShareBars } from "@bitbaum/chartkit/react";
import type { SelfReliance } from "@/lib/budgets/analysis";
import { formatBudgetValue, formatShare } from "@/lib/budgets/format";
import type { Budget } from "@/lib/budgets/model";
import { localized } from "@/lib/places/place-view";
import FigureTiles from "./figure-tiles";
import type { BudgetsTranslator } from "./translator";

/**
 * Who pays for a budget: what the holder raised itself and what it received,
 * from whom; then what the budget's own figures say about spending the same
 * without what was received. Arithmetic, not a forecast, and it says so.
 */
export default function BudgetSelfReliance({
  budget,
  reliance: r,
  holder,
  revenue,
  locale,
  t,
}: {
  budget: Budget;
  reliance: SelfReliance;
  holder: string;
  revenue: number;
  locale: string;
  t: BudgetsTranslator;
}) {
  const amount = (v: number) => formatBudgetValue(v, budget.measure, locale);
  const times = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  return (
    <section className="space-y-5 rounded-surface border border-default bg-surface-base p-5 sm:p-6">
      <div>
        <h2 className="font-semibold text-fg-primary">{t("reliance.title")}</h2>
        <p className="mb-0 mt-1 text-sm text-fg-secondary">{t("reliance.question")}</p>
      </div>
      <ShareBars
        rows={[
          { label: t("reliance.own"), share: r.own / revenue },
          ...r.byGiver.map((g) => ({
            label: localized(g.from, locale),
            share: g.amount / revenue,
          })),
        ]}
        caption={t("reliance.caption", { holder, year: budget.year, total: amount(revenue) })}
      />
      <FigureTiles
        figures={[
          [t("reliance.ownCovered"), formatShare(r.ownCoverage, locale)],
          [t("reliance.receivedShare"), formatShare(r.receivedShare, locale)],
        ]}
      />
      <div className="space-y-2 rounded-surface border border-default bg-surface-raised p-4 text-sm">
        <p className="mb-0 font-semibold text-fg-primary">{t("reliance.withoutTitle")}</p>
        <p className="mb-0 text-fg-primary">
          {t("reliance.without", {
            holder,
            multiple: r.ownMultipleNeeded === null ? "—" : times.format(r.ownMultipleNeeded),
            cut: formatShare(r.spendingCutNeeded, locale),
          })}
        </p>
        <p className="mb-0 text-fg-secondary">{t("reliance.notForecast")}</p>
      </div>
    </section>
  );
}

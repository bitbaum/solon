import { Link } from "@/i18n/navigation";
import BudgetSelfReliance from "@/components/budgets/budget-self-reliance";
import type { BudgetsTranslator } from "@/components/budgets/translator";
import type { MoneyDisplay } from "@/lib/budgets/format";
import type { BudgetSummary } from "@/lib/budgets/summary";
import type { ContestSideView } from "@/lib/places/contest-view";
import type { PlacesTranslator } from "./translator";

/**
 * What each side's public budget rests on, side by side: the budget pages'
 * own component for each side Solon holds a budget for, a link to the whole
 * budget, and for a side with none, the gap.
 */
export default function ContestMoney({
  sides,
  display,
  t,
  tb,
}: {
  sides: readonly { side: ContestSideView; summary: BudgetSummary | null }[];
  display: MoneyDisplay;
  t: PlacesTranslator;
  tb: BudgetsTranslator;
}) {
  return (
    <section aria-labelledby="contest-money" className="space-y-4">
      <div>
        <h2 id="contest-money" className="font-semibold text-fg-primary">
          {t("contested.money.title")}
        </h2>
      </div>
      {sides.map(({ side, summary }) =>
        summary ? (
          <div key={side.key} className="space-y-2">
            {summary.reliance && summary.revenue !== null && (
              <BudgetSelfReliance
                budget={summary.budget}
                reliance={summary.reliance}
                holder={side.name}
                revenue={summary.revenue}
                display={display}
                t={tb}
              />
            )}
            <Link
              href={`/budgets/${side.slug}?in=${display.currency}`}
              className="inline-block text-sm font-semibold text-fg-primary hover:underline"
            >
              {t("contested.money.open", { side: side.name })} →
            </Link>
          </div>
        ) : (
          <p key={side.key} className="mb-0 text-sm text-fg-secondary">
            {t("contested.money.notRead", { side: side.name })}
          </p>
        ),
      )}
    </section>
  );
}

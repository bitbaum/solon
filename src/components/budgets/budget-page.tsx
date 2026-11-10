import { Link } from "@/i18n/navigation";
import PageLayout from "@/components/ui/page-layout";
import { BUDGET_TAXONOMIES } from "@/lib/config/budgets";
import { placesConfig } from "@/lib/config/places";
import { DEFAULT_CATEGORY, proposeHref } from "@/lib/domain/proposal-draft";
import { formatBudgetValue } from "@/lib/budgets/format";
import type { BudgetSection } from "@/lib/budgets/page";
import { budgetMetricKey } from "@/lib/budgets/scopes";
import { localized } from "@/lib/places/place-view";
import { SITE_URL } from "@/lib/site-config";
import BudgetBreakdown from "./budget-breakdown";
import BudgetHistory from "./budget-history";
import BudgetSelfReliance from "./budget-self-reliance";
import BudgetSources from "./budget-sources";
import FigureTiles from "./figure-tiles";
import type { BudgetsTranslator } from "./translator";

interface BudgetPageProps {
  place: string;
  slug: string;
  sections: readonly BudgetSection[];
  actIds: ReadonlyMap<string, string>;
  locale: string;
  t: BudgetsTranslator;
}

/** A category's own series on /statistics, where the catalog charts it across places. */
const statisticHrefFor = (scope: string) => (code: string) => {
  const key = budgetMetricKey(scope, BUDGET_TAXONOMIES.expenditure, code);
  return placesConfig.metrics.some((m) => m.key === key && m.statistic)
    ? `/statistics/${key}`
    : undefined;
};

/**
 * One holder's public money: for each scope and basis Solon holds, the key
 * figures, who pays for it, what it is spent on, where it comes from, how it
 * moved over the years and where every figure was read; then the way to
 * propose a change. The same page for every place, whatever it was read from.
 */
export default function BudgetPage({ place, slug, sections, actIds, locale, t }: BudgetPageProps) {
  const newest = sections[0]?.budget;
  return (
    <PageLayout
      title={t("title", { place })}
      kicker={t("kicker")}
      description={t("intro", { place })}
    >
      <div className="max-w-4xl space-y-10">
        {sections.length === 0 && <p className="text-fg-secondary">{t("notHeld", { place })}</p>}
        {sections.map((section) => {
          const { budget } = section;
          const value = (v: number | undefined | null) =>
            v === undefined || v === null ? "—" : formatBudgetValue(v, budget.measure, locale);
          const revenue = budget.revenue.get(BUDGET_TAXONOMIES.revenue.total);
          const spent = budget.expenditure.get(BUDGET_TAXONOMIES.expenditure.total);
          const caption = { place, year: budget.year };
          return (
            <section key={`${section.scope.key}-${section.basis}`} className="space-y-6">
              <div className="space-y-2 border-b border-default pb-4">
                <h2 className="headline text-2xl text-fg-primary">
                  {t("scopeYear", {
                    scope: localized(section.scope.label, locale),
                    year: budget.year,
                  })}
                </h2>
                <p className="mb-0 text-sm font-semibold text-fg-secondary">
                  {t(`basis.${section.basis}`)}
                </p>
                <p className="mb-0 text-sm text-fg-tertiary">
                  {localized(section.scope.definition, locale)}
                </p>
                {section.years.length > 1 && (
                  <nav aria-label={t("years")} className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
                    <span className="text-fg-tertiary">{t("years")}:</span>
                    {section.years.map((y) => (
                      <Link
                        key={y}
                        href={`/budgets/${slug}?year=${y}`}
                        aria-current={y === budget.year ? "page" : undefined}
                        className={
                          y === budget.year
                            ? "font-semibold text-fg-primary"
                            : "text-fg-secondary hover:underline"
                        }
                      >
                        {y}
                      </Link>
                    ))}
                  </nav>
                )}
              </div>
              <FigureTiles
                figures={[
                  ...(revenue !== undefined
                    ? [[t("figures.revenue"), value(revenue)] as [string, string]]
                    : []),
                  ...(spent !== undefined
                    ? [[t("figures.spending"), value(spent)] as [string, string]]
                    : []),
                  ...(budget.balance !== null
                    ? [[t("figures.balance"), value(budget.balance)] as [string, string]]
                    : []),
                ]}
              />
              {section.reliance && revenue !== undefined && (
                <BudgetSelfReliance
                  budget={budget}
                  reliance={section.reliance}
                  holder={place}
                  revenue={revenue}
                  locale={locale}
                  t={t}
                />
              )}
              <BudgetBreakdown
                budget={budget}
                taxonomy={BUDGET_TAXONOMIES.expenditure}
                title={t("spending.title")}
                caption={t("spending.caption", caption)}
                statisticHref={statisticHrefFor(section.scope.key)}
                locale={locale}
                t={t}
              />
              <BudgetBreakdown
                budget={budget}
                taxonomy={BUDGET_TAXONOMIES.revenue}
                title={t("income.title")}
                caption={t("income.caption", caption)}
                locale={locale}
                t={t}
              />
              <BudgetHistory section={section} place={place} locale={locale} t={t} />
              <BudgetSources budget={budget} actIds={actIds} locale={locale} t={t} />
            </section>
          );
        })}

        <section
          aria-labelledby="budget-act"
          className="rounded-surface border border-default bg-surface-base p-5 sm:p-6"
        >
          <h2 id="budget-act" className="mb-1 font-semibold text-fg-primary">
            {t("act.title")}
          </h2>
          <p className="mb-4 text-sm text-fg-secondary">{t("act.intro")}</p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link
              href={proposeHref({
                category: DEFAULT_CATEGORY,
                title: t("act.proposeTitle", { place, year: newest?.year ?? "" }),
                body: t("act.proposeBody", { place, url: `${SITE_URL}/budgets/${slug}` }),
              })}
              className="btn-primary min-h-11"
            >
              {t("act.propose")}
            </Link>
            <Link
              href={`/statistics/${budgetMetricKey("gg", BUDGET_TAXONOMIES.expenditure, BUDGET_TAXONOMIES.expenditure.total)}`}
              className="text-sm font-semibold text-fg-primary hover:underline"
            >
              {t("act.compare")} →
            </Link>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}

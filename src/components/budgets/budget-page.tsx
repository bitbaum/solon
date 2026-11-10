import { Link } from "@/i18n/navigation";
import PageLayout from "@/components/ui/page-layout";
import { BUDGET_TAXONOMIES } from "@/lib/config/budgets";
import { DISPLAY_CURRENCIES } from "@/lib/config/money";
import { placesConfig } from "@/lib/config/places";
import { DEFAULT_CATEGORY, proposeHref } from "@/lib/domain/proposal-draft";
import {
  conversionOf,
  formatBudgetValue,
  formatShare,
  ofGdp,
  type MoneyDisplay,
} from "@/lib/budgets/format";
import type { BudgetSection } from "@/lib/budgets/page";
import { budgetMetricKey } from "@/lib/budgets/scopes";
import { localized } from "@/lib/places/place-view";
import { SITE_URL } from "@/lib/site-config";
import BudgetBreakdown from "./budget-breakdown";
import BudgetHistory from "./budget-history";
import BudgetSelfReliance from "./budget-self-reliance";
import BudgetSources from "./budget-sources";
import CurrencyPicker from "./currency-picker";
import FigureTiles from "./figure-tiles";
import type { BudgetsTranslator } from "./translator";

interface BudgetPageProps {
  place: string;
  slug: string;
  sections: readonly BudgetSection[];
  /** The year asked for in the address, kept when the reader changes currency. */
  year: number | undefined;
  actIds: ReadonlyMap<string, string>;
  display: MoneyDisplay;
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
 * propose a change. Money is in the reader's currency, converted at the
 * budget year's average rate, and the page says from what. The same page for
 * every place, whatever it was read from.
 */
export default function BudgetPage({
  place,
  slug,
  sections,
  year,
  actIds,
  display,
  t,
}: BudgetPageProps) {
  const { locale } = display;
  const newest = sections[0]?.budget;
  const href = (currency: string, y = year) =>
    `/budgets/${slug}?${new URLSearchParams({
      ...(y ? { year: String(y) } : {}),
      in: currency,
    }).toString()}`;
  return (
    <PageLayout
      title={t("title", { place })}
      kicker={t("kicker")}
      description={t("intro", { place })}
    >
      <div className="max-w-4xl space-y-10">
        <CurrencyPicker
          label={t("currency.label")}
          current={display.currency}
          currencies={DISPLAY_CURRENCIES}
          hrefFor={(c) => href(c)}
        />
        {sections.length === 0 && <p className="text-fg-secondary">{t("notHeld", { place })}</p>}
        {sections.map((section) => {
          const { budget } = section;
          const tile = (label: string, v: number | undefined | null): [string, string][] => {
            if (v === undefined || v === null) return [];
            const share = ofGdp(v, budget);
            const text = formatBudgetValue(v, budget, display);
            return [
              [
                label,
                share === null
                  ? text
                  : t("figures.withGdp", { value: text, share: formatShare(share, locale) }),
              ],
            ];
          };
          const conversion = conversionOf(budget, display);
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
                {conversion && (
                  <p className="mb-0 text-sm text-fg-tertiary">
                    {conversion.converted
                      ? t("currency.converted", {
                          to: conversion.to,
                          from: conversion.from,
                          year: conversion.year,
                          sources: conversion.sources
                            .map(
                              (key) =>
                                display.rates.sources.find((s) => s.key === key)?.publisher ?? key,
                            )
                            .join(", "),
                        })
                      : t("currency.notConverted", {
                          to: conversion.to,
                          from: conversion.from,
                          year: conversion.year,
                        })}
                  </p>
                )}
                {section.years.length > 1 && (
                  <nav aria-label={t("years")} className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
                    <span className="text-fg-tertiary">{t("years")}:</span>
                    {section.years.map((y) => (
                      <Link
                        key={y}
                        href={href(display.currency, y)}
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
                  ...tile(
                    t("figures.revenue"),
                    budget.revenue.get(BUDGET_TAXONOMIES.revenue.total),
                  ),
                  ...tile(
                    t("figures.spending"),
                    budget.expenditure.get(BUDGET_TAXONOMIES.expenditure.total),
                  ),
                  ...tile(t("figures.balance"), budget.balance),
                ]}
              />
              {section.reliance && budget.revenue.has(BUDGET_TAXONOMIES.revenue.total) && (
                <BudgetSelfReliance
                  budget={budget}
                  reliance={section.reliance}
                  holder={place}
                  revenue={budget.revenue.get(BUDGET_TAXONOMIES.revenue.total)!}
                  display={display}
                  t={t}
                />
              )}
              <BudgetBreakdown
                budget={budget}
                taxonomy={BUDGET_TAXONOMIES.expenditure}
                title={t("spending.title")}
                caption={t("spending.caption", caption)}
                statisticHref={statisticHrefFor(section.scope.key)}
                display={display}
                t={t}
              />
              <BudgetBreakdown
                budget={budget}
                taxonomy={BUDGET_TAXONOMIES.revenue}
                title={t("income.title")}
                caption={t("income.caption", caption)}
                display={display}
                t={t}
              />
              <BudgetHistory history={section.history} place={place} locale={locale} t={t} />
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

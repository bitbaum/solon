import { LineChart } from "@bitbaum/chartkit/react";
import type { BudgetSection } from "@/lib/budgets/page";
import type { BudgetsTranslator } from "./translator";

/**
 * Revenue and spending over the years, on one axis: where the two lines part,
 * the gap is the deficit or the surplus. Shares of GDP in per cent; money in
 * the budget's own unit.
 */
export default function BudgetHistory({
  section,
  place,
  locale,
  t,
}: {
  section: BudgetSection;
  place: string;
  locale: string;
  t: BudgetsTranslator;
}) {
  const { revenue, spending } = section.history;
  if (revenue.length === 0 && spending.length === 0) return null;
  const measure = section.budget.measure;
  const scale = measure.kind === "share_of_gdp" ? 100 : 1;
  const unit = measure.kind === "share_of_gdp" ? `% ${t("figures.ofGdp")}` : measure.currency;
  const points = (s: { year: number; value: number }[]) =>
    s.map((p) => ({ x: p.year, y: Math.round(p.value * scale * 10) / 10 }));
  const years = [...revenue, ...spending].map((p) => p.year);
  return (
    <section className="space-y-4 rounded-surface border border-default bg-surface-base p-5 sm:p-6">
      <h2 className="font-semibold text-fg-primary">{t("history.title")}</h2>
      <LineChart
        series={[
          { id: "revenue", label: t("history.revenue"), points: points(revenue) },
          { id: "spending", label: t("history.spending"), points: points(spending) },
        ]}
        unit={unit}
        locale={locale}
        yFrom="data"
        markers="auto"
        caption={t("history.caption", {
          place,
          from: Math.min(...years),
          to: Math.max(...years),
        })}
      />
    </section>
  );
}

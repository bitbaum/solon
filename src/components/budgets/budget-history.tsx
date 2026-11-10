import { LineChart } from "@bitbaum/chartkit/react";
import type { BudgetHistory as History } from "@/lib/budgets/page";
import type { BudgetsTranslator } from "./translator";

/**
 * Revenue and spending over the years, on one axis: where the two lines part,
 * the gap is the deficit or the surplus. In per cent of GDP where every year
 * knows its GDP, else in the reader's currency at each year's own rate.
 */
export default function BudgetHistory({
  history,
  place,
  locale,
  t,
}: {
  history: History;
  place: string;
  locale: string;
  t: BudgetsTranslator;
}) {
  const { revenue, spending, unit } = history;
  if (revenue.length === 0 && spending.length === 0) return null;
  const share = unit.kind === "share_of_gdp";
  const points = (s: { year: number; value: number }[]) =>
    s.map((p) => ({
      x: p.year,
      y: share ? Math.round(p.value * 1000) / 10 : Math.round(p.value / 1e6),
    }));
  const years = [...revenue, ...spending].map((p) => p.year);
  return (
    <section className="space-y-4 rounded-surface border border-default bg-surface-base p-5 sm:p-6">
      <h2 className="font-semibold text-fg-primary">{t("history.title")}</h2>
      <LineChart
        series={[
          { id: "revenue", label: t("history.revenue"), points: points(revenue) },
          { id: "spending", label: t("history.spending"), points: points(spending) },
        ]}
        unit={
          share ? `% ${t("figures.ofGdp")}` : t("history.millions", { currency: unit.currency })
        }
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

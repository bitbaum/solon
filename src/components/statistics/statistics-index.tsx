import { BarChart } from "@bitbaum/chartkit/react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import PageLayout from "@/components/ui/page-layout";
import type { Metric } from "@/lib/config/places/schema";
import { localized } from "@/lib/places/place-view";
import { chartValue, latestPoint, metricPath, seriesPageFor } from "@/lib/statistics/present";
import type { PlaceSeries } from "@/lib/statistics/read";
import AxisBuilder from "./axis-builder";
import AxisPanel, { type AxisPanelProps } from "./axis-panel";
import { unitLabel, type StatisticsTranslator } from "./metric-view";

interface StatisticsIndexProps {
  statistics: { metric: Metric; series: PlaceSeries[] }[];
  axes: Omit<AxisPanelProps, "t" | "locale">[];
  /** The axis a reader built in the link, ready to draw. */
  custom: Omit<AxisPanelProps, "t" | "locale"> | null;
  builder: { chosen: import("@/lib/statistics/axes").Axis | null };
  locale: Locale;
  t: StatisticsTranslator;
}

/**
 * /statistics: every statistic as its latest value per place, ranked, each
 * bar opening the publisher's figures and each card the series over time;
 * then the axes, read with the reader's weights or a group's.
 */
export default function StatisticsIndex({
  statistics,
  axes,
  custom,
  builder,
  locale,
  t,
}: StatisticsIndexProps) {
  return (
    <PageLayout title={t("index.title")} kicker={t("kicker")} description={t("index.intro")}>
      <div className="max-w-5xl space-y-12">
        <ul className="grid gap-6 md:grid-cols-2">
          {statistics.map(({ metric, series }) => {
            const label = localized(metric.label, locale);
            const statistic = metric.statistic!;
            const unit = unitLabel(metric, t);
            const rows = series.flatMap((s) => {
              const p = latestPoint(s);
              return p
                ? [
                    {
                      label: s.name,
                      value: chartValue(metric, p.value),
                      note: t("index.latestNote", { year: p.year }),
                      href: seriesPageFor(metric, s.code),
                    },
                  ]
                : [];
            });
            return (
              <li
                key={metric.key}
                className="min-w-0 space-y-4 rounded-surface border border-default bg-surface-base p-6"
              >
                <h2 className="text-xl font-semibold text-fg-primary">{label}</h2>
                {rows.length > 0 ? (
                  <BarChart
                    rows={rows}
                    unit={unit}
                    locale={locale}
                    caption={t("index.latestCaption", {
                      metric: label,
                      unit,
                      publisher: statistic.series.publisher,
                    })}
                  />
                ) : (
                  <p className="text-sm text-fg-secondary">
                    {t("index.empty", { publisher: statistic.series.publisher })}{" "}
                    <a href={statistic.series.url} className="underline" rel="noopener">
                      {statistic.series.publisher}
                    </a>
                  </p>
                )}
                {statistic.scope && (
                  <p className="mb-0 text-sm text-fg-tertiary">
                    {t("metric.scopeLabel")} {localized(statistic.scope, locale)}
                  </p>
                )}
                <Link href={metricPath(metric.key)} className="btn-secondary min-h-11">
                  {t("index.open")}
                </Link>
              </li>
            );
          })}
        </ul>

        <section className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-fg-primary">{t("index.axesTitle")}</h2>
            <p className="max-w-3xl text-fg-secondary">{t("index.axesIntro")}</p>
          </div>
          {axes.map((axis) => (
            <AxisPanel
              key={`${axis.axis.key}-${axis.axis.version}`}
              {...axis}
              locale={locale}
              t={t}
            />
          ))}
          <AxisBuilder
            metrics={statistics.map((x) => x.metric)}
            chosen={builder.chosen}
            locale={locale}
            t={t}
          />
          {custom && <AxisPanel {...custom} locale={locale} t={t} />}
          <p className="mb-0">
            <Link href="/statistics/compare" className="btn-secondary min-h-11">
              {t("index.compareLink")}
            </Link>
          </p>
        </section>
      </div>
    </PageLayout>
  );
}

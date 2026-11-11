import { BarChart } from "@bitbaum/chartkit/react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import PageLayout from "@/components/ui/page-layout";
import type { Metric } from "@/lib/config/places/schema";
import { cite } from "@/lib/i18n/config-catalog";
import { localized } from "@/lib/places/place-view";
import { chartValue, latestPoint, metricPath, seriesPageFor } from "@/lib/statistics/present";
import type { PlaceSeries } from "@/lib/statistics/read";
import AxisBuilder from "./axis-builder";
import AxisPanel, { type AxisPanelProps } from "./axis-panel";
import { unitLabel, type StatisticsTranslator } from "./shared";

interface StatisticsIndexProps {
  statistics: { metric: Metric; series: PlaceSeries[] }[];
  axes: Omit<AxisPanelProps, "t" | "locale">[];
  /** The dimensions held in layers, for the section that opens them. */
  dimensions: { key: string; label: string; summary: string }[];
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
  dimensions,
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
                      publisher: cite(statistic.series.publisher, locale),
                    })}
                  />
                ) : (
                  <p className="text-sm text-fg-secondary">
                    {t("index.empty", { publisher: cite(statistic.series.publisher, locale) })}{" "}
                    <a href={statistic.series.url} className="underline" rel="noopener">
                      {cite(statistic.series.publisher, locale)}
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

        <section className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-fg-primary">{t("index.dimensionsTitle")}</h2>
            <p className="max-w-3xl text-fg-secondary">{t("index.dimensionsIntro")}</p>
            <p className="mb-0 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <Link href="/statistics/methods" className="text-fg-primary underline">
                {t("methods.title")}
              </Link>
              <Link href="/statistics/gaps" className="text-fg-primary underline">
                {t("gaps.title")}
              </Link>
              <Link href="/statistics/research" className="text-fg-primary underline">
                {t("research.title")}
              </Link>
            </p>
          </div>
          <ul className="grid gap-4 md:grid-cols-2">
            {dimensions.map((d) => (
              <li
                key={d.key}
                className="min-w-0 space-y-3 rounded-surface border border-default bg-surface-base p-6"
              >
                <h3 className="text-xl font-semibold text-fg-primary">{d.label}</h3>
                <p className="mb-0 text-sm text-fg-secondary">{d.summary}</p>
                <Link href={`/statistics/dimension/${d.key}`} className="btn-secondary min-h-11">
                  {t("index.dimensionOpen")}
                </Link>
              </li>
            ))}
          </ul>
        </section>

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

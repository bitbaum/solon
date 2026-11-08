import { LineChart, Timeline, type TimelineEvent } from "@bitbaum/chartkit/react";
import type { useTranslations } from "next-intl";
import { getPathname, Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import PageLayout from "@/components/ui/page-layout";
import type { Metric } from "@/lib/config/places/schema";
import { DEFAULT_CATEGORY, proposeHref } from "@/lib/domain/proposal-draft";
import { localized } from "@/lib/places/place-view";
import { chartValue, latestPoint, seriesPageFor } from "@/lib/statistics/present";
import type { LinkedAct, PlaceSeries } from "@/lib/statistics/read";
import type { EnforcementBody, EventBody } from "@/lib/statistics/records";
import type { ViewSpec } from "@/lib/statistics/views";
import EnforcementList from "./enforcement-list";
import LawLinks from "./law-links";

export type StatisticsTranslator = ReturnType<typeof useTranslations<"Statistics">>;

export interface MetricViewProps {
  metric: Metric;
  locale: Locale;
  /** Every place with a series, for the chooser. */
  all: PlaceSeries[];
  /** The places shown. */
  shown: PlaceSeries[];
  years: { from: number | null; to: number | null };
  acts: LinkedAct[];
  events: { body: EventBody }[];
  enforcement: { body: EnforcementBody; placeName: string }[];
  placeNames: Map<string, string>;
  /** The spec of what is on screen, for "save this view". */
  spec: ViewSpec;
  /** The page's own address, absolute, for the texts that cite it. */
  selfUrl: string;
  /** Shown above the chart on a saved view's page. */
  banner?: React.ReactNode;
  t: StatisticsTranslator;
}

const inYears = (year: number, years: MetricViewProps["years"]) =>
  (years.from === null || year >= years.from) && (years.to === null || year <= years.to);

/**
 * One statistic over time (/statistics/[metric]): the places chosen on one
 * chart, the law's changes and recorded events under it on the same years,
 * the law it is about, how that law is enforced, and where every number came
 * from. Every mark opens its source; every law opens its text and a way to
 * propose a change to it.
 */
export default function MetricView(props: MetricViewProps) {
  const { metric, locale, all, shown, years, acts, events, spec, selfUrl, t } = props;
  const label = localized(metric.label, locale);
  const statistic = metric.statistic!;
  const unit = unitLabel(metric, t);
  const series = shown.map((s) => ({
    id: s.code,
    label: s.name,
    points: s.points
      .filter((p) => inYears(p.year, years))
      .map((p) => ({
        x: String(p.year),
        y: chartValue(metric, p.value),
        href: seriesPageFor(metric, s.code),
      })),
  }));
  const actName = (a: LinkedAct) => a.title ?? `${a.link.act.authority} ${a.link.act.value}`;
  const timeline: TimelineEvent[] = [
    ...acts.flatMap((a) =>
      a.versions
        .filter((day) => inYears(Number(day.slice(0, 4)), years))
        .map((day) => ({
          date: day,
          label: t("metric.versionInForce", { act: actName(a) }),
          href: a.actId
            ? getPathname({ href: `/law/${a.actId}`, locale })
            : a.link.evidence[0]!.url,
          kind: "law",
        })),
    ),
    ...events
      .filter((e) => inYears(Number(e.body.on.slice(0, 4)), years))
      .map((e) => ({
        date: e.body.on,
        label: localized(e.body.title, locale),
        href: e.body.evidence[0]!.url,
        kind: "event",
      })),
  ];
  const chosen = new Set(shown.map((s) => s.code));

  return (
    <PageLayout
      title={label}
      kicker={t("kicker")}
      description={localized(statistic.definition, locale)}
    >
      <div className="max-w-5xl space-y-10">
        <p className="mb-0 text-sm text-fg-secondary wrap-anywhere">
          {t("metric.publisher", {
            publisher: statistic.series.publisher,
            code: statistic.series.code,
          })}{" "}
          <a href={statistic.series.url} className="underline" rel="noopener">
            {t("metric.sourceSeries")}
          </a>
        </p>

        {props.banner}

        <form
          method="get"
          className="space-y-3 rounded-surface border border-default bg-surface-base p-5"
        >
          <fieldset className="flex flex-wrap gap-x-6 gap-y-2">
            <legend className="mb-2 font-semibold text-fg-primary">
              {t("metric.placesLegend")}
            </legend>
            {all.map((s) => (
              <label key={s.code} className="flex min-h-11 items-center gap-2 text-fg-primary">
                <input
                  type="checkbox"
                  name="p"
                  value={s.code}
                  defaultChecked={chosen.has(s.code)}
                />
                {s.name}
              </label>
            ))}
          </fieldset>
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex flex-col text-sm text-fg-secondary">
              {t("metric.fromLabel")}
              <input
                name="from"
                type="number"
                defaultValue={years.from ?? ""}
                className="field w-28"
              />
            </label>
            <label className="flex flex-col text-sm text-fg-secondary">
              {t("metric.toLabel")}
              <input name="to" type="number" defaultValue={years.to ?? ""} className="field w-28" />
            </label>
            <button type="submit" className="btn-secondary min-h-11">
              {t("metric.apply")}
            </button>
          </div>
        </form>

        {series.some((s) => s.points.length > 0) ? (
          <LineChart
            series={series}
            unit={unit}
            locale={locale}
            yFrom="zero"
            caption={t("metric.chartCaption", {
              metric: label,
              unit,
              publisher: statistic.series.publisher,
            })}
          />
        ) : (
          <p className="rounded-surface border border-default bg-surface-base p-6 text-fg-secondary">
            {t("metric.noSeries")}{" "}
            <a href={statistic.series.url} className="underline" rel="noopener">
              {t("metric.sourceSeries")}
            </a>
          </p>
        )}

        {timeline.length > 0 && years.from !== null && years.to !== null ? (
          <Timeline
            events={timeline}
            locale={locale}
            from={`${years.from}-01-01`}
            to={`${years.to}-12-31`}
            caption={t("metric.timelineCaption")}
          />
        ) : (
          <p className="text-sm text-fg-secondary">{t("metric.timelineEmpty")}</p>
        )}
        <p className="text-sm text-fg-tertiary">{t("metric.caveat")}</p>

        <LawLinks {...props} label={label} />
        <EnforcementList {...props} label={label} />

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-fg-primary">{t("metric.sourcesTitle")}</h2>
          <ul className="space-y-2 text-sm">
            {shown.map((s) => (
              <li key={s.code} className="text-fg-secondary">
                {t("metric.sourceRow", { place: s.name, date: s.source.retrievedAt })}
                {latestPoint(s) ? ` (${latestPoint(s)!.year})` : ""}:{" "}
                <a href={seriesPageFor(metric, s.code)} className="underline" rel="noopener">
                  {t("metric.sourceLink")}
                </a>
                {s.source.url && (
                  <>
                    {" · "}
                    <a href={s.source.url} className="underline" rel="noopener">
                      {t("metric.rawLink")}
                    </a>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3 rounded-surface border border-default bg-surface-base p-5">
          <h2 className="text-xl font-semibold text-fg-primary">{t("metric.saveTitle")}</h2>
          <p className="text-sm text-fg-secondary">{t("metric.saveHint")}</p>
          <form method="post" action="/api/v1/statistics/views" className="flex flex-wrap gap-3">
            <input type="hidden" name="spec" value={JSON.stringify(spec)} />
            <input type="hidden" name="locale" value={locale} />
            <button type="submit" className="btn-primary min-h-11">
              {t("metric.save")}
            </button>
            <Link
              href={proposeHref({
                category: DEFAULT_CATEGORY,
                title: t("metric.suggestLawTitle", { metric: label }),
                body: t("metric.suggestLawBody", { url: selfUrl }),
              })}
              className="btn-secondary min-h-11"
            >
              {t("metric.suggestLaw")}
            </Link>
          </form>
        </section>
      </div>
    </PageLayout>
  );
}

/** The unit a chart names: per cent for a ratio, "per 100,000" for a rate, none otherwise. */
export function unitLabel(metric: Pick<Metric, "unit">, t: StatisticsTranslator): string {
  return metric.unit === "ratio" || metric.unit === "per_100k" ? t(`units.${metric.unit}`) : "";
}

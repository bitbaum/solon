import { LineChart, Timeline, type TimelineEvent } from "@bitbaum/chartkit/react";
import type { useTranslations } from "next-intl";
import { getPathname, Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import PageLayout from "@/components/ui/page-layout";
import type { Metric } from "@/lib/config/places/schema";
import { DEFAULT_CATEGORY, proposeHref } from "@/lib/domain/proposal-draft";
import { localized } from "@/lib/places/place-view";
import { chartValue, eventPath, latestPoint, seriesPageFor } from "@/lib/statistics/present";
import type { EventRow, LinkedAct, PlaceSeries } from "@/lib/statistics/read";
import type { EnforcementBody } from "@/lib/statistics/records";
import type { ViewSpec } from "@/lib/statistics/views";
import EnforcementList from "./enforcement-list";
import MetricMap, { type MapValue } from "./metric-map";
import QualityPanel from "./quality-panel";
import ExplainPanel from "./explain-panel";
import SanityPanel from "./sanity-panel";
import { buildBrief } from "@/lib/statistics/brief";
import type { SanityFinding } from "@/lib/statistics/sanity";
import LawLinks from "./law-links";
import { formatDay, unitLabel, type MetricViewProps, type StatisticsTranslator } from "./shared";

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
  const { metric, locale, all, shown, years, acts, events, spec, selfUrl, mapValues, t } = props;
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
        // The publisher's own word that the figure will be revised or is not an observation.
        preliminary: p.quality !== "normal",
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
    // An event is two marks when its change begins later than its decision, and
    // each opens the event's own page: what changed, how, and who stood where.
    ...events.flatMap((e) => {
      const href = getPathname({ href: eventPath(e.body.slug), locale });
      const title = localized(e.body.title, locale);
      const marks: TimelineEvent[] = [
        { date: e.body.on, label: t("metric.eventDecided", { title }), href, kind: "event" },
      ];
      if (e.body.effective && e.body.effective !== e.body.on) {
        marks.push({
          date: e.body.effective,
          label: t("metric.eventEffective", { title }),
          href,
          kind: "event",
        });
      }
      return marks.filter((m) => inYears(Number(m.date.slice(0, 4)), years));
    }),
  ];
  const chosen = new Set(shown.map((s) => s.code));
  const facts = buildBrief(
    {
      metric,
      shown,
      years,
      events,
      sanity: props.sanity,
      thisYear: new Date().getUTCFullYear(),
      per100k: t("units.per_100k"),
    },
    locale,
  );

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

        {statistic.scope && (
          <p className="mb-0 rounded-surface border border-default bg-surface-raised p-4 text-sm text-fg-secondary">
            <span className="font-semibold text-fg-primary">{t("metric.scopeLabel")}</span>{" "}
            {localized(statistic.scope, locale)}
          </p>
        )}

        {props.banner}

        <SanityPanel findings={props.sanity} t={t} />

        {mapValues.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-fg-primary">{t("metric.mapTitle")}</h2>
            <MetricMap
              values={mapValues}
              label={t("metric.mapLabel", { metric: label })}
              legend={{
                low: t("metric.mapLow"),
                high: t("metric.mapHigh"),
                none: t("metric.mapNone"),
                caption: t("metric.mapCaption", { metric: label, unit }),
              }}
              texts={{
                zoomIn: t("metric.mapZoomIn"),
                zoomOut: t("metric.mapZoomOut"),
                home: t("metric.mapHome"),
                loading: t("metric.mapLoading"),
                unavailable: t("metric.mapUnavailable"),
                open: t("metric.mapOpen"),
                place: t("metric.mapColPlace"),
                value: t("metric.mapColValue"),
                year: t("metric.mapColYear"),
              }}
            />
          </section>
        )}

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
            preliminaryLabel={t("metric.preliminary")}
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
        {events.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-fg-primary">{t("metric.eventsTitle")}</h2>
            <p className="mb-0 text-sm text-fg-secondary">{t("metric.eventsIntro")}</p>
            <ul className="divide-y divide-default rounded-surface border border-default bg-surface-base">
              {events.map((e) => (
                <li
                  key={e.recordKey}
                  className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="min-w-0">
                    <span className="block text-sm text-fg-tertiary">
                      {e.placeName} · {t(`event.categories.${e.body.category}`)} ·{" "}
                      {formatDay(e.body.on, locale)}
                    </span>
                    <span className="block font-medium text-fg-primary">
                      {localized(e.body.title, locale)}
                    </span>
                  </span>
                  <Link href={eventPath(e.body.slug)} className="btn-secondary min-h-11 shrink-0">
                    {t("metric.eventOpen")}
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/statistics/events" className="text-sm text-fg-secondary underline">
              {t("metric.eventsAll")}
            </Link>
          </section>
        )}
        <p className="text-sm text-fg-tertiary">{t("metric.caveat")}</p>

        <LawLinks {...props} label={label} />
        <EnforcementList {...props} label={label} />

        <QualityPanel shown={shown} t={t} />

        <ExplainPanel
          facts={facts}
          locale={locale}
          t={t}
          subject={{
            kind: "metric",
            metric: metric.key,
            places: spec.places,
            ...(spec.from !== null ? { from: String(spec.from) } : {}),
            ...(spec.to !== null ? { to: String(spec.to) } : {}),
          }}
        />

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

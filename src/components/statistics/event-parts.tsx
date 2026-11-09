import { LineChart } from "@bitbaum/chartkit/react";
import type { Locale } from "@/i18n/routing";
import { chartValue, seriesPageFor, splitAt } from "@/lib/statistics/present";
import { localized } from "@/lib/places/place-view";
import type { EventChart } from "@/lib/statistics/event-page";
import type { EventActor, EventVote } from "@/lib/statistics/records";
import { ACTOR_ROLES } from "@/lib/statistics/records";
import { formatDay, unitLabel, type StatisticsTranslator } from "./metric-view";

type Evidence = { publisher: string; url: string; read: string };

/** The pages a line was read on, as small links. */
export function Sources({
  evidence,
  t,
}: {
  evidence: readonly Evidence[];
  t: StatisticsTranslator;
}) {
  return (
    <span className="text-xs text-fg-tertiary">
      {evidence.map((e, i) => (
        <span key={e.url}>
          {i > 0 && " · "}
          <a
            href={e.url}
            className="underline"
            rel="noopener"
            title={t("event.read", { date: e.read })}
          >
            {e.publisher}
          </a>
        </span>
      ))}
    </span>
  );
}

/** One vote: the counts or the share, its outcome, and the groups' breakdown where the record has one. */
export function VoteCard({
  vote,
  locale,
  t,
}: {
  vote: EventVote;
  locale: Locale;
  t: StatisticsTranslator;
}) {
  const count = (n: number) => n.toLocaleString(locale);
  return (
    <div className="space-y-3 rounded-surface border border-default bg-surface-base p-5">
      <p className="mb-0 text-sm text-fg-tertiary">
        {localized(vote.body, locale)}
        {vote.on ? ` · ${formatDay(vote.on, locale)}` : ""}
      </p>
      <p className="mb-0 font-semibold text-fg-primary">{localized(vote.question, locale)}</p>
      <p className="mb-0 text-fg-primary">
        <span className="font-semibold">{t(`event.outcome.${vote.outcome}`)}</span>
        {vote.for !== undefined && vote.against !== undefined && (
          <>
            {" · "}
            {t("event.voteCounts", { for: count(vote.for), against: count(vote.against) })}
            {vote.absent ? ` · ${t("event.voteAbsent", { count: count(vote.absent) })}` : ""}
          </>
        )}
        {vote.forPercent !== undefined && (
          <>
            {" · "}
            {t("event.voteForPercent", { percent: vote.forPercent.toLocaleString(locale) })}
            {vote.turnoutPercent !== undefined
              ? ` · ${t("event.voteTurnout", { percent: vote.turnoutPercent.toLocaleString(locale) })}`
              : ""}
          </>
        )}
      </p>
      {vote.note && (
        <p className="mb-0 text-sm text-fg-secondary">{localized(vote.note, locale)}</p>
      )}
      {vote.breakdown.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="mb-2 text-left text-fg-secondary">{t("event.breakdown")}</caption>
            <thead>
              <tr className="text-left text-fg-tertiary">
                <th className="py-1 pr-4 font-normal">{t("event.group")}</th>
                <th className="py-1 pr-4 text-right font-normal">{t("event.voteFor")}</th>
                <th className="py-1 pr-4 text-right font-normal">{t("event.voteAgainst")}</th>
                <th className="py-1 text-right font-normal">{t("event.voteAbsentShort")}</th>
              </tr>
            </thead>
            <tbody>
              {vote.breakdown.map((g) => (
                <tr key={g.group} className="border-t border-subtle">
                  <th scope="row" className="py-1 pr-4 text-left font-normal text-fg-primary">
                    {g.group}
                  </th>
                  <td className="py-1 pr-4 text-right tabular-nums">{count(g.for)}</td>
                  <td className="py-1 pr-4 text-right tabular-nums">{count(g.against)}</td>
                  <td className="py-1 text-right tabular-nums text-fg-tertiary">
                    {count(g.absent)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Sources evidence={vote.evidence} t={t} />
    </div>
  );
}

/** Who took part, grouped by what they did, each with what the source says and where. */
export function ActorList({
  actors,
  locale,
  t,
}: {
  actors: readonly EventActor[];
  locale: Locale;
  t: StatisticsTranslator;
}) {
  return (
    <div className="space-y-5">
      {ACTOR_ROLES.map((role) => {
        const of = actors.filter((a) => a.role === role);
        if (of.length === 0) return null;
        return (
          <section key={role} className="space-y-2">
            <h3 className="text-base font-semibold text-fg-primary">
              {t(`event.roles.${role}`)}{" "}
              <span className="font-normal text-fg-tertiary">({of.length})</span>
            </h3>
            <ul className="divide-y divide-default rounded-surface border border-default bg-surface-base">
              {of.map((a) => (
                <li key={`${role}-${a.name}`} className="space-y-1 px-5 py-3">
                  <p className="mb-0 font-medium text-fg-primary">
                    {a.name}
                    {a.description && (
                      <span className="font-normal text-fg-tertiary">
                        {" "}
                        — {localized(a.description, locale)}
                      </span>
                    )}
                  </p>
                  {a.note && (
                    <p className="mb-0 text-sm text-fg-secondary">{localized(a.note, locale)}</p>
                  )}
                  <Sources evidence={a.evidence} t={t} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/**
 * The numbers around a change: the place's line cut at the year it applies
 * (two parts, two colours), its peers alongside, and a table of the values.
 * It states what the numbers did and nothing about why.
 */
export function NumbersAround({
  chart,
  placeCode,
  pivot,
  locale,
  t,
}: {
  chart: EventChart;
  placeCode: string;
  pivot: number;
  locale: Locale;
  t: StatisticsTranslator;
}) {
  const { metric, series, comparison, window } = chart;
  const unit = unitLabel(metric, t);
  const label = localized(metric.label, locale);
  const inWindow = (p: { year: number }) => p.year >= window.from && p.year <= window.to;
  const draw = (code: string, list: { year: number; value: number; quality: string }[]) =>
    list.map((p) => ({
      x: String(p.year),
      y: chartValue(metric, p.value),
      href: seriesPageFor(metric, code),
      preliminary: p.quality !== "normal",
    }));
  // The place itself, cut at the change and scaled to its own values so a step
  // of two points is visible; its peers on a chart of their own, since a country
  // at 44% beside one at 20% would flatten both.
  const focalSeries = series.find((s) => s.code === placeCode);
  const focalPoints = (focalSeries?.points ?? []).filter(inWindow);
  const { before, from } = splitAt(focalPoints, pivot);
  const focal = focalSeries
    ? [
        {
          id: `${placeCode}-before`,
          label: t("event.chartBefore", { place: focalSeries.name, year: pivot }),
          points: draw(placeCode, before),
        },
        {
          id: `${placeCode}-from`,
          label: t("event.chartFrom", { place: focalSeries.name, year: pivot }),
          points: draw(placeCode, from),
        },
      ].filter((x) => x.points.length > 0)
    : [];
  const peers = series
    .filter((s) => s.code !== placeCode)
    .map((s) => ({ id: s.code, label: s.name, points: draw(s.code, s.points.filter(inWindow)) }))
    .filter((s) => s.points.length > 0);
  const showLater = comparison.some((row) => row.later !== null);
  const fmt = (p: { value: number } | null) =>
    p ? chartValue(metric, p.value).toLocaleString(locale) : "—";
  const change = (v: number | null) =>
    v === null ? "—" : `${v > 0 ? "+" : ""}${chartValue(metric, v).toLocaleString(locale)}`;
  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-fg-primary">{label}</h3>
      <LineChart
        series={focal}
        unit={unit}
        locale={locale}
        yFrom="data"
        preliminaryLabel={t("metric.preliminary")}
        caption={t("event.numbersCaption", {
          metric: label,
          unit,
          from: window.from,
          to: window.to,
          year: pivot,
        })}
      />
      {peers.length > 0 && (
        <LineChart
          series={peers}
          unit={unit}
          locale={locale}
          yFrom="zero"
          preliminaryLabel={t("metric.preliminary")}
          caption={t("event.peersCaption", {
            metric: label,
            unit,
            from: window.from,
            to: window.to,
          })}
        />
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="mb-2 text-left text-fg-secondary">
            {t("event.tableCaption", { metric: label, year: pivot })}
          </caption>
          <thead>
            <tr className="text-left text-fg-tertiary">
              <th className="py-1 pr-4 font-normal">{t("event.colPlace")}</th>
              <th className="py-1 pr-4 text-right font-normal">{pivot - 1}</th>
              <th className="py-1 pr-4 text-right font-normal">{pivot}</th>
              {showLater && <th className="py-1 pr-4 text-right font-normal">{pivot + 3}</th>}
              <th className="py-1 text-right font-normal">
                {t("event.colChange", { from: pivot - 1, to: pivot })}
              </th>
            </tr>
          </thead>
          <tbody>
            {comparison.map((row) => (
              <tr key={row.code} className="border-t border-subtle">
                <th scope="row" className="py-1 pr-4 text-left font-normal text-fg-primary">
                  {row.name}
                  {row.focal && <span className="text-fg-tertiary"> ({t("event.focal")})</span>}
                </th>
                <td className="py-1 pr-4 text-right tabular-nums">{fmt(row.before)}</td>
                <td className="py-1 pr-4 text-right tabular-nums">{fmt(row.at)}</td>
                {showLater && (
                  <td className="py-1 pr-4 text-right tabular-nums">{fmt(row.later)}</td>
                )}
                <td className="py-1 text-right tabular-nums">{change(row.change)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {metric.statistic?.scope && (
        <p className="mb-0 text-sm text-fg-tertiary">
          {t("metric.scopeLabel")} {localized(metric.statistic.scope, locale)}
        </p>
      )}
    </div>
  );
}

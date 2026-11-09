import { BarChart, LineChart } from "@bitbaum/chartkit/react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import PageLayout from "@/components/ui/page-layout";
import { localized } from "@/lib/places/place-view";
import { DIMENSION_LAYERS } from "@/lib/statistics/dimensions";
import type { loadDimensionPage } from "@/lib/statistics/dimension-page";
import { chartValue, latestPoint, metricPath } from "@/lib/statistics/present";
import { unitLabel, type StatisticsTranslator } from "./metric-view";
import ScatterPlot from "./scatter-plot";

type Page = NonNullable<Awaited<ReturnType<typeof loadDimensionPage>>>;

/**
 * One dimension in three layers (/statistics/dimension/<key>): what the law says,
 * what happens in practice and what results, each with its own measures and none
 * collapsed into a score; a law-versus-practice scatter of any two of them with the
 * gap between; and one place's measures over time. A layer with no series says what
 * would fill it.
 */
export default function DimensionView({
  page,
  locale,
  t,
}: {
  page: Page;
  locale: Locale;
  t: StatisticsTranslator;
}) {
  const { dimension, measures, x, y, points, gaps, sameUnit, places, place, timeMeasures } = page;
  const name = (m: { metric: Page["measures"][number]["metric"] }) => {
    const unit = unitLabel(m.metric, t);
    return `${localized(m.metric.label, locale)}${unit ? `, ${unit}` : ""}`;
  };
  const fmt = (m: Page["measures"][number], v: number) =>
    chartValue(m.metric, v).toLocaleString(locale);
  return (
    <PageLayout
      title={localized(dimension.label, locale)}
      kicker={t("dimension.kicker")}
      description={localized(dimension.summary, locale)}
    >
      <div className="max-w-5xl space-y-12">
        <p className="mb-0 text-sm text-fg-tertiary">
          {t("dimension.author", { version: dimension.version, author: dimension.author })}
        </p>

        <section className="grid gap-4 md:grid-cols-3">
          {DIMENSION_LAYERS.map((layer) => {
            const here = measures.filter((m) => m.layer === layer);
            const spec = dimension.layers[layer];
            return (
              <div
                key={layer}
                className="min-w-0 space-y-3 rounded-surface border border-default bg-surface-base p-5"
              >
                <h2 className="text-lg font-semibold text-fg-primary">
                  {t(`dimension.layers.${layer}`)}
                </h2>
                <p className="mb-0 text-sm text-fg-secondary">
                  {t(`dimension.layerMeaning.${layer}`)}
                </p>
                {here.length === 0 ? (
                  <p className="mb-0 rounded-surface border border-default bg-surface-raised p-3 text-sm text-fg-secondary">
                    <span className="font-semibold text-fg-primary">{t("dimension.noSeries")}</span>{" "}
                    {spec.wanted ? localized(spec.wanted, locale) : ""}
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {here.map((m) => (
                      <li key={m.metric.key} className="space-y-1">
                        <Link
                          href={metricPath(m.metric.key)}
                          className="font-medium text-fg-primary underline"
                        >
                          {localized(m.metric.label, locale)}
                        </Link>
                        <p className="mb-0 text-sm text-fg-secondary">
                          {m.series
                            .map((s) => {
                              const p = latestPoint(s);
                              return p ? `${s.name} ${fmt(m, p.value)} (${p.year})` : null;
                            })
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </section>

        {measures.length >= 1 && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-fg-primary">{t("dimension.rankedTitle")}</h2>
            <div className="grid gap-6 md:grid-cols-2">
              {measures.map((m) => (
                <BarChart
                  key={m.metric.key}
                  rows={m.series.flatMap((s) => {
                    const p = latestPoint(s);
                    return p
                      ? [
                          {
                            label: s.name,
                            value: chartValue(m.metric, p.value),
                            note: String(p.year),
                          },
                        ]
                      : [];
                  })}
                  unit={unitLabel(m.metric, t)}
                  locale={locale}
                  caption={`${localized(m.metric.label, locale)} · ${t(`dimension.layers.${m.layer}`)}`}
                />
              ))}
            </div>
          </section>
        )}

        {x && y && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-fg-primary">{t("dimension.gapTitle")}</h2>
            <form
              method="get"
              className="flex flex-wrap items-end gap-4 rounded-surface border border-default bg-surface-base p-5"
            >
              {(["x", "y"] as const).map((axis) => (
                <label
                  key={axis}
                  className="flex min-w-64 flex-1 flex-col gap-1 text-sm text-fg-secondary"
                >
                  {t(`compare.${axis}Label`)}
                  <select
                    name={axis}
                    defaultValue={(axis === "x" ? x : y).metric.key}
                    className="field"
                  >
                    {measures.map((m) => (
                      <option key={m.metric.key} value={m.metric.key}>
                        {localized(m.metric.label, locale)} ({t(`dimension.layers.${m.layer}`)})
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <button type="submit" className="btn-secondary min-h-11">
                {t("compare.show")}
              </button>
            </form>
            {points.length > 0 ? (
              <ScatterPlot
                points={points}
                xLabel={name(x)}
                yLabel={name(y)}
                fx={(v) => fmt(x, v)}
                fy={(v) => fmt(y, v)}
                hrefOf={(p) => `${metricPath(x.metric.key)}?p=${p.code}`}
                caption={t("dimension.gapCaption", {
                  x: localized(x.metric.label, locale),
                  y: localized(y.metric.label, locale),
                })}
                columns={{ place: t("event.colPlace"), year: t("metric.mapColYear") }}
              />
            ) : (
              <p className="rounded-surface border border-default bg-surface-base p-5 text-fg-secondary">
                {t("compare.empty")}
              </p>
            )}
            {sameUnit && gaps.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="mb-2 text-left text-fg-secondary">
                    {t("dimension.gapTable", {
                      y: localized(y.metric.label, locale),
                      x: localized(x.metric.label, locale),
                    })}
                  </caption>
                  <thead>
                    <tr className="text-left text-fg-tertiary">
                      <th className="py-1 pr-4 font-normal">{t("event.colPlace")}</th>
                      <th className="py-1 pr-4 text-right font-normal">{t("dimension.gap")}</th>
                      <th className="py-1 text-right font-normal">{t("metric.mapColYear")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...gaps]
                      .sort((a, b) => Math.abs(b.gap ?? 0) - Math.abs(a.gap ?? 0))
                      .map((g) => (
                        <tr key={g.code} className="border-t border-subtle">
                          <th
                            scope="row"
                            className="py-1 pr-4 text-left font-normal text-fg-primary"
                          >
                            {g.name}
                          </th>
                          <td className="py-1 pr-4 text-right tabular-nums">
                            {g.gap === null
                              ? "—"
                              : `${g.gap > 0 ? "+" : ""}${chartValue(x.metric, g.gap).toLocaleString(locale)}`}
                          </td>
                          <td className="py-1 text-right tabular-nums text-fg-tertiary">
                            {g.year}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                <p className="mb-0 pt-2 text-xs text-fg-tertiary">{t("dimension.gapNote")}</p>
              </div>
            )}
          </section>
        )}

        {place && timeMeasures.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-fg-primary">{t("dimension.timeTitle")}</h2>
            <form method="get" className="flex flex-wrap items-end gap-4">
              <label className="flex flex-col gap-1 text-sm text-fg-secondary">
                {t("event.colPlace")}
                <select name="p" defaultValue={place} className="field min-w-48">
                  {places.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              {x && <input type="hidden" name="x" value={x.metric.key} />}
              {y && <input type="hidden" name="y" value={y.metric.key} />}
              <button type="submit" className="btn-secondary min-h-11">
                {t("compare.show")}
              </button>
            </form>
            <LineChart
              locale={locale}
              yFrom="zero"
              unit={x ? unitLabel(x.metric, t) : ""}
              preliminaryLabel={t("metric.preliminary")}
              series={timeMeasures.flatMap((m) => {
                const s = m.series.find((z) => z.code === place);
                return s
                  ? [
                      {
                        id: m.metric.key,
                        label: `${localized(m.metric.label, locale)} (${t(`dimension.layers.${m.layer}`)})`,
                        points: s.points.map((p) => ({
                          x: String(p.year),
                          y: chartValue(m.metric, p.value),
                          preliminary: p.quality !== "normal",
                        })),
                      },
                    ]
                  : [];
              })}
              caption={t("dimension.timeCaption", {
                place: places.find((p) => p.code === place)?.name ?? place,
              })}
            />
            <p className="mb-0 text-sm text-fg-tertiary">{t("dimension.timeNote")}</p>
          </section>
        )}

        <p className="mb-0 text-sm text-fg-tertiary">{t("dimension.caveat")}</p>
      </div>
    </PageLayout>
  );
}

import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import PageLayout from "@/components/ui/page-layout";
import type { Metric } from "@/lib/config/places/schema";
import { localized } from "@/lib/places/place-view";
import type { ScatterPoint } from "@/lib/statistics/compare";
import { chartValue, metricPath } from "@/lib/statistics/present";
import { unitLabel, type StatisticsTranslator } from "./metric-view";
import ScatterPlot from "./scatter-plot";

interface CompareViewProps {
  metrics: Metric[];
  x: Metric | null;
  y: Metric | null;
  points: ScatterPoint[];
  locale: Locale;
  t: StatisticsTranslator;
}

/** /statistics/compare: any two measures against each other, with the numbers in a table beneath. */
export default function CompareView({ metrics, x, y, points, locale, t }: CompareViewProps) {
  const name = (m: Metric) => {
    const unit = unitLabel(m, t);
    return `${localized(m.label, locale)}${unit ? `, ${unit}` : ""}`;
  };
  return (
    <PageLayout title={t("compare.title")} kicker={t("kicker")} description={t("compare.intro")}>
      <div className="max-w-5xl space-y-8">
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
              <select name={axis} defaultValue={(axis === "x" ? x : y)?.key} className="field">
                {metrics.map((m) => (
                  <option key={m.key} value={m.key}>
                    {localized(m.label, locale)}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <button type="submit" className="btn-secondary min-h-11">
            {t("compare.show")}
          </button>
        </form>
        {x && y && points.length > 0 ? (
          <ScatterPlot
            points={points}
            xLabel={name(x)}
            yLabel={name(y)}
            fx={(v) => chartValue(x, v).toLocaleString(locale)}
            fy={(v) => chartValue(y, v).toLocaleString(locale)}
            hrefOf={(p) => `${metricPath(x.key)}?p=${p.code}`}
            caption={t("compare.caption", {
              x: localized(x.label, locale),
              y: localized(y.label, locale),
            })}
            columns={{ place: t("event.colPlace"), year: t("metric.mapColYear") }}
          />
        ) : (
          <p className="rounded-surface border border-default bg-surface-base p-6 text-fg-secondary">
            {t("compare.empty")}
          </p>
        )}
        <p className="mb-0 text-sm text-fg-tertiary">{t("compare.caveat")}</p>
        <Link href="/statistics" className="text-sm text-fg-secondary underline">
          {t("compare.back")}
        </Link>
      </div>
    </PageLayout>
  );
}

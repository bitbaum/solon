import { BarChart } from "@bitbaum/chartkit/react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { Metric } from "@/lib/config/places/schema";
import { canonicalJson } from "@/lib/domain/canonical";
import { proposeHref } from "@/lib/domain/proposal-draft";
import { cite } from "@/lib/i18n/config-catalog";
import { localized } from "@/lib/places/place-view";
import { STATISTIC_AXES_POLICY_KEY, type Axis, type AxisScore } from "@/lib/statistics/axes";
import { parallelData } from "@/lib/statistics/compare";
import { chartValue } from "@/lib/statistics/present";
import type { StatisticsTranslator } from "./shared";
import ParallelPlot from "./parallel-plot";

export interface AxisPanelProps {
  axis: Axis;
  scores: AxisScore[];
  /** The weights in force: the reader's, else the axis's own. */
  weights: Record<string, number>;
  metrics: Map<string, Metric>;
  /** The page's address with these weights, for the proposal text. */
  selfUrl: string;
  /** Further parameters the weights form must keep (a reader-built axis's own choices). */
  hidden?: [string, string][];
  /** Offers to keep this axis and its weights as a saved view. */
  saveSpec?: string;
  locale: Locale;
  t: StatisticsTranslator;
}

/**
 * One axis: the places ranked along it with the weights in force, the
 * weights as a form the reader changes, who defined the axis, and a way to
 * propose these weights to a group as its own policy.
 */
export default function AxisPanel({
  axis,
  scores,
  weights,
  metrics,
  selfUrl,
  hidden = [],
  saveSpec,
  locale,
  t,
}: AxisPanelProps) {
  const label = localized(axis.label, locale);
  const name = (key: string) =>
    metrics.get(key) ? localized(metrics.get(key)!.label, locale) : key;
  const content = {
    axes: [
      {
        ...axis,
        components: axis.components.map((c) => ({ ...c, weight: weights[c.metric] ?? c.weight })),
      },
    ],
  };
  return (
    <div className="min-w-0 space-y-4 rounded-surface border border-default bg-surface-base p-6">
      <h3 className="text-xl font-semibold text-fg-primary">{label}</h3>
      <p className="mb-0 text-sm text-fg-tertiary">
        {t("index.axisAuthor", { author: cite(axis.author, locale) })}
      </p>
      <BarChart
        rows={scores.map((s) => {
          const missing = s.parts.filter((p) => p.value === null).map((p) => name(p.metric));
          // On a one-measure axis the 0–100 is only a rescaling of the figure, so the figure itself is shown.
          const only = axis.components.length === 1 ? s.parts[0] : undefined;
          const metric = only ? metrics.get(only.metric) : undefined;
          const figure =
            only?.value != null && metric
              ? `${chartValue(metric, only.value).toLocaleString(locale)}${
                  metric.unit === "ratio" ? " %" : ""
                } (${only.year})`
              : undefined;
          return {
            label: figure ? `${s.name} · ${figure}` : s.name,
            value: s.score,
            note:
              missing.length > 0 ? t("index.axisMissing", { metrics: missing.join(", ") }) : figure,
          };
        })}
        max={100}
        locale={locale}
        caption={t("index.axisCaption", {
          axis: label,
          direction: localized(axis.direction, locale),
        })}
      />
      {axis.components.length > 1 && (
        <div className="space-y-2">
          <h4 className="text-base font-semibold text-fg-primary">{t("index.parallelTitle")}</h4>
          <ParallelPlot
            {...parallelData(axis, scores)}
            columns={parallelData(axis, scores).columns.map((c) => {
              const m = metrics.get(c.metric);
              return {
                ...c,
                label: name(c.metric),
                fmt: (v: number) => (m ? chartValue(m, v) : v).toLocaleString(locale),
              };
            })}
            caption={t("index.parallelCaption", { axis: label })}
            texts={{ place: t("event.colPlace"), none: t("index.parallelNone") }}
          />
        </div>
      )}
      <form method="get" className="space-y-3">
        {hidden.map(([k, v]) => (
          <input key={`${k}=${v}`} type="hidden" name={k} value={v} />
        ))}
        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="mb-2 font-semibold text-fg-primary">{t("index.weightsLegend")}</legend>
          {axis.components.map((c) => (
            <label key={c.metric} className="flex flex-col gap-1 text-sm text-fg-secondary">
              <span>{t("index.weightOf", { metric: name(c.metric) })}</span>
              <input
                type="number"
                name={`w.${c.metric}`}
                min={0}
                max={10}
                step={0.5}
                defaultValue={weights[c.metric] ?? c.weight}
                className="field w-28"
              />
            </label>
          ))}
        </fieldset>
        <div className="flex flex-wrap gap-3">
          <button type="submit" className="btn-secondary min-h-11">
            {t("index.applyWeights")}
          </button>
          <Link href="/statistics" className="btn-secondary min-h-11">
            {t("index.resetWeights")}
          </Link>
          {saveSpec && (
            <button
              type="submit"
              formMethod="post"
              formAction="/api/v1/statistics/views"
              name="spec"
              value={saveSpec}
              className="btn-primary min-h-11"
            >
              {t("index.saveAxis")}
            </button>
          )}
          <Link
            href={proposeHref({
              category: "GOVERNANCE_RULES",
              title: t("index.proposeWeightsTitle", { axis: label }),
              body: t("index.proposeWeightsBody", {
                axis: label,
                version: axis.version,
                url: selfUrl,
                policy: STATISTIC_AXES_POLICY_KEY,
                json: canonicalJson(content),
              }),
            })}
            className="btn-secondary min-h-11"
          >
            {t("index.proposeWeights")}
          </Link>
        </div>
      </form>
    </div>
  );
}

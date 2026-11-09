import type { Locale } from "@/i18n/routing";
import type { Metric } from "@/lib/config/places/schema";
import { localized } from "@/lib/places/place-view";
import type { Axis } from "@/lib/statistics/axes";
import type { StatisticsTranslator } from "./metric-view";

/**
 * Build an axis of your own: pick the measures, say which way each should move
 * the score and how much it counts. The choices live in the link, so a built
 * axis can be shared, saved as a view or proposed to a group as its policy; no
 * choice is stored about the reader.
 */
export default function AxisBuilder({
  metrics,
  chosen,
  locale,
  t,
}: {
  metrics: Metric[];
  chosen: Axis | null;
  locale: Locale;
  t: StatisticsTranslator;
}) {
  return (
    <form
      method="get"
      className="space-y-4 rounded-surface border border-default bg-surface-base p-6"
    >
      <h3 className="text-xl font-semibold text-fg-primary">{t("index.buildTitle")}</h3>
      <p className="mb-0 max-w-3xl text-sm text-fg-secondary">{t("index.buildIntro")}</p>
      <ul className="space-y-2">
        {metrics.map((m) => {
          const c = chosen?.components.find((x) => x.metric === m.key);
          return (
            <li key={m.key} className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <label className="flex min-h-11 min-w-64 flex-1 items-center gap-2 text-fg-primary">
                <input type="checkbox" name="use" value={m.key} defaultChecked={Boolean(c)} />
                {localized(m.label, locale)}
              </label>
              <label className="flex items-center gap-2 text-sm text-fg-secondary">
                {t("index.buildMoves")}
                <select
                  name={`d.${m.key}`}
                  defaultValue={c?.sign === -1 ? "-1" : "1"}
                  className="field"
                >
                  <option value="1">{t("index.buildHigher")}</option>
                  <option value="-1">{t("index.buildLower")}</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm text-fg-secondary">
                {t("index.buildWeight")}
                <input
                  type="number"
                  name={`w.${m.key}`}
                  min={0}
                  max={10}
                  step={0.5}
                  defaultValue={c?.weight ?? 1}
                  className="field w-24"
                />
              </label>
            </li>
          );
        })}
      </ul>
      <button type="submit" className="btn-primary min-h-11">
        {t("index.buildShow")}
      </button>
    </form>
  );
}

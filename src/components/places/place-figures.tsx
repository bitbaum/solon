import { Meter, Sparkline } from "@bitbaum/chartkit/react";
import { Link } from "@/i18n/navigation";
import { PROFILE_FIGURE_GROUPS } from "@/lib/config/places/profile-figures";
import type { ProfileFigureView } from "@/lib/places/profile-figures";
import type { PlacesTranslator } from "./translator";

/** A figure as a reader reads it: a share in per cent, a rate to one decimal, a score whole. */
function formatFigure(figure: ProfileFigureView, locale: string): string {
  if (figure.unit === "ratio") {
    return new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }).format(
      figure.value,
    );
  }
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: figure.unit === "none" ? 0 : 1,
  }).format(figure.value);
}

/**
 * A place's figures, the same card for each: what it measures, the latest
 * value and its year, where it stands among the countries reporting that
 * year, its trend, and the series and source one tap away. Grouped by what a
 * reader asks: what the state takes, how it is governed, how safe it is.
 */
export default function PlaceFigures({
  figures,
  place,
  locale,
  t,
}: {
  figures: readonly ProfileFigureView[];
  place: string;
  locale: string;
  t: PlacesTranslator;
}) {
  if (figures.length === 0) return null;
  return (
    <section aria-labelledby="place-figures" className="space-y-6">
      <div>
        <h2 id="place-figures" className="headline text-2xl text-fg-primary">
          {t("figures.title")}
        </h2>
        <p className="mb-0 mt-2 text-sm text-fg-secondary">{t("figures.intro", { place })}</p>
      </div>
      {PROFILE_FIGURE_GROUPS.map((group) => {
        const rows = figures.filter((f) => f.group === group);
        if (rows.length === 0) return null;
        return (
          <div key={group} className="space-y-3">
            <h3 className="text-sm font-semibold text-fg-secondary">
              {t(`figures.groups.${group}`)}
            </h3>
            <ul className="grid gap-3 sm:grid-cols-2">
              {rows.map((f) => {
                const percent = f.position
                  ? Math.round((f.position.below / Math.max(1, f.position.others)) * 100)
                  : null;
                // The ends said as ends: "higher than 0%" reads as a riddle.
                const position =
                  f.position && percent !== null
                    ? f.position.below === 0
                      ? t("figures.lowest", { count: f.position.others + 1, year: f.year })
                      : f.position.below === f.position.others
                        ? t("figures.highest", { count: f.position.others + 1, year: f.year })
                        : t("figures.position", {
                            percent,
                            count: f.position.others,
                            year: f.year,
                          })
                    : null;
                return (
                  <li
                    key={f.key}
                    className="flex min-w-0 flex-col gap-3 rounded-surface border border-default bg-surface-base p-5"
                  >
                    <span className="text-sm text-fg-secondary">{f.label}</span>
                    <div className="flex items-end justify-between gap-4">
                      <span className="text-3xl font-semibold tabular-nums text-fg-primary">
                        {formatFigure(f, locale)}
                      </span>
                      <Sparkline
                        points={f.trend.map((p) => ({ x: p.year, y: p.value }))}
                        label={t("figures.trend", {
                          label: f.label,
                          from: f.trend[0]?.year ?? f.year,
                        })}
                      />
                    </div>
                    {position && percent !== null && (
                      <div className="flex items-center gap-3">
                        <Meter
                          value={percent}
                          max={100}
                          label={position}
                          tone="neutral"
                          showValue={false}
                        />
                        <p className="mb-0 text-xs text-fg-secondary">{position}</p>
                      </div>
                    )}
                    <Link
                      href={f.href}
                      className="mt-auto text-xs text-fg-tertiary underline-offset-4 hover:text-fg-secondary hover:underline"
                    >
                      {t("figures.source", { publisher: f.publisher, year: f.year })} →
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </section>
  );
}

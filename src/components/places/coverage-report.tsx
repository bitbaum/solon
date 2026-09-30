import PageLayout from "@/components/ui/page-layout";
import type { PackCoverage } from "@/lib/places/coverage";
import type { PlacesTranslator } from "./place-profile";

interface CoverageReportProps {
  packs: PackCoverage[];
  on: string;
  t: PlacesTranslator;
}

const cardClass = "rounded-surface border border-default bg-surface-base p-6";

/**
 * Coverage as the data has it (design §9.2): per pack, its levels, the facts
 * its places hold and the sources behind them. Nothing here is typed in; a
 * missing fact shows as a low count, not as silence.
 */
export default function CoverageReport({ packs, on, t }: CoverageReportProps) {
  return (
    <PageLayout title={t("coverage.title")} kicker={t("coverage.kicker")}>
      <div className="mx-auto max-w-3xl space-y-12">
        <p className="text-sm text-fg-secondary">{t("coverage.intro", { date: on })}</p>

        {packs.length === 0 && <p className="text-fg-secondary">{t("coverage.empty")}</p>}

        {packs.map((pack) => (
          <section key={pack.key} className="space-y-6" aria-labelledby={`pack-${pack.key}`}>
            <h2 id={`pack-${pack.key}`} className="text-xl font-semibold text-fg-primary">
              {pack.name}
            </h2>

            <div className={cardClass}>
              <h3 className="mb-3 font-semibold text-fg-primary">{t("coverage.levels")}</h3>
              <ul className="space-y-2 text-sm">
                {pack.levels.map((level) => (
                  <li
                    key={level.key}
                    className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-6"
                  >
                    <span className="text-fg-primary">
                      {level.name}
                      {(level.partial || level.overlapping) && (
                        <span className="block text-xs text-fg-tertiary">
                          {level.overlapping ? t("coverage.overlapping") : t("coverage.partial")}
                        </span>
                      )}
                    </span>
                    <span className="text-fg-secondary tabular-nums sm:text-right">
                      {t("coverage.places", { count: level.places })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={cardClass}>
              <h3 className="mb-1 font-semibold text-fg-primary">{t("coverage.facts")}</h3>
              {pack.metrics.length === 0 ? (
                <p className="text-sm text-fg-secondary">{t("coverage.noTaxModel")}</p>
              ) : (
                <>
                  <p className="mb-3 text-xs text-fg-tertiary">{t("coverage.factsNote")}</p>
                  <ul className="space-y-2 text-sm">
                    {pack.metrics.map((metric) => (
                      <li
                        key={`${metric.levelName}-${metric.metricLabel}`}
                        className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-6"
                      >
                        <span className="text-fg-primary">
                          {metric.metricLabel}{" "}
                          <span className="text-fg-tertiary">({metric.levelName})</span>
                          {metric.inTaxModel && (
                            <span className="ml-2 rounded-pill border border-default px-2 py-0.5 text-xs text-fg-secondary">
                              {t("coverage.inTaxModel")}
                            </span>
                          )}
                        </span>
                        <span className="text-fg-secondary tabular-nums sm:text-right">
                          {t("coverage.factsOf", { places: metric.places, of: metric.of })}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            {pack.sources.length > 0 && (
              <div>
                <h3 className="mb-3 font-semibold text-fg-primary">{t("coverage.sources")}</h3>
                <ul className="space-y-3 text-sm">
                  {pack.sources.map((source) => (
                    <li key={source.key} className="text-fg-secondary">
                      <a
                        href={source.homepage}
                        className="text-fg-primary hover:underline"
                        rel="noopener noreferrer"
                      >
                        {source.publisher}: {source.dataset}
                      </a>
                      <span className="block text-xs">
                        {source.retrievedOn
                          ? t("sources.retrieved", { date: source.retrievedOn })
                          : t("coverage.neverRetrieved")}
                        {source.lastRun &&
                          ` · ${t(`coverage.lastRun.${source.lastRun.status}`, { date: source.lastRun.on })}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        ))}
      </div>
    </PageLayout>
  );
}

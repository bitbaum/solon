"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatMoney, type ColumnEstimate, type CompareTaxPack } from "@/lib/places/compare-view";
import type { MapPlace } from "@/lib/places/map-view";

interface MapCardProps {
  place: MapPlace;
  estimate: ColumnEstimate;
  taxPack: CompareTaxPack | null;
  /** Its place from the cheapest among the places with a figure. */
  rank: { rank: number; count: number } | null;
  /** How much more it costs than the cheapest place on the map. */
  aboveCheapest: number | null;
  /** The input the estimate is for is the pack's example, not the reader's. */
  example: boolean;
  compare: { holds: boolean; full: boolean; toggle: () => void };
  onClose: () => void;
}

/** The place the reader picked: what tax costs there, and where to go next. */
export default function MapCard({
  place,
  estimate,
  taxPack,
  rank,
  aboveCheapest,
  example,
  compare,
  onClose,
}: MapCardProps) {
  const t = useTranslations("Places.map");
  const tc = useTranslations("Places.compare");
  const format = useFormatter();
  const levelList = (levels: string[]) =>
    format.list(levels.map((level) => taxPack?.levelNames[level] ?? level));

  return (
    <section
      aria-labelledby="map-card-title"
      className="space-y-3 rounded-surface border border-default bg-surface-overlay p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="map-card-title" className="font-semibold text-fg-primary">
            {place.name}
          </h2>
          {place.parentName && <p className="text-sm text-fg-tertiary">{place.parentName}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("close")}
          className="-m-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-control text-fg-secondary hover:bg-surface-raised"
        >
          <span aria-hidden>×</span>
        </button>
      </div>

      {estimate.kind === "estimate" && (
        <div>
          <p className="text-2xl font-semibold text-fg-primary">
            {formatMoney(estimate.estimate.total, estimate)}
          </p>
          <p className="text-sm text-fg-secondary">
            {example
              ? t("rateExample", {
                  rate: estimate.estimate.effectiveRate,
                  amount: formatMoney(taxPack?.exampleBase ?? 0, estimate),
                })
              : tc("rate", { rate: estimate.estimate.effectiveRate })}
          </p>
          {rank && (
            <p className="mt-1 text-sm text-fg-secondary">
              {aboveCheapest !== null && aboveCheapest >= 0.5
                ? t("rank", {
                    rank: rank.rank,
                    count: rank.count,
                    amount: formatMoney(aboveCheapest, estimate),
                  })
                : t("cheapest", { count: rank.count })}
            </p>
          )}
        </div>
      )}
      {estimate.kind === "not_recorded" && (
        <p className="text-sm text-fg-secondary">
          {tc("notRecordedFor", { levels: levelList(estimate.levels) })}
        </p>
      )}
      {estimate.kind === "needs_lower_place" && (
        <p className="text-sm text-fg-secondary">
          {tc("needsLowerPlace", { levels: levelList(estimate.levels) })}
        </p>
      )}
      {estimate.kind === "error" && <p className="text-sm text-fg-secondary">{tc("error")}</p>}

      <div className="flex flex-wrap gap-2">
        <Link href={`/places/${place.slugPath}`} className="btn-primary min-h-11">
          {t("open")}
        </Link>
        <button
          type="button"
          onClick={compare.toggle}
          disabled={!compare.holds && compare.full}
          aria-pressed={compare.holds}
          className="btn-secondary min-h-11 disabled:opacity-50"
        >
          {compare.holds ? t("inCompare") : compare.full ? t("compareFull") : t("addCompare")}
        </button>
      </div>
    </section>
  );
}

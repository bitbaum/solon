"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatMoney, type ColumnEstimate } from "@/lib/places/compare-view";
import type { MapPlace } from "@/lib/places/map-view";

export interface MapRow {
  place: MapPlace;
  estimate: ColumnEstimate;
}

type Sort = "cheapest" | "dearest" | "name";

const PAGE = 30;

const totalOf = (row: MapRow) =>
  row.estimate.kind === "estimate" ? row.estimate.estimate.total : null;

/**
 * The map's list (design §9.1): the same places and the same estimates, in
 * order, for keyboards, screen readers and anyone who would rather read.
 */
export default function MapList({
  rows,
  levelName,
  onShow,
}: {
  rows: MapRow[];
  levelName: string;
  onShow: (place: MapPlace) => void;
}) {
  const t = useTranslations("Places.map");
  const [sort, setSort] = useState<Sort>("cheapest");
  const [shown, setShown] = useState(PAGE);
  const sorted = [...rows].sort((a, b) => {
    const [x, y] = [totalOf(a), totalOf(b)];
    if (sort === "name" || (x === null && y === null)) {
      return a.place.name.localeCompare(b.place.name);
    }
    if (x === null || y === null) {
      return x === null ? 1 : -1;
    }
    return sort === "cheapest" ? x - y : y - x;
  });

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold text-fg-primary">
          {t("listTitle", { level: levelName, count: rows.length })}
        </h2>
        <label className="flex items-center gap-2 text-sm text-fg-secondary">
          {t("sortLabel")}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="field w-auto py-1"
          >
            <option value="cheapest">{t("sortCheapest")}</option>
            <option value="dearest">{t("sortDearest")}</option>
            <option value="name">{t("sortName")}</option>
          </select>
        </label>
      </div>
      <ol className="divide-y divide-default rounded-surface border border-default bg-surface-base">
        {sorted.slice(0, shown).map(({ place, estimate }) => (
          <li key={place.feature} className="flex items-center gap-4 px-5 py-3">
            <div className="min-w-0 flex-1">
              <Link
                href={`/places/${place.slugPath}`}
                className="font-medium text-fg-primary hover:underline"
              >
                {place.name}
              </Link>
              {place.parentName && (
                <span className="block text-xs text-fg-tertiary">{place.parentName}</span>
              )}
            </div>
            <span className="shrink-0 text-right text-sm">
              {estimate.kind === "estimate" ? (
                <span className="font-semibold tabular-nums text-fg-primary">
                  {formatMoney(estimate.estimate.total, estimate)}
                </span>
              ) : (
                <span className="text-fg-tertiary">
                  {estimate.kind === "no_input" ? "–" : t("notYet")}
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={() => onShow(place)}
              className="btn-secondary min-h-11 shrink-0 px-3 text-sm"
              aria-label={t("showOnMapNamed", { place: place.name })}
            >
              {t("showOnMap")}
            </button>
          </li>
        ))}
      </ol>
      {shown < sorted.length && (
        <button
          type="button"
          onClick={() => setShown(sorted.length)}
          className="btn-secondary min-h-11"
        >
          {t("showAll", { count: sorted.length })}
        </button>
      )}
    </section>
  );
}

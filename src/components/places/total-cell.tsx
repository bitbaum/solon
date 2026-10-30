"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  compareHref,
  fillTemplate,
  formatMoney,
  type ColumnEstimate,
  type CompareColumn,
  type CompareTaxPack,
} from "@/lib/places/compare-view";

interface TotalCellProps {
  column: CompareColumn;
  estimate: ColumnEstimate;
  pack: CompareTaxPack | undefined;
  /** Every column's path, in order, to swap a refining place in for this one. */
  paths: readonly string[];
  /** The lowest total in this estimate's currency; set when there is something to rank. */
  least: number | null;
}

/** One place's tax per year: the bill and its rate, or why there is none and what to do. */
export default function TotalCell({ column, estimate: e, pack, paths, least }: TotalCellProps) {
  const t = useTranslations("Places.compare");
  const format = useFormatter();
  const levelList = (levels: string[]) =>
    format.list(levels.map((level) => pack?.levelNames[level] ?? level));
  switch (e.kind) {
    case "estimate": {
      const rate = pack?.rate
        ? fillTemplate(pack.rate.yours, {
            rate: format.number(e.estimate.effectiveRate, {
              style: "percent",
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            }),
          })
        : t("rate", { rate: e.estimate.effectiveRate });
      const more = least === null ? null : e.estimate.total - least;
      return (
        <>
          <span className="block text-base font-semibold text-fg-primary sm:text-lg">
            {formatMoney(e.estimate.total, e)}
          </span>
          <span className="block text-xs text-fg-secondary">{rate}</span>
          {more !== null && (
            <span className="mt-1 block text-xs text-fg-secondary">
              {more < 0.5 ? (
                <span className="rounded-pill border border-accent px-2 py-0.5 text-fg-primary">
                  {t("lowest")}
                </span>
              ) : (
                t("more", { amount: formatMoney(more, e) })
              )}
            </span>
          )}
        </>
      );
    }
    case "no_input":
      return <span className="text-fg-tertiary">{t("enterAmount")}</span>;
    case "no_model":
      return <span className="text-fg-secondary">{t("noModel", { pack: column.packName })}</span>;
    case "needs_lower_place":
      return (
        <span className="text-fg-secondary">
          {t("needsLowerPlace", { levels: levelList(e.levels) })}
          {column.refinedBy.length > 0 && (
            <span className="mt-2 block space-y-1">
              {column.refinedBy.map((place) => (
                <Link
                  key={place.slugPath}
                  href={compareHref(
                    paths.map((path) => (path === column.slugPath ? place.slugPath : path)),
                  )}
                  prefetch={false}
                  className="block text-fg-primary underline-offset-2 hover:underline"
                >
                  {place.name}
                </Link>
              ))}
            </span>
          )}
        </span>
      );
    case "not_recorded":
      return (
        <span className="text-fg-secondary">
          {t("notRecordedFor", { levels: levelList(e.levels) })}
        </span>
      );
    case "error":
      return <span className="text-fg-secondary">{t("error")}</span>;
  }
}

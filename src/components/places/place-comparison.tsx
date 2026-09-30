"use client";

import { useMemo } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useDeviceInputs } from "./device-inputs";
import TaxSituation from "./tax-situation";
import {
  compareHref,
  estimateColumn,
  formatMoney,
  lowestTotals,
  parseAmount,
  type ColumnEstimate,
  type CompareColumn,
  type CompareTaxPack,
  type Comparison,
} from "@/lib/places/compare-view";

/**
 * Places side by side (design §9.2): what tax costs there for the reader's
 * income, and the figures that set it. Every figure is sourced; a missing one
 * says why it is missing. There is no Solon score.
 */
export default function PlaceComparison({ comparison }: { comparison: Comparison }) {
  const t = useTranslations("Places.compare");
  const format = useFormatter();
  const { columns, taxPacks } = comparison;
  const [inputs, updateInput] = useDeviceInputs(taxPacks);
  const packOf = (column: CompareColumn) => taxPacks.find((p) => p.key === column.packKey);

  const estimates: ColumnEstimate[] = useMemo(
    () =>
      columns.map((column) => {
        const pack = taxPacks.find((p) => p.key === column.packKey);
        const input = pack ? inputs[pack.key] : undefined;
        return estimateColumn(column, pack, {
          base: input ? parseAmount(input.amount) : null,
          variant: input?.variant ?? "",
          conditions: input?.conditions ?? {},
        });
      }),
    [columns, taxPacks, inputs],
  );
  const lowest = lowestTotals(estimates);
  const money = formatMoney;
  const percent = (value: number) =>
    format.number(value, { style: "percent", maximumFractionDigits: 1 });
  const levelList = (pack: CompareTaxPack | undefined, levels: string[]) =>
    format.list(levels.map((level) => pack?.levelNames[level] ?? level));

  const complete = columns.flatMap((column, i) => {
    const e = estimates[i]!;
    return e.kind === "estimate" ? [{ column, e }] : [];
  });
  const cheapest =
    complete.length >= 2 && new Set(complete.map(({ e }) => e.currency)).size === 1
      ? complete.reduce((a, b) => (b.e.estimate.total < a.e.estimate.total ? b : a))
      : null;

  const remaining = (slugPath: string) =>
    compareHref(columns.map((c) => c.slugPath).filter((path) => path !== slugPath));
  const single = taxPacks.length === 1 ? taxPacks[0] : undefined;

  const totalCell = (column: CompareColumn, e: ColumnEstimate) => {
    const pack = packOf(column);
    switch (e.kind) {
      case "estimate": {
        const least = lowest.get(e.currency)!;
        const more = e.estimate.total - least;
        return (
          <>
            <span className="block text-lg font-semibold text-fg-primary">
              {money(e.estimate.total, e)}
            </span>
            <span className="block text-xs text-fg-secondary">
              {t("rate", { rate: e.estimate.effectiveRate })}
            </span>
            {complete.length >= 2 && (
              <span className="mt-1 block text-xs text-fg-secondary">
                {more < 0.5 ? (
                  <span className="rounded-pill border border-accent px-2 py-0.5 text-fg-primary">
                    {t("lowest")}
                  </span>
                ) : (
                  t("more", { amount: money(more, e) })
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
            {t("needsLowerPlace", { levels: levelList(pack, e.levels) })}
          </span>
        );
      case "not_recorded":
        return (
          <span className="text-fg-secondary">
            {t("notRecordedFor", { levels: levelList(pack, e.levels) })}
          </span>
        );
      case "error":
        return <span className="text-fg-secondary">{t("error")}</span>;
    }
  };

  const rowHeader = "sticky left-0 z-10 bg-surface-base px-4 py-3 text-left align-top font-normal";
  const cell = "px-4 py-3 align-top";

  return (
    <div className="space-y-8">
      {taxPacks.map((pack) => (
        <TaxSituation
          key={pack.key}
          pack={pack}
          input={inputs[pack.key]!}
          onChange={(patch) => updateInput(pack.key, patch)}
          title={
            taxPacks.length > 1 ? t("yourSituationIn", { pack: pack.name }) : t("yourSituation")
          }
          idPrefix="compare"
        />
      ))}

      <p aria-live="polite" className="text-fg-primary">
        {cheapest &&
          t("cheapest", {
            place: cheapest.column.name,
            amount: money(cheapest.e.estimate.total, cheapest.e),
          })}
      </p>

      <div className="overflow-x-auto rounded-surface border border-default">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">{t("caption")}</caption>
          <thead>
            <tr className="border-b border-default">
              <td className={`${rowHeader} w-28 sm:w-44`} />
              {columns.map((column) => (
                <th
                  key={column.slugPath}
                  scope="col"
                  className={`${cell} min-w-36 text-left sm:min-w-44`}
                >
                  <Link
                    href={`/places/${column.slugPath}`}
                    className="font-semibold text-fg-primary hover:underline"
                  >
                    {column.name}
                  </Link>
                  <span className="block text-xs font-normal text-fg-tertiary">
                    {column.parentName
                      ? t("placeIn", { level: column.levelName, parent: column.parentName })
                      : column.levelName}
                  </span>
                  <Link
                    href={remaining(column.slugPath)}
                    prefetch={false}
                    className="mt-1 inline-block text-xs font-normal text-fg-secondary hover:text-fg-primary hover:underline"
                    aria-label={t("removeNamed", { place: column.name })}
                  >
                    {t("remove")}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          {taxPacks.length > 0 && (
            <tbody>
              <tr className="border-b border-default bg-surface-raised">
                <th
                  scope="colgroup"
                  colSpan={columns.length + 1}
                  className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-caps text-fg-secondary"
                >
                  <span className="sticky left-4 inline-block max-w-[calc(100vw-5rem)]">
                    {single
                      ? t(comparison.earlierYear ? "moneyEarlier" : "money", {
                          year: single.taxYear,
                        })
                      : t("moneyNoYear")}
                  </span>
                </th>
              </tr>
              <tr className="border-b border-default">
                <th scope="row" className={`${rowHeader} font-medium text-fg-primary`}>
                  {t("total")}
                </th>
                {columns.map((column, i) => (
                  <td key={column.slugPath} className={cell}>
                    {totalCell(column, estimates[i]!)}
                  </td>
                ))}
              </tr>
              {taxPacks.flatMap((pack) =>
                pack.components.map((component) => (
                  <tr key={`${pack.key}-${component.key}`} className="border-b border-default">
                    <th scope="row" className={`${rowHeader} text-fg-secondary`}>
                      {component.label}
                    </th>
                    {columns.map((column, i) => {
                      const e = estimates[i]!;
                      const result =
                        e.kind === "estimate" && column.packKey === pack.key
                          ? e.estimate.components.find((c) => c.key === component.key)
                          : undefined;
                      return (
                        <td key={column.slugPath} className={`${cell} text-fg-primary`}>
                          {e.kind !== "estimate" || !result || result.amount === null ? (
                            <span className="text-fg-tertiary">–</span>
                          ) : result.applies ? (
                            money(result.amount, e)
                          ) : (
                            <span className="text-fg-tertiary">{t("doesNotApply")}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                )),
              )}
              {taxPacks.flatMap((pack) =>
                pack.multiplierRows.map((row) => (
                  <tr key={`${pack.key}-${row.key}`} className="border-b border-default">
                    <th scope="row" className={`${rowHeader} text-fg-secondary`}>
                      {t("multiplier", { metric: row.metric, level: row.level })}
                    </th>
                    {columns.map((column) => {
                      const value =
                        column.packKey === pack.key ? column.multipliers[row.key] : undefined;
                      return (
                        <td key={column.slugPath} className={`${cell} text-fg-primary`}>
                          {value === undefined ? (
                            <span className="text-fg-tertiary">–</span>
                          ) : value === null ? (
                            <span className="text-fg-tertiary">{t("notRecorded")}</span>
                          ) : (
                            percent(value)
                          )}
                        </td>
                      );
                    })}
                  </tr>
                )),
              )}
              <tr className="border-b border-default">
                <th scope="row" className={`${rowHeader} text-fg-secondary`}>
                  {t("taxedBy")}
                </th>
                {columns.map((column) => (
                  <td key={column.slugPath} className={`${cell} text-fg-primary`}>
                    {column.taxedBy.length === 0 ? (
                      <span className="text-fg-tertiary">–</span>
                    ) : (
                      column.taxedBy.map((p) => (
                        <span key={`${p.levelName}-${p.name}`} className="block">
                          {t("taxedByPlace", { name: p.name, level: p.levelName })}
                        </span>
                      ))
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          )}
          <tbody>
            <tr>
              <th scope="row" className={`${rowHeader} text-fg-secondary`}>
                {t("later")}
              </th>
              <td colSpan={columns.length} className={`${cell} text-fg-secondary`}>
                {t("laterText")}{" "}
                <Link href="/places/coverage" className="text-fg-primary hover:underline">
                  {t("coverageLink")}
                </Link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {taxPacks.length > 0 && (
        <p className="text-xs leading-relaxed text-fg-tertiary">
          {t("disclaimer")} {taxPacks.map((pack) => pack.excludes).join(" ")}
        </p>
      )}
    </div>
  );
}

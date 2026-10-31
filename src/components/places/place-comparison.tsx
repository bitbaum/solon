"use client";

import { useMemo } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { groupInput, useDeviceInputs } from "./device-inputs";
import TaxSituation from "./tax-situation";
import ActionList from "./action-list";
import CalendarButton from "./calendar-button";
import TotalCell from "./total-cell";
import ComparisonRow, { comparisonCell as cell } from "./comparison-row";
import {
  compareHref,
  estimateColumn,
  formatMoney,
  lowestTotals,
  parseAmount,
  componentRowShows,
  multiplierRowShows,
  parseAmounts,
  rowShows,
  mergedMultiplierRows,
  situationGroups,
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
  const ta = useTranslations("Places.actions");
  const format = useFormatter();
  const { columns, taxPacks } = comparison;
  const [inputs, updateInput] = useDeviceInputs(taxPacks);
  /** One form for the countries that can share one: Switzerland and Liechtenstein, both in francs. */
  const groups = useMemo(() => situationGroups(taxPacks), [taxPacks]);
  const packOf = (column: CompareColumn) => taxPacks.find((p) => p.key === column.packKey);

  const estimates: ColumnEstimate[] = useMemo(
    () =>
      columns.map((column) => {
        const pack = taxPacks.find((p) => p.key === column.packKey);
        const input = pack ? inputs[pack.key] : undefined;
        return estimateColumn(column, pack, {
          base: input ? parseAmount(input.amount) : null,
          amounts: parseAmounts(input?.amounts),
          variant: input?.variant ?? "",
          conditions: input?.conditions ?? {},
        });
      }),
    [columns, taxPacks, inputs],
  );
  const lowest = lowestTotals(estimates);
  /** Rows for wealth or a church show once the reader enters wealth or names the church. */
  const shows = (pack: CompareTaxPack, row: Parameters<typeof rowShows>[0]) =>
    rowShows(row, {
      base: null,
      variant: "",
      amounts: parseAmounts(inputs[pack.key]?.amounts),
      conditions: inputs[pack.key]?.conditions ?? {},
    });
  const money = formatMoney;
  const percent = (value: number) =>
    format.number(value, { style: "percent", maximumFractionDigits: 1 });
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

  const multiplierRows = mergedMultiplierRows(
    taxPacks,
    (row) => t("multiplier", { metric: row.metric, level: row.level }),
    (pack, row) => shows(pack, row) && multiplierRowShows(pack.key, row, columns),
  );

  const count = columns.length;

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <TaxSituation
          key={group.key}
          pack={group.pack}
          input={groupInput(
            inputs,
            group.packs.map((p) => p.key),
          )}
          onChange={(patch) =>
            updateInput(
              group.packs.map((p) => p.key),
              patch,
            )
          }
          title={
            groups.length > 1 ? t("yourSituationIn", { pack: group.pack.name }) : t("yourSituation")
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
              <td className="sticky left-0 z-10 hidden w-44 bg-surface-base sm:table-cell" />
              {columns.map((column) => (
                <th
                  key={column.slugPath}
                  scope="col"
                  className="min-w-28 px-2 py-3 text-left align-top sm:min-w-44 sm:px-4"
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
            <>
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
              </tbody>
              <ComparisonRow
                label={t("total")}
                labelClassName="font-medium text-fg-primary"
                columnCount={count}
              >
                {columns.map((column, i) => (
                  <td key={column.slugPath} className={cell}>
                    <TotalCell
                      column={column}
                      estimate={estimates[i]!}
                      pack={packOf(column)}
                      paths={columns.map((c) => c.slugPath)}
                      least={
                        complete.length >= 2 && estimates[i]!.kind === "estimate"
                          ? (lowest.get((estimates[i] as { currency: string }).currency) ?? null)
                          : null
                      }
                    />
                  </td>
                ))}
              </ComparisonRow>
              {taxPacks.flatMap((pack) =>
                pack.components
                  .filter(
                    (c) => shows(pack, c) && componentRowShows(pack.key, c.key, columns, estimates),
                  )
                  .map((component) => (
                    <ComparisonRow
                      key={`${pack.key}-${component.key}`}
                      label={component.label}
                      labelClassName="text-fg-secondary"
                      columnCount={count}
                    >
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
                    </ComparisonRow>
                  )),
              )}
              {multiplierRows.map(({ label, rows }) => (
                <ComparisonRow
                  key={label}
                  label={label}
                  labelClassName="text-fg-secondary"
                  columnCount={count}
                >
                  {columns.map((column) => {
                    const row = rows.find((r) => r.packKey === column.packKey);
                    const value = row ? column.multipliers[row.key] : undefined;
                    return (
                      <td key={column.slugPath} className={`${cell} text-fg-primary`}>
                        {value === undefined ||
                        (value === null &&
                          (row!.optional ||
                            column.refinedBy.some((r) => r.standsFor === row!.levelKey))) ? (
                          <span className="text-fg-tertiary">–</span>
                        ) : value === null ? (
                          <span className="text-fg-tertiary">{t("notRecorded")}</span>
                        ) : (
                          percent(value)
                        )}
                      </td>
                    );
                  })}
                </ComparisonRow>
              ))}
              <ComparisonRow
                label={t("taxedBy")}
                labelClassName="text-fg-secondary"
                columnCount={count}
              >
                {columns.map((column) => (
                  <td key={column.slugPath} className={`${cell} text-fg-primary`}>
                    {column.taxedBy.length === 0 ? (
                      <span className="text-fg-tertiary">–</span>
                    ) : (
                      column.taxedBy.map((p) => (
                        <span key={`${p.levelName}-${p.name}`} className="block">
                          {t.rich("taxedByPlace", {
                            name: p.name,
                            level: p.levelName,
                            small: (chunks) => (
                              <span className="text-xs text-fg-tertiary">{chunks}</span>
                            ),
                          })}
                        </span>
                      ))
                    )}
                  </td>
                ))}
              </ComparisonRow>
            </>
          )}
          {columns.some((column) => column.actions.length > 0) && (
            <ComparisonRow
              label={t("act")}
              labelClassName="font-medium text-fg-primary"
              columnCount={count}
            >
              {columns.map((column) => (
                <td key={column.slugPath} className={`${cell} text-sm`}>
                  {column.actions.length === 0 ? (
                    <span className="text-fg-tertiary">–</span>
                  ) : (
                    <>
                      <ActionList
                        actions={column.actions}
                        due={(date) => ta("due", { date })}
                        dueSource={ta("dueSource")}
                        showOfferedBy={false}
                      />
                      <CalendarButton actions={column.actions} />
                    </>
                  )}
                </td>
              ))}
            </ComparisonRow>
          )}
          <ComparisonRow label={t("later")} labelClassName="text-fg-secondary" columnCount={count}>
            <td colSpan={count} className={`${cell} text-fg-secondary`}>
              {t("laterText")}{" "}
              <Link href="/places/coverage" className="text-fg-primary hover:underline">
                {t("coverageLink")}
              </Link>
            </td>
          </ComparisonRow>
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

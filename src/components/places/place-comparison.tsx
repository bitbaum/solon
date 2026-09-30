"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  compareHref,
  estimateColumn,
  lowestTotals,
  parseAmount,
  type ColumnEstimate,
  type CompareColumn,
  type CompareTaxPack,
  type Comparison,
} from "@/lib/places/compare-view";

interface MoneyFormat {
  currency: string;
  formatLocale: string;
}

interface PackInput {
  amount: string;
  variant: string;
  conditions: Record<string, boolean>;
}

/**
 * Kept for the tab only, so adding a place keeps what the reader typed. It is
 * never sent anywhere: not in the link, not in a form, not to the server.
 */
const STORAGE_KEY = "solon.compare.inputs";

/**
 * The tab's inputs as a store: held in memory, mirrored to sessionStorage when
 * the browser allows it (private mode may not), and empty on the server.
 */
const listeners = new Set<() => void>();
let held: string | null | undefined;

function snapshot(): string {
  if (held === undefined) {
    try {
      held = sessionStorage.getItem(STORAGE_KEY);
    } catch {
      held = null;
    }
  }
  return held ?? "{}";
}

function save(value: string) {
  held = value;
  try {
    sessionStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Kept in memory for this page instead.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function parseSaved(json: string): Record<string, Partial<PackInput>> {
  try {
    const saved: unknown = JSON.parse(json);
    return typeof saved === "object" && saved !== null
      ? (saved as Record<string, Partial<PackInput>>)
      : {};
  } catch {
    return {};
  }
}

/** A pack's saved input, where it still fits the pack; the pack's defaults otherwise. */
function inputFor(pack: CompareTaxPack, saved: Partial<PackInput> | undefined): PackInput {
  return {
    amount: typeof saved?.amount === "string" ? saved.amount : "",
    variant:
      typeof saved?.variant === "string" && pack.variants.some((v) => v.key === saved.variant)
        ? saved.variant
        : (pack.variants[0]?.key ?? ""),
    conditions:
      typeof saved?.conditions === "object" && saved.conditions !== null ? saved.conditions : {},
  };
}

function useDeviceInputs(packs: readonly CompareTaxPack[]) {
  const json = useSyncExternalStore(subscribe, snapshot, () => "{}");
  const inputs = useMemo(() => {
    const saved = parseSaved(json);
    return Object.fromEntries(packs.map((pack) => [pack.key, inputFor(pack, saved[pack.key])]));
  }, [json, packs]);
  const update = (packKey: string, patch: Partial<PackInput>) =>
    save(
      JSON.stringify({
        ...parseSaved(snapshot()),
        [packKey]: { ...inputs[packKey]!, ...patch },
      }),
    );
  return [inputs, update] as const;
}

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
  const money = (amount: number, { currency, formatLocale }: MoneyFormat) =>
    new Intl.NumberFormat(formatLocale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
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
      {taxPacks.map((pack) => {
        const input = inputs[pack.key]!;
        const set = (patch: Partial<PackInput>) => updateInput(pack.key, patch);
        const amountId = `compare-amount-${pack.key}`;
        return (
          <section
            key={pack.key}
            aria-labelledby={`${amountId}-title`}
            className="space-y-5 rounded-surface border border-default bg-surface-base p-5 sm:p-6"
          >
            <h2 id={`${amountId}-title`} className="font-semibold text-fg-primary">
              {taxPacks.length > 1 ? t("yourSituationIn", { pack: pack.name }) : t("yourSituation")}
            </h2>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label htmlFor={amountId} className="block text-sm font-medium text-fg-primary">
                  {pack.base.label}
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-fg-secondary" aria-hidden>
                    {pack.currency}
                  </span>
                  <input
                    id={amountId}
                    inputMode="numeric"
                    autoComplete="off"
                    value={input.amount}
                    onChange={(e) => set({ amount: e.target.value })}
                    placeholder={t("amountPlaceholder")}
                    aria-describedby={`${amountId}-hint`}
                    className="field"
                  />
                </div>
                <p id={`${amountId}-hint`} className="mt-2 text-xs text-fg-tertiary">
                  {pack.base.hint && `${pack.base.hint} `}
                  {t("privacy")}
                </p>
              </div>
              {pack.variants.length > 1 && (
                <fieldset>
                  <legend className="block text-sm font-medium text-fg-primary">
                    {t("household")}
                  </legend>
                  <div className="mt-2 space-y-2">
                    {pack.variants.map((variant) => (
                      <label
                        key={variant.key}
                        className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-control border px-3 text-sm ${
                          input.variant === variant.key
                            ? "border-accent bg-surface-raised text-fg-primary"
                            : "border-default text-fg-secondary"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`compare-variant-${pack.key}`}
                          value={variant.key}
                          checked={input.variant === variant.key}
                          onChange={() => set({ variant: variant.key })}
                        />
                        {variant.label}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
              {pack.conditions.map((condition) => (
                <label
                  key={condition.key}
                  className="flex min-h-11 items-center gap-3 text-sm text-fg-primary"
                >
                  <input
                    type="checkbox"
                    checked={input.conditions[condition.key] === true}
                    onChange={(e) =>
                      set({
                        conditions: { ...input.conditions, [condition.key]: e.target.checked },
                      })
                    }
                  />
                  {condition.label}
                </label>
              ))}
            </div>
          </section>
        );
      })}

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

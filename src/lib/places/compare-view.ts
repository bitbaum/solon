/**
 * What /compare shows (design §9.2), in the terms the browser needs. The
 * server hands each column the facts its chain holds; the estimate runs here,
 * on the reader's device, so their income never reaches Solon (§10). Nothing
 * in this file reads the database, and it must stay that way: the comparison
 * component imports it.
 */
import { evaluate, type Estimate, type Fact, type TaxModel } from "@/lib/tax-model";
import type { PlaceAction, PlaceSource } from "./place-view";

export interface ComparePlaceRef {
  name: string;
  levelName: string;
}

export interface CompareColumn {
  slugPath: string;
  name: string;
  levelName: string;
  /** The place it is part of, when it has one. */
  parentName: string | null;
  packKey: string;
  packName: string;
  /** The places in its chain that levy tax, from the root down. */
  taxedBy: ComparePlaceRef[];
  /** The facts its pack's tax model reads, in the model's terms. */
  facts: Fact[];
  /** The levels its chain reaches, so a missing figure can say why it is missing. */
  levels: string[];
  /**
   * The value of each multiplier row of its pack, by row key: null when not
   * recorded, absent when the row's level is not in its chain.
   */
  multipliers: Record<string, number | null>;
  /** What a resident can do there: file, pay, ask for time, at the authority's own page. */
  actions: PlaceAction[];
  /**
   * The places inside it that refine its figures (a commune whose rate
   * depends on the locality): each one's level and the level it stands for.
   */
  refinedBy: { name: string; slugPath: string; levelKey: string; standsFor: string }[];
}

export interface CompareInput {
  key: string;
  label: string;
  hint: string | null;
}

/** A pack's tax model with every key in the reader's words. */
export interface CompareTaxPack {
  key: string;
  name: string;
  currency: string;
  /** The reader's language in the country's number formats (de-CH), for its amounts. */
  formatLocale: string;
  /** The fiscal year the figures are for, as the pack counts it (2026, or 2026/27). */
  taxYear: string;
  model: TaxModel;
  base: CompareInput;
  /** Further amounts a component reads instead of the base (taxable wealth); optional. */
  amounts: CompareInput[];
  /** The model's yes-or-no inputs that no choice asks. */
  conditions: CompareInput[];
  /** Yes-or-no inputs asked as one question, of which at most one is true. */
  choices: { key: string; label: string; none: string; options: CompareInput[] }[];
  variants: { key: string; label: string }[];
  /**
   * `base`: the amount input the component reads, shown only once it is
   * entered. `when`: inputs of which one must be true for it to show.
   */
  components: { key: string; label: string; base: string | null; when: string[] }[];
  /**
   * One row per multiplier the model reads: the metric and the level that
   * publishes it, named; `when`, the input that must be true for it to show.
   */
  multiplierRows: {
    key: string;
    levelKey: string;
    metric: string;
    level: string;
    when: string | null;
    /** A multiplier that counts as none where it is not recorded. */
    optional: boolean;
  }[];
  levelNames: Record<string, string>;
  excludes: string;
  /** The effective rate in the pack's words, or null for the generic message. */
  rate: { yours: string; example: string } | null;
  /** The base the map shows until the reader enters theirs; null without one. */
  exampleBase: number | null;
}

export interface Comparison {
  columns: CompareColumn[];
  /** The packs of the columns that have a tax model. */
  taxPacks: CompareTaxPack[];
  sources: PlaceSource[];
  /** Paths in the request that no current place holds. */
  notFound: string[];
  /** This year's figures are not all published yet, so the latest complete year is shown. */
  earlierYear: boolean;
}

/**
 * The packs that can share one situation: those in one currency, whose base
 * is the same kind of amount, asked once. The form shows the first pack's
 * words, with every other pack's further amounts, choices and yes-or-no
 * inputs added; a household it does not know is left to the first pack's.
 */
export interface SituationGroup {
  /** The first pack's key: where the group's form keeps its ids. */
  key: string;
  packs: CompareTaxPack[];
  /** The questions the group's form asks, merged. */
  pack: CompareTaxPack;
}

export function situationGroups(packs: readonly CompareTaxPack[]): SituationGroup[] {
  const groups: SituationGroup[] = [];
  for (const pack of packs) {
    const group = groups.find(
      (g) => g.pack.currency === pack.currency && g.pack.base.key === pack.base.key,
    );
    if (!group) {
      groups.push({ key: pack.key, packs: [pack], pack });
      continue;
    }
    const merged = group.pack;
    const add = <T extends { key: string }>(into: T[], more: T[]) => [
      ...into,
      ...more.filter((m) => !into.some((i) => i.key === m.key)),
    ];
    // A hint one country gives would be wrong for the other ("4 % of it is
    // taxed as income" is Liechtenstein's): where they differ, neither is shown.
    const sameHint = (into: CompareInput[], more: CompareInput[]) =>
      into.map((i) => {
        const other = more.find((m) => m.key === i.key);
        return other && other.hint !== i.hint ? { ...i, hint: null } : i;
      });
    group.packs.push(pack);
    group.pack = {
      ...merged,
      name: `${merged.name} · ${pack.name}`,
      base: sameHint([merged.base], [pack.base])[0]!,
      amounts: add(sameHint(merged.amounts, pack.amounts), pack.amounts),
      conditions: add(merged.conditions, pack.conditions),
      choices: add(merged.choices, pack.choices),
    };
  }
  return groups;
}

type MultiplierRow = CompareTaxPack["multiplierRows"][number];

/**
 * One row per multiplier as the reader reads it: a commune's multiplier in
 * Switzerland and in Liechtenstein is one row, each column filled from its own
 * country's figure. Rows keep the order they first appear in.
 */
export function mergedMultiplierRows(
  packs: readonly CompareTaxPack[],
  labelOf: (row: MultiplierRow) => string,
  keep: (pack: CompareTaxPack, row: MultiplierRow) => boolean,
): { label: string; rows: (MultiplierRow & { packKey: string })[] }[] {
  const merged: { label: string; rows: (MultiplierRow & { packKey: string })[] }[] = [];
  for (const pack of packs)
    for (const row of pack.multiplierRows) {
      if (!keep(pack, row)) continue;
      const label = labelOf(row);
      const entry = { ...row, packKey: pack.key };
      const at = merged.find((m) => m.label === label);
      if (at) at.rows.push(entry);
      else merged.push({ label, rows: [entry] });
    }
  return merged;
}

/** The reader's inputs, kept on their device. */
export interface EstimateInput {
  base: number | null;
  /** The pack's further amounts, by input key; an amount not entered is left out. */
  amounts?: Record<string, number | null>;
  variant: string;
  conditions: Record<string, boolean>;
}

export type ColumnEstimate =
  | { kind: "no_model" }
  | { kind: "no_input" }
  /** The model reads levels below this place: a lower place decides. */
  | { kind: "needs_lower_place"; levels: string[] }
  /** The chain reaches the level, but its figure is not recorded. */
  | { kind: "not_recorded"; levels: string[] }
  | { kind: "estimate"; estimate: Estimate; currency: string; formatLocale: string }
  | { kind: "error" };

export interface MoneyFormat {
  currency: string;
  /** The reader's language in the country's number formats (de-CH). */
  formatLocale: string;
}

/** A whole amount of money as the country writes it: CHF 13’050. */
export function formatMoney(amount: number, { currency, formatLocale }: MoneyFormat): string {
  return new Intl.NumberFormat(formatLocale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export const multiplierRowKey = (level: string, metric: string) => `${level}/${metric}`;

/** The comparison of these places, in this order. Only places go in the link: never an input. */
export function compareHref(slugPaths: readonly string[]): string {
  // Slashes are legal in a query (RFC 3986 §3.4); left unescaped, a shared link stays readable.
  const query = slugPaths
    .map((path) => `p=${encodeURIComponent(path).replaceAll("%2F", "/")}`)
    .join("&");
  return query ? `/compare?${query}` : "/compare";
}

export function estimateColumn(
  column: Pick<CompareColumn, "facts" | "levels"> & Partial<Pick<CompareColumn, "refinedBy">>,
  pack: CompareTaxPack | undefined,
  input: EstimateInput,
): ColumnEstimate {
  if (!pack) {
    return { kind: "no_model" };
  }
  if (input.base === null) {
    return { kind: "no_input" };
  }
  const variant = pack.model.variants.includes(input.variant)
    ? input.variant
    : pack.model.variants[0]!;
  let estimate: Estimate;
  try {
    estimate = evaluate(pack.model, column.facts, {
      values: {
        ...input.conditions,
        ...Object.fromEntries(
          Object.entries(input.amounts ?? {}).flatMap(([key, value]) =>
            value === null ? [] : [[key, value] as const],
          ),
        ),
        [pack.model.base]: input.base,
      },
      variant,
    });
  } catch {
    return { kind: "error" };
  }
  if (!estimate.complete) {
    const levels = [...new Set(estimate.missing.map((ref) => ref.level))];
    const refined = column.refinedBy ?? [];
    if (levels.every((level) => refined.some((r) => r.standsFor === level))) {
      return {
        kind: "needs_lower_place",
        levels: [...new Set(refined.map((r) => r.levelKey))],
      };
    }
    const below = levels.filter((level) => !column.levels.includes(level));
    return below.length > 0
      ? { kind: "needs_lower_place", levels: below }
      : { kind: "not_recorded", levels };
  }
  return {
    kind: "estimate",
    estimate: billed(estimate, pack.model, input.base),
    currency: estimate.currency ?? pack.currency,
    formatLocale: pack.formatLocale,
  };
}

/**
 * The estimate as a bill: each tax rounded to the whole unit, as the
 * authorities and the federal calculator state it, and the total their sum,
 * so the rows shown add up to the total shown.
 */
function billed(estimate: Estimate, model: TaxModel, base: number): Estimate {
  const components = estimate.components.map((c) =>
    c.amount === null ? c : { ...c, amount: Math.round(c.amount) },
  );
  const sum = (keep: (key: string) => boolean) =>
    components.reduce((total, c) => total + (keep(c.key) ? (c.amount ?? 0) : 0), 0);
  const onBase = new Set(
    model.components.filter((c) => (c.base ?? model.base) === model.base).map((c) => c.key),
  );
  return {
    ...estimate,
    components,
    total: sum(() => true),
    effectiveRate: base > 0 ? sum((key) => onBase.has(key)) / base : 0,
  };
}

/**
 * The lowest total per currency among complete estimates. Totals in different
 * currencies are never set against each other.
 */
export function lowestTotals(estimates: readonly ColumnEstimate[]): Map<string, number> {
  const lowest = new Map<string, number>();
  for (const e of estimates) {
    if (e.kind === "estimate") {
      const seen = lowest.get(e.currency);
      if (seen === undefined || e.estimate.total < seen) {
        lowest.set(e.currency, e.estimate.total);
      }
    }
  }
  return lowest;
}

/**
 * A typed whole amount: "85'000", "85 000" and "85,000" read alike, and cents
 * ("85000.50", "85000,50") are dropped rather than read as digits.
 */
export function parseAmount(text: string): number | null {
  const digits = text
    .trim()
    .replace(/[.,]\d{1,2}$/, "")
    .replace(/[^\d]/g, "");
  if (digits === "") {
    return null;
  }
  const value = Number(digits);
  return Number.isSafeInteger(value) ? value : null;
}

/** A pack's sentence with its `{name}` placeholders filled; an unknown one is left as written. */
export function fillTemplate(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) => values[name] ?? placeholder);
}

/** Whether a row that depends on these inputs shows: a base entered, one of `when` true. */
export function rowShows(
  row: { base?: string | null; when: readonly string[] | string | null },
  input: EstimateInput,
): boolean {
  const when = row.when === null ? [] : typeof row.when === "string" ? [row.when] : row.when;
  const entered = !row.base || (input.amounts?.[row.base] ?? null) !== null;
  return entered && (when.length === 0 || when.some((key) => input.conditions[key] === true));
}

/** Typed amounts as numbers, by input key; one not typed (or not a number) is null. */
export function parseAmounts(
  typed: Readonly<Record<string, string>> | undefined,
): Record<string, number | null> {
  return Object.fromEntries(Object.entries(typed ?? {}).map(([key, t]) => [key, parseAmount(t)]));
}

/**
 * Whether a tax's row says anything: some column of the pack has an amount
 * other than 0 for it, or nothing is estimated yet (the rows then show what
 * will be counted).
 */
export function componentRowShows(
  packKey: string,
  key: string,
  columns: readonly Pick<CompareColumn, "packKey">[],
  estimates: readonly ColumnEstimate[],
): boolean {
  if (estimates.every((e) => e.kind !== "estimate")) {
    return true;
  }
  return columns.some((column, i) => {
    const e = estimates[i];
    const amount =
      e?.kind === "estimate" && column.packKey === packKey
        ? e.estimate.components.find((c) => c.key === key)?.amount
        : null;
    return amount !== null && amount !== undefined && amount !== 0;
  });
}

/** Whether a multiplier's row says anything: required, or recorded in some column of the pack. */
export function multiplierRowShows(
  packKey: string,
  row: Pick<CompareTaxPack["multiplierRows"][number], "key" | "optional">,
  columns: readonly Pick<CompareColumn, "packKey" | "multipliers">[],
): boolean {
  return (
    !row.optional ||
    columns.some((c) => c.packKey === packKey && (c.multipliers[row.key] ?? null) !== null)
  );
}

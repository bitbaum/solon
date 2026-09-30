/**
 * What /compare shows (design §9.2), in the terms the browser needs. The
 * server hands each column the facts its chain holds; the estimate runs here,
 * on the reader's device, so their income never reaches Solon (§10). Nothing
 * in this file reads the database, and it must stay that way: the comparison
 * component imports it.
 */
import { evaluate, type Estimate, type Fact, type TaxModel } from "@/lib/tax-model";
import type { PlaceSource } from "./place-view";

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
  /** The model's yes-or-no inputs. */
  conditions: CompareInput[];
  variants: { key: string; label: string }[];
  components: { key: string; label: string }[];
  /** One row per multiplier the model reads: the metric and the level that publishes it, named. */
  multiplierRows: { key: string; levelKey: string; metric: string; level: string }[];
  levelNames: Record<string, string>;
  excludes: string;
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

/** The reader's inputs, kept on their device. */
export interface EstimateInput {
  base: number | null;
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
  column: CompareColumn,
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
      values: { ...input.conditions, [pack.model.base]: input.base },
      variant,
    });
  } catch {
    return { kind: "error" };
  }
  if (!estimate.complete) {
    const levels = [...new Set(estimate.missing.map((ref) => ref.level))];
    const below = levels.filter((level) => !column.levels.includes(level));
    return below.length > 0
      ? { kind: "needs_lower_place", levels: below }
      : { kind: "not_recorded", levels };
  }
  return {
    kind: "estimate",
    estimate,
    currency: estimate.currency ?? pack.currency,
    formatLocale: pack.formatLocale,
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

/**
 * One budget, whatever it was read from: a year of one holder's public money,
 * for one scope, on one basis, placed on the standard taxonomies. A budget
 * read from a statistics office's series (facts) and one read from a budget
 * law's own lines (a curated document) become the same shape here, so every
 * page and every analysis works on both.
 */
import type { LocalizedText } from "@/lib/config/places/schema";
import type { BudgetSide } from "./taxonomy";

export interface PlaceRef {
  scheme: string;
  value: string;
}

/** Whether the figures are what was decided before the year or what happened in it. */
export const BUDGET_BASES = ["executed", "enacted"] as const;
export type BudgetBasis = (typeof BUDGET_BASES)[number];

/** What a budget's numbers are: shares of the economy, or money in a currency. */
export type BudgetMeasure =
  | {
      kind: "share_of_gdp";
      /** The step the publisher rounds each figure to (Eurostat: 0.1 % of GDP, 0.001). */
      precision: number;
    }
  | {
      kind: "money";
      currency: string;
      /** The publisher's unit: 1000 for "thousand roubles". */
      unit: number;
    };

/** A line as its publisher printed it, kept beside the standard figures it was placed into. */
export interface PublisherLine {
  side: BudgetSide;
  /** The publisher's code (a budget classification code, a section number). */
  code: string;
  label: LocalizedText;
  amount: number;
  /** The standard category it is counted in; null when it fits none, said so on the page. */
  category: string | null;
  /** For revenue: raised by the holder itself, or received from another. */
  origin?: "own" | "received";
  /** Who gave it, for a line received. */
  from?: LocalizedText;
}

export interface BudgetSourceRef {
  /** "facts": series from a statistics office; "document": a budget law Solon read. */
  kind: "facts" | "document";
  /** The source key (facts) or document key. */
  key: string;
  publisher: string;
  url: string | null;
  /** The day the figures were read. */
  read: string | null;
}

export interface Budget {
  holder: PlaceRef;
  /** A key of src/lib/config/budgets/scopes.ts. */
  scope: string;
  year: number;
  basis: BudgetBasis;
  measure: BudgetMeasure;
  /** Figures by category code of the revenue taxonomy; a category absent is not known, never zero. */
  revenue: ReadonlyMap<string, number>;
  /** Figures by category code of the expenditure taxonomy. */
  expenditure: ReadonlyMap<string, number>;
  /** Revenue less expenditure, when the publisher states it. */
  balance: number | null;
  /** The publisher's own lines, for a budget read from a document. */
  lines: readonly PublisherLine[];
  sources: readonly BudgetSourceRef[];
}

export const sameHolder = (a: PlaceRef, b: PlaceRef) =>
  a.scheme === b.scheme && a.value === b.value;

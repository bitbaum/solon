/**
 * Which government a budget covers. A figure without its scope invites the
 * wrong comparison: a state budget is not the whole public sector, and
 * general government counts every level. Every budget names one.
 */
import type { LocalizedText } from "@/lib/config/places/schema";
import type { BudgetSide, Taxonomy } from "./taxonomy";

export interface BudgetScope {
  /** Short, stable, in metric keys: `budget.<key>.<side>.<code>`. */
  key: string;
  label: LocalizedText;
  /** The sentence shown beside every figure of this scope. */
  definition: LocalizedText;
}

/**
 * How a budget metric's figures are measured: a share of GDP (no suffix, the
 * key the statistics pages chart) or an amount in a currency's millions
 * (`.meur`: million euro).
 */
export const BUDGET_MEASURES = { share: "", meur: "meur" } as const;
export type BudgetMeasureKey = keyof typeof BUDGET_MEASURES;

const suffix = (measure: BudgetMeasureKey) =>
  BUDGET_MEASURES[measure] ? `.${BUDGET_MEASURES[measure]}` : "";

/** The metric that holds a category's figure: `budget.gg.expenditure.gf07` (share of GDP), `….gf07.meur` (million euro). */
export const budgetMetricKey = (
  scope: string,
  taxonomy: Taxonomy,
  code: string,
  measure: BudgetMeasureKey = "share",
) =>
  `budget.${scope}.${taxonomy.side}.${code === taxonomy.total ? "total" : code.toLowerCase()}${suffix(measure)}`;

/** The metric that holds a scope's balance (surplus or deficit). */
export const budgetBalanceKey = (scope: string, measure: BudgetMeasureKey = "share") =>
  `budget.${scope}.balance${suffix(measure)}`;

export interface ParsedBudgetKey {
  scope: string;
  /** null for the balance. */
  side: BudgetSide | null;
  /** The category's code in lower case, `total`, or null for the balance. */
  code: string | null;
  measure: BudgetMeasureKey;
}

/** What a budget metric key names, or null when it is not one. */
export function parseBudgetMetricKey(key: string): ParsedBudgetKey | null {
  const m =
    /^budget\.([a-z0-9_]+)\.(?:(revenue|expenditure)\.([a-z0-9_]+)|balance)(?:\.(meur))?$/.exec(
      key,
    );
  if (!m) return null;
  return {
    scope: m[1]!,
    side: (m[2] as BudgetSide | undefined) ?? null,
    code: m[3] ?? null,
    measure: m[4] ? "meur" : "share",
  };
}

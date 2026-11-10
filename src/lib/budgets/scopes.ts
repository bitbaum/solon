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

/** The metric that holds a category's figure for a scope: `budget.gg.expenditure.gf07`; the total is `total`. */
export const budgetMetricKey = (scope: string, taxonomy: Taxonomy, code: string) =>
  `budget.${scope}.${taxonomy.side}.${code === taxonomy.total ? "total" : code.toLowerCase()}`;

/** The metric that holds a scope's balance (surplus or deficit). */
export const budgetBalanceKey = (scope: string) => `budget.${scope}.balance`;

/** The side and code a budget metric key names, or null when it is not one. */
export function parseBudgetMetricKey(
  key: string,
): { scope: string; side: BudgetSide; code: string } | null {
  const m = /^budget\.([a-z0-9_]+)\.(revenue|expenditure)\.([a-z0-9_]+)$/.exec(key);
  return m ? { scope: m[1]!, side: m[2] as BudgetSide, code: m[3]! } : null;
}

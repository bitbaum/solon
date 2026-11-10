/**
 * The one budget a page shows when it has room for one: the newest that says
 * who paid for it (revenue lines marked own or received), else the one
 * `pickBudget` shows. Pure.
 */
import { BUDGET_TAXONOMIES } from "@/lib/config/budgets";
import { pickBudget, selfReliance, type SelfReliance } from "./analysis";
import type { Budget } from "./model";

export interface BudgetSummary {
  budget: Budget;
  reliance: SelfReliance | null;
  revenue: number | null;
}

export function summarize(budgets: readonly Budget[]): BudgetSummary | null {
  const newest = [...budgets].sort(
    (a, b) => b.year - a.year || Number(b.basis === "executed") - Number(a.basis === "executed"),
  );
  const withReliance = newest.find((b) => selfReliance(b, BUDGET_TAXONOMIES) !== null);
  const budget = withReliance ?? pickBudget(budgets, BUDGET_TAXONOMIES.expenditure.total);
  if (!budget) return null;
  return {
    budget,
    reliance: selfReliance(budget, BUDGET_TAXONOMIES),
    revenue: budget.revenue.get(BUDGET_TAXONOMIES.revenue.total) ?? null,
  };
}

/**
 * What a budget page and the budget index show, from the budgets of a holder
 * or of every holder. Pure: budgets in, the sections and rows the components
 * render out, so the pages hold no logic of their own.
 */
import { BUDGET_SCOPES, BUDGET_TAXONOMIES } from "@/lib/config/budgets";
import { regionName } from "@/lib/config/world";
import { localized } from "@/lib/places/place-view";
import { breakdown, history, pickBudget, selfReliance, type SelfReliance } from "./analysis";
import { formatBudgetValue, formatShare } from "./format";
import { regionOfHolder } from "./holders";
import { BUDGET_BASES, type Budget, type BudgetBasis } from "./model";
import type { BudgetScope } from "./scopes";
import { categoryLabel, categoryOf } from "./taxonomy";

export interface BudgetSection {
  scope: BudgetScope;
  basis: BudgetBasis;
  /** The year shown: the one asked for when this section has it, else `pickBudget`'s. */
  budget: Budget;
  /** Every year this section holds, newest first. */
  years: number[];
  reliance: SelfReliance | null;
  /** Revenue and spending totals over the years, when there are two or more. */
  history: {
    revenue: { year: number; value: number }[];
    spending: { year: number; value: number }[];
  };
}

const scopeOrder = (key: string) => {
  const i = BUDGET_SCOPES.findIndex((s) => s.key === key);
  return i < 0 ? BUDGET_SCOPES.length : i;
};

/** A holder's budgets as sections: one per scope and basis, in the scopes' order, outturn first. */
export function budgetSections(budgets: readonly Budget[], year?: number): BudgetSection[] {
  const groups = new Map<string, Budget[]>();
  for (const b of budgets) {
    const key = `${b.scope}:${b.basis}`;
    groups.set(key, [...(groups.get(key) ?? []), b]);
  }
  const sections: BudgetSection[] = [];
  for (const group of groups.values()) {
    const scope = BUDGET_SCOPES.find((s) => s.key === group[0]!.scope);
    if (!scope) continue;
    const budget = pickBudget(group, BUDGET_TAXONOMIES.expenditure.total, year)!;
    const revenue = history(group, "revenue", BUDGET_TAXONOMIES.revenue.total);
    const spending = history(group, "expenditure", BUDGET_TAXONOMIES.expenditure.total);
    sections.push({
      scope,
      basis: budget.basis,
      budget,
      years: [...new Set(group.map((b) => b.year))].sort((a, b) => b - a),
      reliance: selfReliance(budget, BUDGET_TAXONOMIES),
      history: {
        revenue: revenue.length > 1 ? revenue : [],
        spending: spending.length > 1 ? spending : [],
      },
    });
  }
  return sections.sort(
    (a, b) =>
      scopeOrder(a.scope.key) - scopeOrder(b.scope.key) ||
      BUDGET_BASES.indexOf(a.basis) - BUDGET_BASES.indexOf(b.basis),
  );
}

export interface BudgetIndexRow {
  slug: string;
  name: string;
  scope: string;
  year: number;
  spending: string | null;
  revenue: string | null;
  balance: string | null;
  /** The function with the largest share of spending, and that share. */
  largest: string | null;
}

/** One row per holder and scope: the budget `pickBudget` shows, every figure in the budget's own measure. */
export function budgetIndexRows(budgets: readonly Budget[], locale: string): BudgetIndexRow[] {
  const groups = new Map<string, Budget[]>();
  for (const b of budgets) {
    const key = `${b.holder.scheme}:${b.holder.value}:${b.scope}`;
    groups.set(key, [...(groups.get(key) ?? []), b]);
  }
  const rows: BudgetIndexRow[] = [];
  for (const group of groups.values()) {
    const b = pickBudget(group, BUDGET_TAXONOMIES.expenditure.total)!;
    const region = regionOfHolder(b.holder);
    if (!region) continue;
    const scope = BUDGET_SCOPES.find((s) => s.key === b.scope);
    const value = (v: number | undefined | null) =>
      v === undefined || v === null ? null : formatBudgetValue(v, b.measure, locale);
    const top = breakdown(b, BUDGET_TAXONOMIES.expenditure).rows[0];
    const category = top ? categoryOf(BUDGET_TAXONOMIES.expenditure, top.code) : undefined;
    rows.push({
      slug: region.slug,
      name: regionName(region, locale),
      scope: scope ? localized(scope.label, locale) : b.scope,
      year: b.year,
      spending: value(b.expenditure.get(BUDGET_TAXONOMIES.expenditure.total)),
      revenue: value(b.revenue.get(BUDGET_TAXONOMIES.revenue.total)),
      balance: value(b.balance),
      largest:
        category && top?.share != null
          ? `${localized(categoryLabel(category), locale)} · ${formatShare(top.share, locale, 0)}`
          : null,
    });
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name, locale));
}

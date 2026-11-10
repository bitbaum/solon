/**
 * What a budget's own figures say, by arithmetic alone. Pure: a budget in, a
 * reading out, the same for a budget read from a statistics office and one
 * read from a budget law. Nothing here forecasts: where a reading could be
 * mistaken for one (what spending without transfers would take), its name
 * and the page say so.
 */
import type { LocalizedText } from "@/lib/config/places/schema";
import type { Budget } from "./model";
import { childrenOf, type BudgetSide, type Taxonomy } from "./taxonomy";

export const figuresOf = (b: Budget, side: BudgetSide) =>
  side === "revenue" ? b.revenue : b.expenditure;

export interface BreakdownRow {
  code: string;
  value: number;
  /** Of the parent; null when the parent is not known or not above zero. */
  share: number | null;
}

export interface Breakdown {
  parent: string;
  value: number | null;
  /** The children the budget has a figure for, largest first. */
  rows: BreakdownRow[];
  /** What the children leave of the parent: unplaced lines, or parts the publisher does not break down. */
  rest: number;
  /** The publisher gives the parent but no breakdown of it (every child absent or zero). */
  noBreakdown: boolean;
}

/** Below this share of the parent, a remainder is rounding, not money unaccounted for. */
const ROUNDING = 0.005;

/**
 * How far the parts may miss the whole by rounding alone: each published figure
 * is off by up to half its precision, so n parts and their total by (n + 1) halves.
 */
const roundingSlack = (b: Budget, parts: number, whole: number) =>
  Math.max(
    Math.abs(whole) * ROUNDING,
    b.measure.kind === "share_of_gdp" ? (b.measure.precision * (parts + 1)) / 2 : 1,
  );

/** A category of a budget, one level down: each child with its share, and what is left over. */
export function breakdown(b: Budget, t: Taxonomy, parent: string = t.total): Breakdown {
  const figures = figuresOf(b, t.side);
  const value = figures.get(parent) ?? null;
  const rows = childrenOf(t, parent)
    .flatMap((c) => {
      const v = figures.get(c.code);
      return v === undefined ? [] : [{ code: c.code, value: v }];
    })
    .map((r) => ({ ...r, share: value !== null && value > 0 ? r.value / value : null }))
    .sort((x, y) => y.value - x.value);
  const counted = rows.reduce((n, r) => n + r.value, 0);
  const left = value === null ? 0 : value - counted;
  const rest = value !== null && Math.abs(left) > roundingSlack(b, rows.length, value) ? left : 0;
  return {
    parent,
    value,
    rows,
    rest,
    noBreakdown: value !== null && value > 0 && rows.every((r) => r.value === 0),
  };
}

export interface SelfReliance {
  own: number;
  received: number;
  byGiver: { from: LocalizedText; amount: number }[];
  /** Of all revenue, the share received from others. */
  receivedShare: number;
  /** Of what was spent, the share the holder's own revenue covered. */
  ownCoverage: number;
  /** How many times its own revenue would have to grow to cover the same spending alone. */
  ownMultipleNeeded: number | null;
  /** By what share spending would have to fall to be covered by its own revenue alone. */
  spendingCutNeeded: number;
}

/**
 * How much of a budget the holder raised itself, and what spending the same
 * without what it received would take: arithmetic on the budget's own lines,
 * not a forecast (an economy under other rules raises other sums). Null when
 * the budget does not say which revenue was received, or does not state its
 * totals.
 */
export function selfReliance(
  b: Budget,
  taxonomies: Record<BudgetSide, Taxonomy>,
): SelfReliance | null {
  const revenueLines = b.lines.filter((l) => l.side === "revenue" && l.origin);
  const revenue = b.revenue.get(taxonomies.revenue.total);
  const spent = b.expenditure.get(taxonomies.expenditure.total);
  if (revenueLines.length === 0 || revenue === undefined || spent === undefined || spent <= 0) {
    return null;
  }
  const own = revenueLines.filter((l) => l.origin === "own").reduce((n, l) => n + l.amount, 0);
  const givers = new Map<string, { from: LocalizedText; amount: number }>();
  for (const l of revenueLines) {
    if (l.origin !== "received" || !l.from) continue;
    const key = l.from.en ?? JSON.stringify(l.from);
    const entry = givers.get(key) ?? { from: l.from, amount: 0 };
    entry.amount += l.amount;
    givers.set(key, entry);
  }
  const received = revenue - own;
  return {
    own,
    received,
    byGiver: [...givers.values()].sort((x, y) => y.amount - x.amount),
    receivedShare: received / revenue,
    ownCoverage: own / spent,
    ownMultipleNeeded: own > 0 ? spent / own : null,
    spendingCutNeeded: Math.max(0, 1 - own / spent),
  };
}

/** One category over the years, oldest first; a year with no figure is left out, never zero. */
export function history(
  budgets: readonly Budget[],
  side: BudgetSide,
  code: string,
): { year: number; value: number }[] {
  return budgets
    .flatMap((b) => {
      const v = figuresOf(b, side).get(code);
      return v === undefined ? [] : [{ year: b.year, value: v }];
    })
    .sort((a, b) => a.year - b.year);
}

/** The latest budget that states a figure for a category; the newest year wins, an executed budget before an enacted one. */
export function latestWith(
  budgets: readonly Budget[],
  side: BudgetSide,
  code: string,
): Budget | undefined {
  return [...budgets]
    .filter((b) => figuresOf(b, side).has(code))
    .sort(
      (a, b) => b.year - a.year || Number(b.basis === "executed") - Number(a.basis === "executed"),
    )[0];
}

/**
 * The budget to show when none is asked for: the newest that says what was
 * spent (a statistics office publishes the totals a year before the breakdown
 * by function, and a page without spending answers less), an outturn before a
 * budget as enacted; the year asked for wins when there is one.
 */
export function pickBudget(
  budgets: readonly Budget[],
  spendingTotal: string,
  year?: number,
): Budget | undefined {
  const newest = [...budgets].sort(
    (a, b) => b.year - a.year || Number(b.basis === "executed") - Number(a.basis === "executed"),
  );
  return (
    newest.find((b) => b.year === year) ??
    newest.find((b) => b.expenditure.has(spendingTotal)) ??
    newest[0]
  );
}

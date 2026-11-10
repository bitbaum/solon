/**
 * Every budget Solon holds for a holder, from both places it keeps them: the
 * facts imported from statistics offices (`budget.<scope>.<side>.<code>`
 * metrics) and the budget documents in config. One function per question a
 * page asks; the shaping is pure and tested apart from the database.
 */
import { sql } from "drizzle-orm";
import { BUDGET_DOCUMENTS, BUDGET_TAXONOMIES } from "@/lib/config/budgets";
import type { Database } from "@/lib/db/client";
import { rowsOf } from "@/lib/db/rows";
import { budgetOfDocument, type Taxonomies } from "./documents";
import { sameHolder, type Budget, type PlaceRef } from "./model";
import { budgetBalanceKey, parseBudgetMetricKey } from "./scopes";

export interface BudgetFactRow {
  holder: PlaceRef;
  metric: string;
  year: number;
  value: number;
  sourceKey: string;
  url: string | null;
  retrievedAt: string;
}

/** Facts to budgets: one per holder, scope and year, every figure on its taxonomy's code. */
export function budgetsFromFacts(
  rows: readonly BudgetFactRow[],
  taxonomies: Taxonomies = BUDGET_TAXONOMIES,
): Budget[] {
  const byKey = new Map<
    string,
    Budget & { revenue: Map<string, number>; expenditure: Map<string, number> }
  >();
  for (const row of rows) {
    const parsed = parseBudgetMetricKey(row.metric);
    const balanceScope = /^budget\.([a-z0-9_]+)\.balance$/.exec(row.metric)?.[1];
    const scope = parsed?.scope ?? balanceScope;
    if (!scope) continue;
    const key = `${row.holder.scheme}:${row.holder.value}:${scope}:${row.year}`;
    let budget = byKey.get(key);
    if (!budget) {
      budget = {
        holder: row.holder,
        scope,
        year: row.year,
        basis: "executed",
        // Eurostat publishes shares of GDP to one decimal of a per cent.
        measure: { kind: "share_of_gdp", precision: 0.001 },
        revenue: new Map(),
        expenditure: new Map(),
        balance: null,
        lines: [],
        sources: [],
      };
      byKey.set(key, budget);
    }
    if (!budget.sources.some((s) => s.key === row.sourceKey)) {
      budget.sources = [
        ...budget.sources,
        {
          kind: "facts",
          key: row.sourceKey,
          publisher: row.sourceKey,
          url: row.url,
          read: row.retrievedAt,
        },
      ];
    }
    if (row.metric === budgetBalanceKey(scope)) {
      budget.balance = row.value;
      continue;
    }
    if (!parsed) continue;
    const taxonomy = taxonomies[parsed.side];
    const code =
      parsed.code === "total"
        ? taxonomy.total
        : taxonomy.categories.find((c) => c.code.toLowerCase() === parsed.code)?.code;
    if (code)
      (parsed.side === "revenue" ? budget.revenue : budget.expenditure).set(code, row.value);
  }
  return [...byKey.values()];
}

/** The budget facts of the places that carry these references (all such places when none is given). */
async function loadBudgetFacts(
  db: Database,
  holders?: readonly PlaceRef[],
): Promise<BudgetFactRow[]> {
  const filter =
    holders && holders.length > 0
      ? sql`AND (${sql.join(
          holders.map((h) => sql`(i.scheme = ${h.scheme} AND i.value = ${h.value})`),
          sql` OR `,
        )})`
      : sql``;
  const result = await db.execute(sql`
    SELECT i.scheme, i.value AS ref, f.metric_key, f.valid_from::text AS valid_from,
           f.value_numeric::text AS value, s.source_key, s.url, s.retrieved_at
    FROM facts f
    JOIN sources s ON s.id = f.source_id
    JOIN jurisdiction_identifiers i ON i.jurisdiction_id = f.jurisdiction_id
      AND i.superseded_at IS NULL AND i.scheme = 'iso_3166_1'
    WHERE f.metric_key LIKE 'budget.%' AND f.superseded_at IS NULL
      AND f.value_numeric IS NOT NULL AND f.variant IS NULL ${filter}
    ORDER BY f.valid_from`);
  return rowsOf<Record<string, string | Date | null>>(result).map((r) => ({
    holder: { scheme: String(r.scheme), value: String(r.ref) },
    metric: String(r.metric_key),
    year: Number(String(r.valid_from).slice(0, 4)),
    value: Number(r.value),
    sourceKey: String(r.source_key),
    url: r.url ? String(r.url) : null,
    retrievedAt: new Date(r.retrieved_at as string | Date).toISOString().slice(0, 10),
  }));
}

/** The budgets read from budget laws, as budgets. */
export const documentBudgets = (): Budget[] =>
  BUDGET_DOCUMENTS.map((d) => budgetOfDocument(d, BUDGET_TAXONOMIES));

/** Every budget of one holder, newest first. */
export async function loadBudgetsOf(db: Database, holder: PlaceRef): Promise<Budget[]> {
  const facts = holder.scheme === "iso_3166_1" ? await loadBudgetFacts(db, [holder]) : [];
  return [
    ...budgetsFromFacts(facts),
    ...documentBudgets().filter((b) => sameHolder(b.holder, holder)),
  ].sort((a, b) => b.year - a.year);
}

/** Every budget of every holder, for the index. */
export async function loadAllBudgets(db: Database): Promise<Budget[]> {
  return [...budgetsFromFacts(await loadBudgetFacts(db)), ...documentBudgets()];
}

/** Whether Solon holds any budget for this holder: a document, or a budget fact. */
export async function holdsBudget(db: Database, holder: PlaceRef): Promise<boolean> {
  if (BUDGET_DOCUMENTS.some((d) => sameHolder(d.holder, holder))) return true;
  if (holder.scheme !== "iso_3166_1") return false;
  const result = await db.execute(sql`
    SELECT 1 FROM facts f
    JOIN jurisdiction_identifiers i ON i.jurisdiction_id = f.jurisdiction_id
      AND i.superseded_at IS NULL AND i.scheme = ${holder.scheme} AND i.value = ${holder.value}
    WHERE f.metric_key LIKE 'budget.%' AND f.superseded_at IS NULL
    LIMIT 1`);
  return rowsOf(result).length > 0;
}

/**
 * Every budget Solon holds for a holder, from both places it keeps them: the
 * facts imported from statistics offices (`budget.<scope>.<side>.<code>`
 * metrics) and the budget documents in config. One function per question a
 * page asks; the shaping is pure and tested apart from the database.
 */
import { sql } from "drizzle-orm";
import { BUDGET_DOCUMENTS, BUDGET_TAXONOMIES } from "@/lib/config/budgets";
import { placesConfig } from "@/lib/config/places";
import { findSource } from "@/lib/config/places/schema";
import type { Database } from "@/lib/db/client";
import { rowsOf } from "@/lib/db/rows";
import { budgetOfDocument, type Taxonomies } from "./documents";
import { sameHolder, type Budget, type BudgetSourceRef, type PlaceRef } from "./model";
import { parseBudgetMetricKey, type BudgetMeasureKey } from "./scopes";

export interface BudgetFactRow {
  holder: PlaceRef;
  metric: string;
  year: number;
  value: number;
  sourceKey: string;
  url: string | null;
  retrievedAt: string;
}

interface Gathered {
  holder: PlaceRef;
  scope: string;
  year: number;
  figures: Record<
    BudgetMeasureKey,
    { revenue: Map<string, number>; expenditure: Map<string, number>; balance: number | null }
  >;
  sources: BudgetSourceRef[];
}

/**
 * Facts to budgets: one per holder, scope and year, every figure on its
 * taxonomy's code. Where the amounts are held (million euro) the budget is in
 * money and knows its GDP (an amount over the same figure's share of GDP), so
 * shares of GDP can still be shown; where only shares are held it is in shares.
 */
export function budgetsFromFacts(
  rows: readonly BudgetFactRow[],
  taxonomies: Taxonomies = BUDGET_TAXONOMIES,
  /** The registered source a stored key names: a key it had before resolves to it. */
  sourceOf: (key: string) => string = (key) => findSource(placesConfig, key)?.key ?? key,
): Budget[] {
  const byKey = new Map<string, Gathered>();
  const empty = () => ({
    revenue: new Map<string, number>(),
    expenditure: new Map<string, number>(),
    balance: null,
  });
  for (const row of rows) {
    const parsed = parseBudgetMetricKey(row.metric);
    if (!parsed) continue;
    const key = `${row.holder.scheme}:${row.holder.value}:${parsed.scope}:${row.year}`;
    let gathered = byKey.get(key);
    if (!gathered) {
      gathered = {
        holder: row.holder,
        scope: parsed.scope,
        year: row.year,
        figures: { share: empty(), meur: empty() },
        sources: [],
      };
      byKey.set(key, gathered);
    }
    // One line a source, however many keys its figures were read under: an unchanged figure
    // keeps the key it was first read under, a revised one is recorded under the current key.
    const sourceKey = sourceOf(row.sourceKey);
    const known = gathered.sources.find((s) => s.key === sourceKey);
    if (!known) {
      gathered.sources.push({
        kind: "facts",
        key: sourceKey,
        publisher: sourceKey,
        url: row.url,
        read: row.retrievedAt,
      });
    } else if (known.kind === "facts" && row.retrievedAt > (known.read ?? "")) {
      known.url = row.url;
      known.read = row.retrievedAt;
    }
    const figures = gathered.figures[parsed.measure];
    if (parsed.side === null) {
      figures.balance = row.value;
      continue;
    }
    const taxonomy = taxonomies[parsed.side];
    const code =
      parsed.code === "total"
        ? taxonomy.total
        : taxonomy.categories.find((c) => c.code.toLowerCase() === parsed.code)?.code;
    if (code) figures[parsed.side].set(code, row.value);
  }
  return [...byKey.values()].map((g) => {
    const money = g.figures.meur;
    const share = g.figures.share;
    const inMoney = money.expenditure.size > 0 || money.revenue.size > 0;
    const figures = inMoney ? money : share;
    // GDP from a total held both ways: the amount over its share.
    const pairs: [number | undefined, number | undefined][] = [
      [
        money.expenditure.get(taxonomies.expenditure.total),
        share.expenditure.get(taxonomies.expenditure.total),
      ],
      [money.revenue.get(taxonomies.revenue.total), share.revenue.get(taxonomies.revenue.total)],
    ];
    const pair = pairs.find(([m, s]) => m !== undefined && s !== undefined && s > 0);
    return {
      holder: g.holder,
      scope: g.scope,
      year: g.year,
      basis: "executed",
      measure: inMoney
        ? { kind: "money", currency: "EUR", unit: 1_000_000 }
        : // Eurostat publishes shares of GDP to one decimal of a per cent.
          { kind: "share_of_gdp", precision: 0.001 },
      revenue: figures.revenue,
      expenditure: figures.expenditure,
      balance: figures.balance,
      gdp: inMoney && pair ? pair[0]! / pair[1]! : null,
      lines: [],
      sources: g.sources,
    };
  });
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

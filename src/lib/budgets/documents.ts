/**
 * A budget read from the holder's own budget law: the publisher's lines as
 * printed, each placed on the standard taxonomy (or said to fit none), the
 * totals the law states, and the pages it was read from. The lines must add
 * up to the stated totals, so a line missed or misread fails here, not on a
 * reader's screen.
 */
import { z } from "zod";
import { localizedTextSchema } from "@/lib/config/places/schema";
import { actRefSchema, evidenceSchema, wordingSchema } from "@/lib/statistics/records";
import { BUDGET_BASES, type Budget } from "./model";
import { BUDGET_SIDES, type BudgetSide, type Taxonomy } from "./taxonomy";

const placeRef = z.object({ scheme: z.string().min(1), value: z.string().min(1) });

export const budgetDocumentSchema = z.object({
  key: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  holder: placeRef,
  scope: z.string().min(1),
  year: z.number().int().min(1900),
  basis: z.enum(BUDGET_BASES),
  currency: z.string().regex(/^[A-Z]{3}$/),
  /** The law's unit: 1000 for "тыс. рублей". */
  unit: z.number().positive(),
  /** The language the publisher wrote the act and its lines in. */
  lang: z.string().min(2),
  /** The act as its publisher titles it, and Solon's English for it. */
  title: z.string().min(1),
  titleTranslation: localizedTextSchema,
  /** The act in Solon's law register, when it holds it. */
  act: actRefSchema.nullable(),
  /** The law's own words that state the totals. */
  quote: wordingSchema.optional(),
  /** The totals the law states, per side; a side the document does not cover is absent. */
  totals: z.object({
    revenue: z.number().positive().optional(),
    expenditure: z.number().positive().optional(),
    balance: z.number().optional(),
  }),
  lines: z.array(
    z.object({
      side: z.enum(BUDGET_SIDES),
      code: z.string().min(1),
      label: localizedTextSchema,
      amount: z.number(),
      category: z.string().min(1).nullable(),
      origin: z.enum(["own", "received"]).optional(),
      from: localizedTextSchema.optional(),
    }),
  ),
  /** How the lines were placed on the standard taxonomies, and by whom: a reading, not the publisher's. */
  placement: localizedTextSchema,
  evidence: z.array(evidenceSchema).min(1),
});
export type BudgetDocument = z.infer<typeof budgetDocumentSchema>;
export type BudgetDocumentInput = z.input<typeof budgetDocumentSchema>;

export type Taxonomies = Readonly<Record<BudgetSide, Taxonomy>>;

/** Problems with a document against the taxonomies; empty when it is sound. */
export function documentProblems(doc: BudgetDocument, taxonomies: Taxonomies): string[] {
  const problems: string[] = [];
  const at = `budget "${doc.key}"`;
  for (const side of BUDGET_SIDES) {
    const lines = doc.lines.filter((l) => l.side === side);
    const total = doc.totals[side];
    if (lines.length > 0 && total === undefined) {
      problems.push(`${at}: ${side} lines but no ${side} total`);
    }
    const counted = lines.reduce((n, l) => n + l.amount, 0);
    // The law rounds its totals; the lines must reach them within one of its units.
    if (lines.length > 0 && total !== undefined && Math.abs(counted - total) > 1) {
      problems.push(`${at}: ${side} lines add up to ${counted}, not the stated ${total}`);
    }
    const known = new Set(taxonomies[side].categories.map((c) => c.code));
    for (const l of lines) {
      if (l.category !== null && !known.has(l.category)) {
        problems.push(`${at}: line ${l.code} is placed in ${l.category}, not a ${side} category`);
      }
      if (side === "expenditure" && (l.origin || l.from)) {
        problems.push(`${at}: line ${l.code} is spending, so it has no origin`);
      }
      if (l.origin === "received" && !l.from) {
        problems.push(`${at}: line ${l.code} is received from no one`);
      }
    }
  }
  const codes = doc.lines.map((l) => `${l.side}:${l.code}`);
  if (new Set(codes).size !== codes.length) problems.push(`${at}: a line is listed twice`);
  return problems;
}

/** Each category's amount: every placed line counted in its category and every ancestor, the total as stated. */
function placed(
  doc: BudgetDocument,
  side: BudgetSide,
  taxonomy: Taxonomy,
): ReadonlyMap<string, number> {
  const out = new Map<string, number>();
  const parentOf = new Map(taxonomy.categories.map((c) => [c.code, c.parent]));
  for (const line of doc.lines) {
    if (line.side !== side || line.category === null) continue;
    for (let code: string | null = line.category; code; code = parentOf.get(code) ?? null) {
      out.set(code, (out.get(code) ?? 0) + line.amount);
    }
  }
  const total = doc.totals[side];
  if (total !== undefined) out.set(taxonomy.total, total);
  return out;
}

/** The document as a budget, on the standard taxonomies. */
export function budgetOfDocument(doc: BudgetDocument, taxonomies: Taxonomies): Budget {
  return {
    holder: doc.holder,
    scope: doc.scope,
    year: doc.year,
    basis: doc.basis,
    measure: { kind: "money", currency: doc.currency, unit: doc.unit },
    revenue: placed(doc, "revenue", taxonomies.revenue),
    expenditure: placed(doc, "expenditure", taxonomies.expenditure),
    balance: doc.totals.balance ?? null,
    gdp: null,
    lines: doc.lines,
    sources: [
      {
        kind: "document",
        key: doc.key,
        publisher: doc.evidence[0]!.publisher,
        url: doc.evidence[0]!.url,
        read: doc.evidence[0]!.read,
      },
    ],
  };
}

export function defineBudgetDocuments(
  taxonomies: Taxonomies,
  input: readonly BudgetDocumentInput[],
): BudgetDocument[] {
  const docs = input.map((d) => budgetDocumentSchema.parse(d));
  const problems = docs.flatMap((d) => documentProblems(d, taxonomies));
  const keys = docs.map((d) => d.key);
  if (new Set(keys).size !== keys.length) problems.push("a budget document key is used twice");
  if (problems.length > 0) throw new Error(`budget documents:\n- ${problems.join("\n- ")}`);
  return docs;
}

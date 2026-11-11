/**
 * A classification budgets are placed on: what money is spent on (COFOG) or
 * where it comes from (ESA 2010 revenue). A tree of codes under one total,
 * so a budget read from any publisher can be compared with any other, and a
 * drill-down can always say what is left over at each level.
 */
import { z } from "zod";
import { localizedTextSchema, type LocalizedText } from "@/lib/config/places/schema";

export const BUDGET_SIDES = ["revenue", "expenditure"] as const;
export type BudgetSide = (typeof BUDGET_SIDES)[number];

const code = z.string().regex(/^[A-Z][A-Z0-9_]*$/, "a publisher's code, upper case");

const taxonomySchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_]*$/),
  side: z.enum(BUDGET_SIDES),
  /** The code of the whole: every other category descends from it. */
  total: code,
  categories: z
    .array(
      z.object({
        code,
        parent: code.nullable(),
        label: localizedTextSchema,
        /** A plain word for the category, when the publisher's own label is technical. */
        plain: localizedTextSchema.optional(),
      }),
    )
    .min(2),
});

export interface BudgetCategory {
  code: string;
  parent: string | null;
  label: LocalizedText;
  plain?: LocalizedText;
  /** 0 for the total, 1 for its divisions, 2 for their groups. */
  depth: number;
}

export interface Taxonomy {
  key: string;
  side: BudgetSide;
  total: string;
  categories: readonly BudgetCategory[];
}

/** A classification, checked: one total, every parent known, no code twice, no cycle. */
export function defineTaxonomy(input: z.input<typeof taxonomySchema>): Taxonomy {
  const t = taxonomySchema.parse(input);
  const byCode = new Map(t.categories.map((c) => [c.code, c]));
  if (byCode.size !== t.categories.length) throw new Error(`${t.key}: a code is listed twice`);
  const total = byCode.get(t.total);
  if (!total || total.parent !== null) throw new Error(`${t.key}: the total must be a root`);
  const depthOf = (c: (typeof t.categories)[number], seen: Set<string>): number => {
    if (c.parent === null) {
      if (c.code !== t.total) throw new Error(`${t.key}: ${c.code} is a second root`);
      return 0;
    }
    if (seen.has(c.code)) throw new Error(`${t.key}: ${c.code} is its own ancestor`);
    const parent = byCode.get(c.parent);
    if (!parent) throw new Error(`${t.key}: ${c.code} names an unknown parent ${c.parent}`);
    return depthOf(parent, new Set([...seen, c.code])) + 1;
  };
  return {
    key: t.key,
    side: t.side,
    total: t.total,
    categories: t.categories.map((c) => ({ ...c, depth: depthOf(c, new Set()) })),
  };
}

/** The categories directly under a code, in the taxonomy's order. */
export const childrenOf = (t: Taxonomy, parent: string) =>
  t.categories.filter((c) => c.parent === parent);

export const categoryOf = (t: Taxonomy, code: string) => t.categories.find((c) => c.code === code);

/** A category's words: its plain name where it has one, else the publisher's. */
export const categoryLabel = (c: BudgetCategory): LocalizedText => c.plain ?? c.label;

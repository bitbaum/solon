/**
 * How far the plan has got (./schema.ts), counted from what the database holds,
 * and the next step for each country, derived, never written by hand. Pure:
 * the plan and the counts in, one row per country out.
 */
import type { CountryPlan, LawPlan } from "./schema";

export interface AuthorityCounts {
  /** Constitution acts listed, and of them with a text held. */
  constitution: { listed: number; withText: number };
  /** National acts other than the constitution, listed and with text. */
  national: { listed: number; withText: number };
}

export type Stage = "none" | "listed" | "text";

export interface CountryStatus {
  iso: string;
  authority: string;
  constitution: Stage;
  national: Stage;
  nationalActs: number;
  nationalWithText: number;
  /** What to do next for this country, in one line. */
  next: string;
}

const stageOf = (c: { listed: number; withText: number }): Stage =>
  c.withText > 0 ? "text" : c.listed > 0 ? "listed" : "none";

function nextStep(plan: CountryPlan, constitution: Stage, national: Stage): string {
  if (constitution !== "text") {
    if (plan.constitution.chosen) {
      return `load the constitution from ${plan.constitution.chosen.url}`;
    }
    const n = plan.constitution.candidates.length;
    return n > 0
      ? `choose the constitution's source among ${n} candidate${n === 1 ? "" : "s"}`
      : "find a copy of the constitution in force";
  }
  if (national === "none") {
    if (plan.national.register) return `run the ${plan.national.register} register`;
    const where = plan.national.candidates[0];
    return where
      ? `build the national register from ${where.url}`
      : "find where the national laws are listed";
  }
  if (national === "listed") {
    if (plan.national.texts) return `load the national texts with ${plan.national.texts}`;
    const where = plan.national.candidates[0];
    return where
      ? `build the national texts' reader from ${where.url}`
      : "find where the national laws' texts can be read";
  }
  return "keep current";
}

export function planStatus(
  plan: LawPlan,
  counts: ReadonlyMap<string, AuthorityCounts>,
): CountryStatus[] {
  return Object.entries(plan.countries).map(([iso, p]) => {
    const c = counts.get(p.authority) ?? {
      constitution: { listed: 0, withText: 0 },
      national: { listed: 0, withText: 0 },
    };
    const constitution = stageOf(c.constitution);
    const national = stageOf(c.national);
    return {
      iso,
      authority: p.authority,
      constitution,
      national,
      nationalActs: c.national.listed,
      nationalWithText: c.national.withText,
      next: nextStep(p, constitution, national),
    };
  });
}

/** How many countries stand at each stage, per layer. */
export function planTotals(rows: readonly CountryStatus[]) {
  const tally = (layer: "constitution" | "national") => ({
    text: rows.filter((r) => r[layer] === "text").length,
    listed: rows.filter((r) => r[layer] === "listed").length,
    none: rows.filter((r) => r[layer] === "none").length,
  });
  return {
    countries: rows.length,
    constitution: tally("constitution"),
    national: tally("national"),
  };
}

/**
 * Yearly figures published as CSV, one row per place and fiscal year, with a
 * column per figure (a canton's table of municipal tax multipliers). Format
 * only: which column holds the place, the year and each figure, which scheme
 * the place's code belongs to and which metric each figure is, are the
 * source's `options`.
 */
import { z } from "zod";
import type { BatchFactInput } from "../importer/batch";
import { decodeCsv } from "./csv";
import type { Adapter } from "./types";

const rows = z.array(z.record(z.string(), z.string())).min(1);
type Rows = z.infer<typeof rows>;

const column = z.string().min(1);
const csvFactsOptions = z.object({
  /** Where to fetch the table; absent when it is handed in as a file. */
  url: z.url().optional(),
  place: z.object({ scheme: z.string().min(1), column }),
  /** The column holding the fiscal year (the one starting in that calendar year). */
  yearColumn: column,
  /** Rows of earlier years are not read: their places may predate what is known. */
  fromYear: z.number().int().optional(),
  facts: z
    .array(
      z.object({
        metric: z.string().min(1),
        column,
        variant: z.string().min(1).nullable().default(null),
        /** A column in percent has 100 here. */
        divideBy: z.number().positive().default(1),
      }),
    )
    .min(1),
  /**
   * For a source that states one figure a year, decided in the autumn for the year after (a commune's tax
   * surcharge): the latest year's figure for a place stays in force, with no end date, until the source
   * states the next year's. Without it the latest figure ends on the last day of its year and, between New
   * Year and the next decision, the place has no figure at all.
   */
  inForceUntilNext: z.boolean().default(false),
  /** Rows whose `column` holds anything but `equals` are left out, and reported with `reason`. */
  skipUnless: z
    .array(z.object({ column, equals: z.string(), reason: z.string().min(1) }))
    .default([]),
});
type CsvFactsOptions = z.infer<typeof csvFactsOptions>;

/** The fiscal year starting in `year` on `startMonthDay`, half-open: it ends where the next begins. */
export const fiscalYearPeriod = (year: number, startMonthDay: string) => ({
  validFrom: `${year}-${startMonthDay}`,
  validTo: `${year + 1}-${startMonthDay}`,
});

export const csvFactsAdapter: Adapter<Rows, CsvFactsOptions> = {
  key: "csv_facts",
  version: "3",
  decode: decodeCsv,
  schema: rows,
  options: csvFactsOptions,
  retrievals: (options) => (options.url ? [{ url: options.url }] : []),
  map: (table, { pack, options, skip }) => {
    if (!pack) {
      throw new Error("figures belong to a pack's places; the source names none");
    }
    const facts: BatchFactInput[] = [];
    for (const [i, row] of table.entries()) {
      const where = `row ${i + 2}`;
      const year = Number(row[options.yearColumn]);
      const code = row[options.place.column];
      if (!Number.isInteger(year) || !code) {
        throw new Error(
          `${where}: no year in ${options.yearColumn} or no code in ${options.place.column}`,
        );
      }
      if (options.fromYear !== undefined && year < options.fromYear) {
        continue;
      }
      const label = `${options.place.scheme}:${code} ${year}`;
      const rule = options.skipUnless.find((r) => row[r.column] !== r.equals);
      if (rule) {
        skip(label, `${rule.reason} (${rule.column} = ${row[rule.column]})`);
        continue;
      }
      const period = fiscalYearPeriod(year, pack.fiscalYear.startMonthDay);
      for (const fact of options.facts) {
        const raw = row[fact.column];
        const value = Number(raw);
        if (raw === undefined || raw.trim() === "" || !Number.isFinite(value)) {
          throw new Error(`${where}: ${fact.column} is not a number ("${raw ?? ""}")`);
        }
        facts.push({
          jurisdiction: { scheme: options.place.scheme, value: code },
          metricKey: fact.metric,
          variant: fact.variant,
          ...period,
          value: value / fact.divideBy,
        });
      }
    }
    if (options.inForceUntilNext) {
      // The latest year of each place's figure, per metric and variant, has no end.
      const latest = new Map<string, BatchFactInput>();
      for (const fact of facts) {
        const key = JSON.stringify([fact.jurisdiction, fact.metricKey, fact.variant]);
        const held = latest.get(key);
        if (!held || fact.validFrom > held.validFrom) latest.set(key, fact);
      }
      for (const fact of latest.values()) fact.validTo = null;
    }
    return { pack: pack.key, jurisdictions: [], relations: [], facts };
  },
};

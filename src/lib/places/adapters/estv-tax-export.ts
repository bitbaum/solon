/**
 * The Swiss Federal Tax Administration's tax-calculator exports: tariffs
 * ("tax scales") and multipliers ("simple rates"), one POST per tax year for
 * a group of places. The response does not name its year, so these sources
 * are fetched as envelopes (`importer/envelope.ts`) and the year is read from
 * the request.
 *
 * The export answers for years it has not published with figures of some
 * other year, so planning first asks the calculator's year range and never
 * requests a year beyond it.
 *
 * Format only: which places, targets, groups and fields become which facts are
 * the source's `options`.
 */
import { z } from "zod";
import { tariffProblem, type Tariff } from "@/lib/tax-model";
import type { BatchFact, ExternalRef, tariffSchema } from "../importer/batch";
import { decodeJsonEnvelope } from "../importer/envelope";
import { fiscalYearPeriod } from "./csv-facts";
import { parseFormula } from "./formula";
import type { Adapter, Probe, RetrievalRequest } from "./types";

const ref = z.object({ scheme: z.string().min(1), value: z.string().min(1) });

const exportOptions = z.object({
  url: z.url(),
  /** The calculator's year-range operation, and which calculator to ask about. */
  yearRange: z.object({ url: z.url(), calculator: z.number().int() }),
  /** The export's group of places (the cantons' main places, one canton's communes). */
  taxGroup: z.number().int(),
  /** The first year a backfill loads. */
  fromYear: z.number().int(),
});
type ExportOptions = z.infer<typeof exportOptions>;

const yearRangeResponse = z.object({
  response: z.object({ MinYear: z.number().int(), MaxYear: z.number().int() }),
});

function exportRequest(options: ExportOptions, year: number): RetrievalRequest {
  return { url: options.url, body: { SimKey: null, TaxYear: year, TaxGroupID: options.taxGroup } };
}

/** The latest year both published and begun by `today`. */
async function latestYear(options: ExportOptions, today: string, probe: Probe): Promise<number> {
  const range = yearRangeResponse.parse(
    await probe({ url: options.yearRange.url, body: { Calculator: options.yearRange.calculator } }),
  ).response;
  if (range.MaxYear === 0) {
    throw new Error(`calculator ${options.yearRange.calculator} reports no published year`);
  }
  return Math.min(range.MaxYear, Number(today.slice(0, 4)));
}

const planning = {
  retrievals: async (options: ExportOptions, today: string, probe: Probe) => [
    exportRequest(options, await latestYear(options, today, probe)),
  ],
  backfill: async (options: ExportOptions, today: string, probe: Probe) => {
    const latest = await latestYear(options, today, probe);
    const years: RetrievalRequest[] = [];
    for (let year = options.fromYear; year < latest; year++) {
      years.push(exportRequest(options, year));
    }
    return years;
  },
};

const location = z.object({ Canton: z.string(), BfsID: z.number().int() });

/** The export as decoded from its envelope, with the year its request asked for. */
function enveloped<Row extends z.ZodType>(row: Row) {
  return z.object({
    request: z.object({ body: z.object({ TaxYear: z.number().int() }) }),
    response: z.object({ response: z.array(row) }),
  });
}

const placeOf = (
  target: { place?: ExternalRef; cantons?: Record<string, ExternalRef> },
  canton: string,
): ExternalRef | undefined => target.place ?? target.cantons?.[canton];

const oneWayToPlace = (t: { place?: unknown; cantons?: unknown }) =>
  (t.place === undefined) !== (t.cantons === undefined);
const placeChoice = {
  /** One place for every row (a federal tariff the export repeats per canton). */
  place: ref.optional(),
  /** Or a place per canton, by the export's canton code; cantons not listed are not read. */
  cantons: z.record(z.string(), ref).optional(),
};

// --- Tariffs ------------------------------------------------------------------

const scaleRow = z.object({
  Location: location,
  Target: z.string(),
  TaxType: z.string(),
  TableType: z.string(),
  Splitting: z.number(),
  Group: z.string(),
  Table: z
    .array(
      z.object({
        Amount: z.number(),
        Percent: z.number(),
        Taxes: z.number(),
        Formula: z.string().default(""),
      }),
    )
    .min(1),
});
const scales = enveloped(scaleRow);
type Scales = z.infer<typeof scales>;
type ScaleRow = z.infer<typeof scaleRow>;

/** How the calculator rounds the income before a tariff applies: see the tax model's `Rounding`. */
const rounding = z.object({
  base: z.number().positive(),
  divided: z.number().positive().optional(),
});

const scalesOptions = exportOptions.extend({
  taxType: z.string().min(1),
  targets: z
    .array(
      z
        .object({
          target: z.string().min(1),
          metric: z.string().min(1),
          ...placeChoice,
          /**
           * Where this target's rows say how far a couple's income is divided
           * before the tariff applies (their `Splitting`), the metric that
           * records it per variant: the divisor, 1 where nothing is divided.
           * Without it, a row that divides is not read.
           */
          divisor: z.object({ metric: z.string().min(1) }).optional(),
          /**
           * How the calculator rounds the income for this target's tariffs
           * (measured: the export does not say), and per canton code where
           * cantons differ; neither means no rounding.
           */
          rounding: rounding.optional(),
          cantonRounding: z.record(z.string(), rounding).default({}),
          /** A tariff amount below this is not levied (the federal tax's CHF 25). */
          minimum: z.number().min(0).optional(),
          /**
           * This target's tariff is also `metric`'s for a place with no row of
           * target `unless` (a canton's basic tariff is its communes' tariff,
           * unless the canton gives them one of their own).
           */
          alsoAs: z.object({ metric: z.string().min(1), unless: z.string().min(1) }).optional(),
        })
        .refine(oneWayToPlace, "give either place or cantons"),
    )
    .min(1),
  /**
   * The group token that marks a row as this variant's; a row may carry several.
   * `divided`: the calculator divides this variant's income by a row's `Splitting`.
   * `fallbackGroup`: read where a place has no row for `group` (nor one for
   * every variant) for a target.
   */
  variants: z
    .array(
      z.object({
        variant: z.string().min(1),
        group: z.string().min(1),
        divided: z.boolean().default(false),
        fallbackGroup: z.string().min(1).optional(),
      }),
    )
    .min(1),
  /** The group that applies to every variant. */
  everyVariantGroup: z.string().min(1),
  /**
   * How each table type reads: `stepped` (Amount is where a step starts, Taxes
   * the tax there, Percent the rate on the excess), `widths` (Amount is how far
   * a marginal rate reaches), `average` (Percent is the average rate at
   * Amount), `flat` (one Percent on the whole amount) or `formula` (from
   * Amount on, the row's Formula of the amount).
   */
  tableTypes: z.record(z.string(), z.enum(["stepped", "widths", "average", "flat", "formula"])),
  /**
   * Table types whose couples get a table of their own: the export's
   * `Splitting` on them says how that table was derived, so it is not
   * applied again, and every variant's divisor is 1.
   */
  splittingBuiltIn: z.array(z.string().min(1)).default([]),
});
type ScalesOptions = z.infer<typeof scalesOptions>;

/** Percent to a rate, without binary noise (2.9699999999999998 → 0.0297). */
const rateOf = (percent: number): number => Math.round(percent * 1e6) / 1e8;

function tariffOf(
  row: ScaleRow,
  reading: ScalesOptions["tableTypes"][string],
  currency: string,
): z.infer<typeof tariffSchema> {
  switch (reading) {
    case "stepped":
      return {
        kind: "stepped",
        currency,
        steps: row.Table.map((s) => ({ from: s.Amount, base: s.Taxes, rate: rateOf(s.Percent) })),
      };
    case "average":
      return {
        kind: "average",
        currency,
        points: row.Table.map((s) => ({ from: s.Amount, rate: rateOf(s.Percent) })),
      };
    case "widths": {
      let from = 0;
      const brackets = row.Table.map((s) => {
        const bracket = { from, rate: rateOf(s.Percent) };
        from += s.Amount;
        return bracket;
      });
      return { kind: "progressive", currency, brackets };
    }
    case "flat": {
      const rates = new Set(row.Table.map((s) => s.Percent));
      if (rates.size !== 1) {
        throw new Error(`a flat table with ${rates.size} rates`);
      }
      return { kind: "flat", currency, rate: rateOf(row.Table[0]!.Percent) };
    }
    case "formula":
      return {
        kind: "logarithmic",
        currency,
        pieces: row.Table.map((s) => ({
          from: s.Amount,
          ...(s.Formula.trim() === ""
            ? { constant: 0, linear: 0, xLnX: 0 }
            : parseFormula(s.Formula)),
        })),
      };
  }
}

/** The divisor a row applies to the variants the calculator divides; 0 for none. */
const splitting = (row: ScaleRow, options: ScalesOptions): number =>
  options.splittingBuiltIn.includes(row.TableType) || row.Splitting === 1 ? 0 : row.Splitting;

const groupsOf = (row: ScaleRow) => row.Group.split(",");

/** The variants a row is read for, given every group a place's rows carry for its target. */
function variantsOf(row: ScaleRow, placeGroups: ReadonlySet<string>, options: ScalesOptions) {
  const groups = groupsOf(row);
  const covered = (group: string) =>
    placeGroups.has(group) || placeGroups.has(options.everyVariantGroup);
  return options.variants.filter(
    (v) =>
      row.Group === options.everyVariantGroup ||
      groups.includes(v.group) ||
      (v.fallbackGroup !== undefined && !covered(v.group) && groups.includes(v.fallbackGroup)),
  );
}

/**
 * Why a row cannot be read for a variant, or null. A row that divides a
 * couple's income is read only where its target records the divisor, and
 * only for variants the calculator divides, or from a table for every variant
 * (which then divides only the variants that are divided).
 */
function unreadable(
  row: ScaleRow,
  recordsDivisor: boolean,
  divided: boolean,
  options: ScalesOptions,
): string | null {
  if (splitting(row, options) === 0) {
    return null;
  }
  if (!recordsDivisor) {
    return `the tariff divides a couple's income (splitting ${row.Splitting}), and this target does not record a divisor`;
  }
  if (!divided && row.Group !== options.everyVariantGroup) {
    return `the tariff divides the income of a variant the calculator does not divide (splitting ${row.Splitting})`;
  }
  return null;
}

export const estvTaxScalesAdapter: Adapter<Scales, ScalesOptions> = {
  key: "estv_tax_scales",
  version: "6",
  decode: decodeJsonEnvelope,
  schema: scales,
  options: scalesOptions,
  ...planning,
  map: (exported, { pack, options, skip }) => {
    if (!pack) {
      throw new Error("tariffs belong to a pack's places; the source names none");
    }
    const year = exported.request.body.TaxYear;
    const period = fiscalYearPeriod(year, pack.fiscalYear.startMonthDay);
    const facts = new Map<string, BatchFact>();
    /** Rows not read, by fact; reported only when no other row gives that fact. */
    const unread = new Map<string, { label: string; reason: string }>();
    const rows = exported.response.response.filter((row) => row.TaxType === options.taxType);
    const placeGroups = new Map<string, Set<string>>();
    for (const row of rows) {
      const key = `${row.Target} ${row.Location.Canton}`;
      placeGroups.set(key, new Set([...(placeGroups.get(key) ?? []), ...groupsOf(row)]));
    }
    for (const row of rows) {
      const target = options.targets.find((t) => t.target === row.Target);
      const place = target && placeOf(target, row.Location.Canton);
      if (!target || !place) {
        continue;
      }
      const groups = placeGroups.get(`${row.Target} ${row.Location.Canton}`)!;
      const roundedBy = target.cantonRounding[row.Location.Canton] ?? target.rounding;
      const tariffMetrics = [
        target.metric,
        ...(target.alsoAs && !placeGroups.has(`${target.alsoAs.unless} ${row.Location.Canton}`)
          ? [target.alsoAs.metric]
          : []),
      ];
      for (const { variant, divided } of variantsOf(row, groups, options)) {
        const key = `${place.scheme}:${place.value} ${target.metric} ${variant}`;
        const label = `${key} ${year}`;
        const reason = unreadable(row, target.divisor !== undefined, divided, options);
        const reading = options.tableTypes[row.TableType];
        if (reason || !reading) {
          unread.set(key, {
            label,
            reason: reason ?? `table type "${row.TableType}" is not read yet`,
          });
          continue;
        }
        const tariff = {
          ...tariffOf(row, reading, pack.currency),
          ...(roundedBy && { rounding: roundedBy }),
          ...(target.minimum !== undefined && { minimum: target.minimum }),
        };
        const problem = tariffProblem(tariff as Tariff);
        if (problem) {
          throw new Error(`${label}: ${problem}`);
        }
        const read: BatchFact[] = tariffMetrics.map((metricKey) => ({
          jurisdiction: place,
          metricKey,
          variant,
          ...period,
          value: tariff,
        }));
        if (target.divisor) {
          read.push({
            jurisdiction: place,
            metricKey: target.divisor.metric,
            variant,
            ...period,
            value: divided && splitting(row, options) !== 0 ? splitting(row, options) : 1,
          });
        }
        for (const fact of read) {
          const factKey = `${place.scheme}:${place.value} ${fact.metricKey} ${variant}`;
          const earlier = facts.get(factKey);
          if (earlier && JSON.stringify(earlier.value) !== JSON.stringify(fact.value)) {
            throw new Error(
              `${label}: the export gives two different values for ${fact.metricKey}`,
            );
          }
          facts.set(factKey, fact);
        }
      }
    }
    for (const [key, { label, reason }] of unread) {
      if (!facts.has(key)) {
        skip(label, reason);
      }
    }
    return { pack: pack.key, jurisdictions: [], relations: [], facts: [...facts.values()] };
  },
};

// --- Multipliers --------------------------------------------------------------

const rateRow = z.object({ Location: location }).catchall(z.unknown());
const rates = enveloped(rateRow);
type Rates = z.infer<typeof rates>;

const ratesOptions = exportOptions
  .extend({
    /** The row field holding the multiplier, and the metric it is. */
    field: z.string().min(1),
    metric: z.string().min(1),
    /** A field in percent has 100 here. */
    divideBy: z.number().positive().default(1),
    /** A place per canton, by the export's canton code: the canton's own multiplier. */
    cantons: z.record(z.string(), ref).optional(),
    /**
     * Or each row's own place, its BfsID under `scheme`, for the listed canton
     * codes only. The export gives one rate per commune; where a commune levies
     * several, it shows one of them without saying so, so list only cantons whose
     * communes levy one.
     */
    communes: z
      .object({ scheme: z.string().min(1), cantons: z.array(z.string().min(1)).min(1) })
      .optional(),
  })
  .refine(
    (o) => (o.cantons === undefined) !== (o.communes === undefined),
    "give either cantons or communes",
  );
type RatesOptions = z.infer<typeof ratesOptions>;

function placeOfRate(options: RatesOptions, at: z.infer<typeof location>): ExternalRef | undefined {
  if (options.cantons) {
    return options.cantons[at.Canton];
  }
  return options.communes!.cantons.includes(at.Canton)
    ? { scheme: options.communes!.scheme, value: String(at.BfsID) }
    : undefined;
}

export const estvSimpleRatesAdapter: Adapter<Rates, RatesOptions> = {
  key: "estv_simple_rates",
  version: "3",
  decode: decodeJsonEnvelope,
  schema: rates,
  options: ratesOptions,
  ...planning,
  map: (exported, { pack, options }) => {
    if (!pack) {
      throw new Error("multipliers belong to a pack's places; the source names none");
    }
    const year = exported.request.body.TaxYear;
    const facts = new Map<string, BatchFact>();
    for (const row of exported.response.response) {
      const place = placeOfRate(options, row.Location);
      if (!place) {
        continue;
      }
      const value = row[options.field];
      if (typeof value !== "number") {
        throw new Error(`${place.scheme}:${place.value} ${year}: ${options.field} is not a number`);
      }
      const key = `${place.scheme}:${place.value}`;
      const fact: BatchFact = {
        jurisdiction: place,
        metricKey: options.metric,
        variant: null,
        ...fiscalYearPeriod(year, pack.fiscalYear.startMonthDay),
        value: value / options.divideBy,
      };
      if (facts.has(key) && facts.get(key)!.value !== fact.value) {
        throw new Error(`${key} ${year}: the export gives two different multipliers`);
      }
      facts.set(key, fact);
    }
    return { pack: pack.key, jurisdictions: [], relations: [], facts: [...facts.values()] };
  },
};

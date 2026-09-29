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
import type { BatchFact, ExternalRef } from "../importer/batch";
import { decodeJsonEnvelope } from "../importer/envelope";
import { fiscalYearPeriod } from "./csv-facts";
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
  Table: z.array(z.object({ Amount: z.number(), Percent: z.number() })).min(1),
});
const scales = enveloped(scaleRow);
type Scales = z.infer<typeof scales>;
type ScaleRow = z.infer<typeof scaleRow>;

const scalesOptions = exportOptions.extend({
  taxType: z.string().min(1),
  targets: z
    .array(
      z
        .object({ target: z.string().min(1), metric: z.string().min(1), ...placeChoice })
        .refine(oneWayToPlace, "give either place or cantons"),
    )
    .min(1),
  /** The group token that marks a row as this variant's; a row may carry several. */
  variants: z.array(z.object({ variant: z.string().min(1), group: z.string().min(1) })).min(1),
  /** The group that applies to every variant. */
  everyVariantGroup: z.string().min(1),
  /** How each table type reads: `thresholds` (Amount is where a rate starts) or `widths`. */
  tableTypes: z.record(z.string(), z.enum(["thresholds", "widths"])),
});
type ScalesOptions = z.infer<typeof scalesOptions>;

/** Percent to a rate, without binary noise (2.9699999999999998 → 0.0297). */
const rateOf = (percent: number): number => Math.round(percent * 1e6) / 1e8;

function brackets(row: ScaleRow, reading: "thresholds" | "widths") {
  let from = 0;
  return row.Table.map((step) => {
    const bracket = {
      from: reading === "thresholds" ? step.Amount : from,
      rate: rateOf(step.Percent),
    };
    from += step.Amount;
    return bracket;
  });
}

export const estvTaxScalesAdapter: Adapter<Scales, ScalesOptions> = {
  key: "estv_tax_scales",
  version: "1",
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
    for (const row of exported.response.response) {
      const target = options.targets.find((t) => t.target === row.Target);
      const place =
        target && row.TaxType === options.taxType && placeOf(target, row.Location.Canton);
      if (!target || !place) {
        continue;
      }
      const groups = row.Group.split(",");
      const variants = options.variants.filter(
        (v) => groups.includes(v.group) || row.Group === options.everyVariantGroup,
      );
      for (const { variant } of variants) {
        const key = `${place.scheme}:${place.value} ${target.metric} ${variant}`;
        const label = `${key} ${year}`;
        const reading = options.tableTypes[row.TableType];
        if (row.Splitting !== 0 || !reading) {
          unread.set(key, {
            label,
            reason:
              row.Splitting !== 0
                ? `the tariff divides a couple's income (splitting ${row.Splitting}), which the tax model does not express yet`
                : `table type "${row.TableType}" is not read yet`,
          });
          continue;
        }
        const fact: BatchFact = {
          jurisdiction: place,
          metricKey: target.metric,
          variant,
          ...period,
          value: { kind: "progressive", currency: pack.currency, brackets: brackets(row, reading) },
        };
        const earlier = facts.get(key);
        if (earlier && JSON.stringify(earlier.value) !== JSON.stringify(fact.value)) {
          throw new Error(`${label}: the export gives two different tariffs`);
        }
        facts.set(key, fact);
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

const ratesOptions = exportOptions.extend({
  /** The row field holding the multiplier, and the metric it is. */
  field: z.string().min(1),
  metric: z.string().min(1),
  /** A field in percent has 100 here. */
  divideBy: z.number().positive().default(1),
  cantons: z.record(z.string(), ref),
});
type RatesOptions = z.infer<typeof ratesOptions>;

export const estvSimpleRatesAdapter: Adapter<Rates, RatesOptions> = {
  key: "estv_simple_rates",
  version: "1",
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
      const place = options.cantons[row.Location.Canton];
      if (!place) {
        continue;
      }
      const value = row[options.field];
      if (typeof value !== "number") {
        throw new Error(`${row.Location.Canton} ${year}: ${options.field} is not a number`);
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

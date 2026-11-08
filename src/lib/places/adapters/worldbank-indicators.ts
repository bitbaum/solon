/**
 * Yearly national series from the World Bank's Indicators API (v2, JSON):
 * one request per indicator for one country, one row per calendar year.
 * Format only: which country, which indicators and which metric each becomes
 * are the source's `options`.
 *
 * The API answers `[page, rows]`; `rows` is null when the country has no
 * data for the indicator at all. A year with no value is left out and
 * reported, never stored as zero.
 */
import { z } from "zod";
import type { BatchFact } from "../importer/batch";
import type { Adapter } from "./types";

const API = "https://api.worldbank.org/v2";

const row = z.object({
  indicator: z.object({ id: z.string().min(1), value: z.string() }),
  country: z.object({ id: z.string().min(1), value: z.string() }),
  date: z.string().regex(/^\d{4}$/, "a calendar year"),
  value: z.number().nullable(),
});
const response = z.tuple([
  z.object({ page: z.number(), pages: z.number(), total: z.number() }).loose(),
  z.array(row).nullable(),
]);
type Response = z.infer<typeof response>;

const worldbankOptions = z.object({
  /** The place the figures are about, by an identifier Places holds. */
  place: z.object({ scheme: z.string().min(1), value: z.string().min(1) }),
  /** The World Bank's own code for the country (ISO 3166-1 alpha-2 or alpha-3). */
  country: z.string().regex(/^[A-Z]{2,3}$/),
  /** The first year read. */
  fromYear: z.number().int().min(1960),
  indicators: z
    .array(
      z.object({
        /** The World Bank's indicator code, e.g. NE.CON.GOVT.ZS. */
        code: z.string().regex(/^[A-Z0-9_.]+$/),
        metric: z.string().min(1),
        /** An indicator in percent becomes a ratio with 100 here. */
        divideBy: z.number().positive().default(1),
      }),
    )
    .min(1),
});
type WorldbankOptions = z.infer<typeof worldbankOptions>;

/** The request for one indicator, every year from `fromYear` to `today`'s year. */
export const worldbankUrl = (country: string, code: string, fromYear: number, today: string) =>
  `${API}/country/${country}/indicator/${code}?format=json&per_page=1000&date=${fromYear}:${today.slice(0, 4)}`;

/** The page of the indicator the World Bank publishes for people, for "show the source series". */
export const worldbankIndicatorPage = (code: string, country: string) =>
  `https://data.worldbank.org/indicator/${code}?locations=${country}`;

export const worldbankIndicatorsAdapter: Adapter<Response, WorldbankOptions> = {
  key: "worldbank_indicators",
  version: "1",
  schema: response,
  options: worldbankOptions,
  retrievals: (options, today) =>
    options.indicators.map((indicator) => ({
      url: worldbankUrl(options.country, indicator.code, options.fromYear, today),
    })),
  map: ([page, rows], { pack, options, skip }) => {
    if (!pack) {
      throw new Error("figures belong to a pack's places; the source names none");
    }
    if (page.pages > 1) {
      throw new Error(`the answer has ${page.pages} pages; only one is read`);
    }
    const facts: BatchFact[] = [];
    for (const r of rows ?? []) {
      const indicator = options.indicators.find((i) => i.code === r.indicator.id);
      if (!indicator) {
        throw new Error(`indicator ${r.indicator.id} is not in the source's options`);
      }
      const year = Number(r.date);
      const label = `${r.indicator.id} ${r.country.id} ${r.date}`;
      if (year < options.fromYear) {
        continue;
      }
      if (r.value === null) {
        skip(label, "the World Bank publishes no value for this year");
        continue;
      }
      facts.push({
        jurisdiction: options.place,
        metricKey: indicator.metric,
        variant: null,
        validFrom: `${year}-01-01`,
        validTo: `${year + 1}-01-01`,
        value: r.value / indicator.divideBy,
      });
    }
    return { pack: pack.key, jurisdictions: [], facts };
  },
};

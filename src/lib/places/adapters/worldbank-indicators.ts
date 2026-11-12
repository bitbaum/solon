/**
 * Yearly national series from the World Bank's Indicators API (v2, JSON):
 * one request per indicator, one row per country and calendar year. A source
 * reads one country (`place`, `country`) or many at once (`countries`: the
 * API's `country/all`, ten requests for the whole world where one source a
 * country made thousands). Format only: which countries, which indicators and
 * which metric each becomes are the source's `options`.
 *
 * The API answers `[page, rows]`; `rows` is null when the country has no
 * data for the indicator at all. A year with no value is left out and
 * reported, never stored as zero.
 */
import { z } from "zod";
import type { BatchFactInput } from "../importer/batch";
import type { Adapter } from "./types";

const API = "https://api.worldbank.org/v2";

const row = z.object({
  indicator: z.object({ id: z.string().min(1), value: z.string() }),
  // Empty for a few territories in the "all countries" answer (Anguilla, 2026-11-12).
  country: z.object({ id: z.string(), value: z.string() }),
  date: z.string().regex(/^\d{4}$/, "a calendar year"),
  value: z.number().nullable(),
  /** The World Bank's status for the figure; empty for an ordinary one. */
  obs_status: z.string().optional(),
});
const response = z.tuple([
  z.object({ page: z.number(), pages: z.number(), total: z.number() }).loose(),
  z.array(row).nullable(),
]);
type Response = z.infer<typeof response>;

const placeRef = z.object({ scheme: z.string().min(1), value: z.string().min(1) });
const worldbankOptions = z
  .object({
    /** One country: the place the figures are about, by an identifier Places holds. */
    place: placeRef.optional(),
    /** One country: the World Bank's own code for it (ISO 3166-1 alpha-2 or alpha-3). */
    country: z
      .string()
      .regex(/^[A-Z]{2,3}$/)
      .optional(),
    /**
     * Many countries in one request: each by the two-letter code the API
     * prints for it, and its place. Rows of any other country, and of the
     * API's aggregates (regions, income groups), are passed over.
     */
    countries: z
      .array(z.object({ code: z.string().regex(/^[A-Z]{2}$/), place: placeRef }))
      .min(1)
      .optional(),
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
  })
  .refine((o) => Boolean(o.countries) !== Boolean(o.place && o.country), {
    message: "name one country (place and country) or many (countries), not both",
  });
type WorldbankOptions = z.infer<typeof worldbankOptions>;

/**
 * The World Bank's source id for an indicator: the Worldwide Governance
 * Indicators (`GOV_WGI_…`) are source 3, everything else the World Development
 * Indicators, the API's default.
 */
const sourceOf = (code: string) => (code.startsWith("GOV_WGI_") ? "&source=3" : "");

/** Rows asked for at once: one country's years, or every country's (about 270 × 40 years). */
const PER_PAGE = { one: 1000, all: 20000 };

/** The request for one indicator, every year from `fromYear` to `today`'s year; `all` for every country. */
export const worldbankUrl = (country: string, code: string, fromYear: number, today: string) =>
  `${API}/country/${country}/indicator/${code}?format=json&per_page=${
    country === "all" ? PER_PAGE.all : PER_PAGE.one
  }${sourceOf(code)}&date=${fromYear}:${today.slice(0, 4)}`;

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
      url: worldbankUrl(options.country ?? "all", indicator.code, options.fromYear, today),
    })),
  map: ([page, rows], { pack, options, skip }) => {
    if (!pack) {
      throw new Error("figures belong to a pack's places; the source names none");
    }
    if (page.pages > 1) {
      throw new Error(`the answer has ${page.pages} pages; only one is read`);
    }
    const facts: BatchFactInput[] = [];
    const many = options.countries
      ? new Map(options.countries.map((c) => [c.code, c.place]))
      : null;
    for (const r of rows ?? []) {
      const place = many ? many.get(r.country.id) : options.place!;
      if (!place) continue;
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
        // One country's gaps are reported year by year; the world's would be thousands of lines.
        if (!many) skip(label, "the World Bank publishes no value for this year");
        continue;
      }
      facts.push({
        jurisdiction: place,
        metricKey: indicator.metric,
        variant: null,
        validFrom: `${year}-01-01`,
        validTo: `${year + 1}-01-01`,
        value: r.value / indicator.divideBy,
        // The World Bank leaves the status empty; anything it fills in is kept, not interpreted.
        quality: "normal",
        publisherFlag: r.obs_status ? r.obs_status : null,
      });
    }
    return { pack: pack.key, jurisdictions: [], facts };
  },
};

/**
 * Yearly national series from Eurostat's dissemination API, as JSON-stat 2.0
 * (`format=JSON`): one request per dataset, every series of that dataset in
 * it, one value per series, country and year. A source reads one country
 * (`place`, `geo`) or many (`geos`, each sent as its own `geo` parameter). Format only: which
 * dataset, which dimension holds the series, which filters fix the others
 * and which metric each series becomes are the source's `options`.
 *
 * JSON-stat stores the values of a cube in one flat object keyed by position:
 * the position is read back into a code per dimension, so a value is never
 * taken from the wrong series. A year with no value is absent from the cube
 * and is reported, never stored as zero.
 */
import { z } from "zod";
import type { FactQuality } from "../vocabulary";
import type { BatchFactInput } from "../importer/batch";
import type { Adapter } from "./types";

const API = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data";

const category = z.object({
  index: z.record(z.string(), z.number().int().min(0)),
  label: z.record(z.string(), z.string()).optional(),
});

const cube = z
  .object({
    id: z.array(z.string().min(1)).min(1),
    size: z.array(z.number().int().min(0)).min(1),
    dimension: z.record(z.string(), z.object({ category })),
    value: z.record(z.string(), z.number().nullable()),
    status: z.record(z.string(), z.string()).optional(),
    extension: z.object({ id: z.string().min(1) }).loose(),
  })
  .loose()
  .refine((c) => c.id.length === c.size.length, "every dimension has a size");
type Cube = z.infer<typeof cube>;

const placeRef = z.object({ scheme: z.string().min(1), value: z.string().min(1) });
const geoCode = z.string().regex(/^[A-Z]{2}$/);
const eurostatOptions = z
  .object({
    /** One country: the place the figures are about, by an identifier Places holds. */
    place: placeRef.optional(),
    /** One country: Eurostat's code for it (ISO 3166-1 alpha-2, except EL for Greece). */
    geo: geoCode.optional(),
    /** Many countries in one request a dataset: each by Eurostat's code, and its place. */
    geos: z
      .array(z.object({ code: geoCode, place: placeRef }))
      .min(1)
      .optional(),
    fromYear: z.number().int().min(1950),
    requests: z
      .array(
        z.object({
          dataset: z.string().regex(/^[a-z0-9_]+$/),
          /** The dimension whose codes are the series. */
          dimension: z.string().regex(/^[a-z0-9_]+$/),
          /** One code for every other dimension but `geo` and `time`. */
          filters: z.record(z.string().regex(/^[a-z0-9_]+$/), z.string().min(1)),
          series: z
            .array(
              z.object({
                code: z.string().min(1),
                metric: z.string().min(1),
                /** A series in per cent becomes a ratio with 100 here. */
                divideBy: z.number().positive().default(1),
              }),
            )
            .min(1),
        }),
      )
      .min(1),
  })
  .refine((o) => Boolean(o.geos) !== Boolean(o.place && o.geo), {
    message: "name one country (place and geo) or many (geos), not both",
  });
type EurostatOptions = z.infer<typeof eurostatOptions>;

/** The request for one dataset: every series of it, for one country, from a year on. */
export function eurostatUrl(
  dataset: string,
  geo: string | readonly string[],
  fromYear: number,
  filters: Readonly<Record<string, string>>,
  dimension: string,
  codes: readonly string[],
): string {
  const params = new URLSearchParams({ format: "JSON", lang: "EN" });
  for (const g of typeof geo === "string" ? [geo] : geo) params.append("geo", g);
  params.set("sinceTimePeriod", String(fromYear));
  for (const [key, value] of Object.entries(filters)) params.set(key, value);
  for (const code of codes) params.append(dimension, code);
  return `${API}/${dataset}?${params.toString()}`;
}

/**
 * Eurostat's flag on a figure as a quality: e and s (estimated, a Eurostat
 * estimate) are estimates, p provisional, f forecast; flags that annotate a
 * figure without doubting it (b a break in series, d a different definition,
 * r revised) are ordinary. The publisher's own flag is kept beside it.
 */
export function qualityOfEurostatFlag(flag: string | undefined): FactQuality {
  const flags = (flag ?? "").toLowerCase();
  if (flags.includes("f")) return "forecast";
  if (flags.includes("p")) return "provisional";
  if (flags.includes("e") || flags.includes("s")) return "estimated";
  return "normal";
}

/** Each position of the cube, read back into a code per dimension. */
export function cellsOf(
  c: Cube,
): { codes: Record<string, string>; value: number; flag?: string }[] {
  const codesByPosition = c.id.map((dim) => {
    const index = c.dimension[dim]?.category.index ?? {};
    const byPosition: string[] = [];
    for (const [code, i] of Object.entries(index)) byPosition[i] = code;
    return byPosition;
  });
  const out: { codes: Record<string, string>; value: number; flag?: string }[] = [];
  for (const [key, value] of Object.entries(c.value)) {
    if (value === null) continue;
    let rest = Number(key);
    const codes: Record<string, string> = {};
    for (let d = c.id.length - 1; d >= 0; d--) {
      const size = c.size[d]!;
      codes[c.id[d]!] = codesByPosition[d]![rest % size]!;
      rest = Math.floor(rest / size);
    }
    out.push({ codes, value, flag: c.status?.[key] });
  }
  return out;
}

export const eurostatJsonAdapter: Adapter<Cube, EurostatOptions> = {
  key: "eurostat_json",
  version: "1",
  // One request per indicator or series: each is its own part of the source.
  independentRetrievals: true,
  schema: cube,
  options: eurostatOptions,
  retrievals: (options) =>
    options.requests.map((r) => ({
      url: eurostatUrl(
        r.dataset,
        options.geos ? options.geos.map((g) => g.code) : options.geo!,
        options.fromYear,
        r.filters,
        r.dimension,
        r.series.map((s) => s.code),
      ),
    })),
  map: (c, { pack, options, skip }) => {
    if (!pack) throw new Error("figures belong to a pack's places; the source names none");
    const dataset = c.extension.id.toLowerCase();
    // A dataset may be asked for more than once (in two units, say): the cube's own
    // fixed dimensions say which request it answers.
    const holds = (dim: string, code: string) => code in (c.dimension[dim]?.category.index ?? {});
    const request = options.requests.find(
      (r) =>
        r.dataset === dataset && Object.entries(r.filters).every(([d, code]) => holds(d, code)),
    );
    if (!request) {
      throw new Error(`dataset ${dataset} with these filters is not in the source's options`);
    }
    const facts: BatchFactInput[] = [];
    const seen = new Set<string>();
    const places = options.geos
      ? new Map(options.geos.map((g) => [g.code, g.place]))
      : new Map([[options.geo!, options.place!]]);
    for (const cell of cellsOf(c)) {
      const where = `${dataset} ${JSON.stringify(cell.codes)}`;
      const place = places.get(cell.codes.geo ?? "");
      if (!place) throw new Error(`${where}: ${cell.codes.geo} was not asked for`);
      for (const [dim, code] of Object.entries(request.filters)) {
        if (cell.codes[dim] !== code) throw new Error(`${where}: ${dim} is not ${code}`);
      }
      const series = request.series.find((s) => s.code === cell.codes[request.dimension]);
      if (!series) throw new Error(`${where}: ${request.dimension} is not in the source's options`);
      const time = cell.codes.time ?? "";
      if (!/^\d{4}$/.test(time)) throw new Error(`${where}: not a yearly figure`);
      const year = Number(time);
      if (year < options.fromYear) continue;
      seen.add(`${series.code} ${year}`);
      facts.push({
        jurisdiction: place,
        metricKey: series.metric,
        variant: null,
        validFrom: `${year}-01-01`,
        validTo: `${year + 1}-01-01`,
        value: cell.value / series.divideBy,
        quality: qualityOfEurostatFlag(cell.flag),
        publisherFlag: cell.flag ? cell.flag : null,
      });
    }
    // Series the request asked for and the cube holds no figure of, for a year it has. Reported
    // for one country only: every country's gaps would be thousands of lines.
    if (options.geos) return { pack: pack.key, jurisdictions: [], facts };
    const years = Object.keys(c.dimension.time?.category.index ?? {}).filter(
      (y) => Number(y) >= options.fromYear,
    );
    for (const s of request.series) {
      for (const y of years) {
        if (!seen.has(`${s.code} ${y}`)) {
          skip(`${dataset} ${s.code} ${y}`, "Eurostat publishes no value for this year");
        }
      }
    }
    return { pack: pack.key, jurisdictions: [], facts };
  },
};

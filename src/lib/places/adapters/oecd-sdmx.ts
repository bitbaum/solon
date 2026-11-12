/**
 * Yearly national series from the OECD's SDMX data API, as CSV with codes
 * (`format=csvfile`): one request per series, one row per country and year.
 * A source reads one country (`place`) or many (`countries`: their codes
 * joined with "+" in the key, as SDMX asks for several values of one
 * dimension). Format only: which dataflow, which key, which measure and
 * which metric each becomes are the source's `options`.
 */
import { z } from "zod";
import type { FactQuality } from "../vocabulary";
import type { BatchFactInput } from "../importer/batch";
import { decodeCsv } from "./csv";
import type { Adapter } from "./types";

const API = "https://sdmx.oecd.org/public/rest/data";

const rows = z.array(z.record(z.string(), z.string()));
type Rows = z.infer<typeof rows>;

const placeRef = z.object({ scheme: z.string().min(1), value: z.string().min(1) });
const oecdOptions = z
  .object({
    /** One country: the place the figures are about, by an identifier Places holds. */
    place: placeRef.optional(),
    /**
     * Many countries: each by the code the OECD prints in REF_AREA (ISO 3166-1 alpha-3), and its
     * place. A row of any other area (an OECD average, a partner country) is passed over.
     */
    countries: z
      .array(z.object({ code: z.string().regex(/^[A-Z]{3}$/), place: placeRef }))
      .min(1)
      .optional(),
    /** The first year read. */
    fromYear: z.number().int().min(1960),
    series: z
      .array(
        z.object({
          /** `agency,id,version`, as the API names a dataflow. */
          flow: z.string().regex(/^[A-Z0-9_.]+,[A-Za-z0-9_@]+,\d+(\.\d+)*$/),
          /** The data key, dimension values separated by dots, the country's code first. */
          key: z.string().regex(/^[A-Z0-9_+]*(\.[A-Z0-9_+]*)+$/),
          /** The MEASURE code a row of this series carries. */
          measure: z.string().min(1),
          /** Further columns a row of this series carries (a sector, a unit), where a flow holds several series under one measure. */
          match: z.record(z.string(), z.string()).default({}),
          metric: z.string().min(1),
          /** A series in percent becomes a ratio with 100 here. */
          divideBy: z.number().positive().default(1),
        }),
      )
      .min(1),
  })
  .refine((o) => Boolean(o.place) !== Boolean(o.countries), {
    message: "name one country (place) or many (countries), not both",
  });
type OecdOptions = z.infer<typeof oecdOptions>;

/** `OECD.CTP.TPS,DSD_X@DF_Y,1.0` as a row's DATAFLOW column writes it: `OECD.CTP.TPS:DSD_X@DF_Y(1.0)`. */
export const dataflowColumn = (flow: string): string => {
  const [agency, id, version] = flow.split(",");
  return `${agency}:${id}(${version})`;
};

export const oecdUrl = (flow: string, key: string, fromYear: number) =>
  `${API}/${flow}/${key}?startPeriod=${fromYear}&format=csvfile`;

/**
 * SDMX's observation status (OBS_STATUS) as a quality: E and I (estimated,
 * imputed) are estimates, P provisional, F forecast; A (normal) and the codes
 * that annotate a figure without doubting it (a break in series, a different
 * definition) are ordinary. The publisher's own code is kept beside it.
 */
export function qualityOfObsStatus(code: string | undefined): FactQuality {
  switch ((code ?? "").trim().toUpperCase()) {
    case "E":
    case "I":
      return "estimated";
    case "P":
      return "provisional";
    case "F":
      return "forecast";
    default:
      return "normal";
  }
}

export const oecdSdmxAdapter: Adapter<Rows, OecdOptions> = {
  key: "oecd_sdmx",
  version: "1",
  // One request per indicator or series: each is its own part of the source.
  independentRetrievals: true,
  decode: decodeCsv,
  schema: rows,
  options: oecdOptions,
  retrievals: (options) =>
    options.series.map((series) => ({
      url: oecdUrl(series.flow, series.key, options.fromYear),
    })),
  map: (table, { pack, options, skip }) => {
    if (!pack) {
      throw new Error("figures belong to a pack's places; the source names none");
    }
    const facts: BatchFactInput[] = [];
    const many = options.countries
      ? new Map(options.countries.map((c) => [c.code, c.place]))
      : null;
    for (const [i, row] of table.entries()) {
      const where = `row ${i + 2}`;
      const series = options.series.find(
        (s) =>
          dataflowColumn(s.flow) === row.DATAFLOW &&
          s.measure === row.MEASURE &&
          Object.entries(s.match).every(([column, value]) => row[column] === value),
      );
      if (!series) {
        throw new Error(`${where}: ${row.DATAFLOW} ${row.MEASURE} is not in the source's options`);
      }
      if (row.FREQ !== "A" || !/^\d{4}$/.test(row.TIME_PERIOD ?? "")) {
        throw new Error(`${where}: not a yearly figure (${row.FREQ} ${row.TIME_PERIOD})`);
      }
      const year = Number(row.TIME_PERIOD);
      const label = `${row.MEASURE} ${row.REF_AREA} ${year}`;
      if (year < options.fromYear) {
        continue;
      }
      const place = many ? many.get(row.REF_AREA ?? "") : options.place!;
      if (!place) {
        continue;
      }
      const raw = row.OBS_VALUE ?? "";
      const value = Number(raw);
      if (raw.trim() === "" || !Number.isFinite(value)) {
        // One country's gaps are reported year by year; every member's would be hundreds of lines.
        if (!many) skip(label, "the OECD publishes no value for this year");
        continue;
      }
      if (row.UNIT_MULT && row.UNIT_MULT !== "0") {
        throw new Error(`${where}: unit multiplier ${row.UNIT_MULT} is not read`);
      }
      facts.push({
        jurisdiction: place,
        metricKey: series.metric,
        variant: null,
        validFrom: `${year}-01-01`,
        validTo: `${year + 1}-01-01`,
        value: value / series.divideBy,
        quality: qualityOfObsStatus(row.OBS_STATUS),
        publisherFlag: row.OBS_STATUS && row.OBS_STATUS !== "A" ? row.OBS_STATUS : null,
      });
    }
    return { pack: pack.key, jurisdictions: [], facts };
  },
};

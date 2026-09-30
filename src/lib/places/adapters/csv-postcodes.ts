/**
 * A postcode directory published as CSV, one row per postcode locality and
 * place it lies in. Format only: which column holds the postcode, the
 * locality, the place's code and its share, and which scheme that code belongs
 * to, are the source's `options`.
 */
import { z } from "zod";
import type { BatchPostcode } from "../importer/batch";
import { decodeCsvAnyForm } from "./csv";
import type { Adapter } from "./types";

const rows = z.array(z.record(z.string(), z.string())).min(1);
type Rows = z.infer<typeof rows>;

const column = z.string().min(1);
const csvPostcodesOptions = z.object({
  /** Where to fetch the directory; absent when it is handed in as a file. */
  url: z.url().optional(),
  postcode: column,
  locality: column,
  place: z.object({ scheme: z.string().min(1), column }),
  /** The locality's share of addresses in the place; `99.5 %` reads as 99.5. */
  share: z.object({ column, divideBy: z.number().positive().default(1) }).optional(),
  /** An ISO date the row is valid from. */
  validFrom: column.optional(),
});
type CsvPostcodesOptions = z.infer<typeof csvPostcodesOptions>;

export const csvPostcodesAdapter: Adapter<Rows, CsvPostcodesOptions> = {
  key: "csv_postcodes",
  version: "1",
  decode: decodeCsvAnyForm,
  schema: rows,
  options: csvPostcodesOptions,
  retrievals: (options) => (options.url ? [{ url: options.url }] : []),
  map: (table, { pack, options }) => {
    if (!pack) {
      throw new Error("postcodes belong to a pack's places; the source names none");
    }
    const postcodes: BatchPostcode[] = table.map((row, i) => {
      const where = `row ${i + 2}`;
      const postcode = row[options.postcode]?.trim();
      const locality = row[options.locality]?.trim();
      const code = row[options.place.column]?.trim();
      if (!postcode || !locality || !code) {
        throw new Error(
          `${where}: no postcode, locality or code in ${options.postcode}, ${options.locality}, ${options.place.column}`,
        );
      }
      let share: number | null = null;
      if (options.share) {
        const raw = row[options.share.column] ?? "";
        const value = Number(raw.replace("%", "").trim());
        if (raw.trim() === "" || !Number.isFinite(value)) {
          throw new Error(`${where}: ${options.share.column} is not a number ("${raw}")`);
        }
        share = value / options.share.divideBy;
      }
      return {
        postcode,
        locality,
        place: { scheme: options.place.scheme, value: code },
        share,
        validFrom: options.validFrom ? row[options.validFrom]?.trim() || null : null,
        validTo: null,
      };
    });
    return { pack: pack.key, jurisdictions: [], relations: [], facts: [], postcodes };
  },
};

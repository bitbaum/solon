/**
 * Ways to take part, kept as CSV: one row per place and kind, with the
 * authority's own page for it and, where the authority states one, the usual
 * deadline and the page that states it. Format only: which column holds the
 * place's code, which kinds its words stand for and which scheme the code
 * belongs to are the source's `options`.
 */
import { z } from "zod";
import type { BatchInstrument } from "../importer/batch";
import { decodeCsv } from "./csv";
import type { Adapter } from "./types";

const rows = z.array(z.record(z.string(), z.string())).min(1);
type Rows = z.infer<typeof rows>;

const column = z.string().min(1);
const csvInstrumentsOptions = z.object({
  place: z.object({ scheme: z.string().min(1), column }),
  /** The column naming the kind, and the instrument kind each of its words stands for. */
  kind: z.object({ column, values: z.record(z.string(), z.string().min(1)) }),
  url: column,
  deadline: z.object({ column, source: column }).optional(),
});
type CsvInstrumentsOptions = z.infer<typeof csvInstrumentsOptions>;

export const csvInstrumentsAdapter: Adapter<Rows, CsvInstrumentsOptions> = {
  key: "csv_instruments",
  version: "1",
  decode: decodeCsv,
  schema: rows,
  options: csvInstrumentsOptions,
  map: (table, { pack, options }) => {
    if (!pack) {
      throw new Error("instruments belong to a pack's places; the source names none");
    }
    const instruments: BatchInstrument[] = table.map((row, i) => {
      const where = `row ${i + 2}`;
      const code = row[options.place.column]?.trim();
      const word = row[options.kind.column]?.trim() ?? "";
      const kind = options.kind.values[word];
      const url = row[options.url]?.trim();
      if (!code || !url) {
        throw new Error(`${where}: no code or url in ${options.place.column}, ${options.url}`);
      }
      if (!kind) {
        throw new Error(`${where}: "${word}" in ${options.kind.column} names no instrument kind`);
      }
      const deadline = options.deadline ? row[options.deadline.column]?.trim() : "";
      return {
        place: { scheme: options.place.scheme, value: code },
        kind,
        officialUrl: url,
        requirements:
          deadline && options.deadline
            ? { deadline, deadlineSource: row[options.deadline.source]?.trim() ?? "" }
            : {},
        validFrom: null,
        validTo: null,
      };
    });
    return { pack: pack.key, jurisdictions: [], instruments };
  },
};

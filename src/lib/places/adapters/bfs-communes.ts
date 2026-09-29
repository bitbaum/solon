/**
 * The Swiss Federal Statistical Office's historicised commune register, as its
 * API serves it: a snapshot of every unit valid on a date (cantons, districts,
 * communes), and the list of mutations between two dates. Format only: which
 * levels, schemes and cantons the rows become is the source's `options`.
 *
 * Two traits of the format shape the mapping. A unit's `HistoricalCode` names
 * one territorial version and is unique only within its level; `Parent` is the
 * code of the version one level up. `BfsCode` is the unit's lasting number,
 * kept through renamings and territory exchanges, so it is the key; a merger
 * creates a new number, recorded as `succeeds`.
 */
import { z } from "zod";
import type { BatchJurisdiction, BatchName, BatchRelation, ExternalRef } from "../importer/batch";
import { decodeCsv, isoFromDottedDate } from "./csv";
import type { Adapter } from "./types";

const dotted = z.string().regex(/^(\d{2}\.\d{2}\.\d{4})?$/, "a DD.MM.YYYY date or empty");
const code = z.string().regex(/^\d+$/, "a number");
const refSchema = z.object({ scheme: z.string().min(1), value: z.string().min(1) });
const isoDate = z.iso.date();

/** `{date}`-style placeholders as the register's `DD-MM-YYYY`. */
const registerDate = (iso: string): string => iso.split("-").reverse().join("-");

const dayAfter = (iso: string): string =>
  new Date(Date.parse(`${iso}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

/** Every anniversary of `from` before `today`. */
function anniversariesBefore(from: string, today: string): string[] {
  const [year, monthDay] = [Number(from.slice(0, 4)), from.slice(5)];
  const dates: string[] = [];
  for (let y = year; `${y}-${monthDay}` < today; y++) {
    dates.push(`${y}-${monthDay}`);
  }
  return dates;
}

const snapshotRow = z.object({
  HistoricalCode: code,
  BfsCode: code,
  ValidFrom: dotted,
  ValidTo: dotted,
  Level: code,
  Parent: z.string().regex(/^\d*$/),
  Name: z.string().min(1),
  ShortName: z.string(),
});
type SnapshotRow = z.infer<typeof snapshotRow>;

const snapshotOptions = z.object({
  /** The register's snapshot endpoint, with `{date}` for the snapshot date. */
  url: z.string().includes("{date}"),
  /** The first snapshot a backfill loads; one more per year after it. */
  historyFrom: isoDate,
  /** The country the register covers. Its names are the pack's. */
  root: refSchema,
  /** Register level → pack level and identifier scheme. The lowest number is the top. */
  levels: z
    .array(
      z.object({
        registerLevel: z.number().int().positive(),
        level: z.string().min(1),
        scheme: z.string().min(1),
        /** Keeps each territorial version's `HistoricalCode` under this scheme. */
        versionScheme: z.string().min(1).optional(),
      }),
    )
    .min(1),
  /**
   * Which top-level units to take, by register number, each with the locales
   * its names are published in, in the order a multilingual name lists them
   * ("Bern / Berne").
   */
  include: z.record(code, z.array(z.string().min(2)).min(1)),
});
type SnapshotOptions = z.infer<typeof snapshotOptions>;

export const bfsCommunesSnapshotAdapter: Adapter<SnapshotRow[], SnapshotOptions> = {
  key: "bfs_communes_snapshot",
  version: "1",
  decode: decodeCsv,
  schema: z.array(snapshotRow).min(1),
  options: snapshotOptions,
  // Today's snapshot already carries an end the register has recorded ahead
  // (a merger on 1 January is in December's snapshot as ValidTo 31.12).
  retrievals: (options, today) => [{ url: options.url.replace("{date}", registerDate(today)) }],
  // Communes that ended before today are in no current snapshot: one a year.
  // Today's comes first so the places that exist now are the first recorded
  // and keep their plain paths; an ended namesake gets its number appended.
  // The schedule's own run of today's snapshot then restates the present.
  backfill: (options, today) =>
    [today, ...anniversariesBefore(options.historyFrom, today)].map((date) => ({
      url: options.url.replace("{date}", registerDate(date)),
    })),
  map: (rows, { pack, options }) => {
    if (!pack) {
      throw new Error("the commune register maps into a pack; the source names none");
    }
    const rootLevel = pack.levels.find((l) => l.parent === null && !l.overlaps)!;
    const levels = new Map(options.levels.map((l) => [l.registerLevel, l]));
    const top = Math.min(...levels.keys());
    const at = (level: number, historical: string) => `${level}:${historical}`;
    const index = new Map(rows.map((r) => [at(Number(r.Level), r.HistoricalCode), r]));
    const parentOf = (row: SnapshotRow) => index.get(at(Number(row.Level) - 1, row.Parent));
    const topOf = (row: SnapshotRow): SnapshotRow | undefined => {
      let cursor: SnapshotRow | undefined = row;
      while (cursor && Number(cursor.Level) > top) {
        cursor = parentOf(cursor);
      }
      return cursor;
    };
    const refOf = (row: SnapshotRow): ExternalRef => ({
      scheme: levels.get(Number(row.Level))!.scheme,
      value: row.BfsCode,
    });

    const jurisdictions: BatchJurisdiction[] = [
      {
        ref: options.root,
        levelKey: rootLevel.key,
        identifiers: [],
        names: Object.entries(pack.names).map(([locale, name]) => ({
          ...plainName(name, locale),
          nameType: pack.defaultLocales.includes(locale) ? "self" : "common",
        })),
        validFrom: null,
        validTo: null,
      },
    ];
    const relations: BatchRelation[] = [];
    for (const row of rows) {
      const level = levels.get(Number(row.Level));
      const locales = options.include[topOf(row)?.BfsCode ?? ""];
      if (!level || !locales) {
        continue;
      }
      const isTop = Number(row.Level) === top;
      const validTo = isoFromDottedDate(row.ValidTo);
      const parts = row.Name.split(" / ");
      const names: BatchName[] =
        isTop && parts.length === locales.length
          ? parts.map((part, i) => plainName(part, locales[i]!))
          : [plainName(row.Name, locales[0]!)];
      if (!isTop && row.ShortName !== "" && row.ShortName !== row.Name) {
        names.push({ ...plainName(row.ShortName, locales[0]!), nameType: "common" });
      }
      jurisdictions.push({
        ref: refOf(row),
        levelKey: level.level,
        identifiers: level.versionScheme
          ? [
              {
                scheme: level.versionScheme,
                value: row.HistoricalCode,
                validFrom: isoFromDottedDate(row.ValidFrom),
                validTo,
              },
            ]
          : [],
        names,
        validFrom: null,
        validTo,
      });
      const parent = isTop ? undefined : parentOf(row);
      if (!isTop && !parent) {
        throw new Error(`${row.Name} (${row.BfsCode}): no parent ${row.Parent} in the snapshot`);
      }
      relations.push({
        from: refOf(row),
        to: parent ? refOf(parent) : options.root,
        relation: "part_of",
        validFrom: null,
        validTo,
      });
    }
    return { pack: pack.key, jurisdictions, relations, facts: [] };
  },
};

function plainName(name: string, locale: string): BatchName {
  return {
    locale,
    script: null,
    name,
    nameType: "self",
    usedBy: null,
    validFrom: null,
    validTo: null,
  };
}

const mutationRow = z.object({
  MutationNumber: code,
  MutationDate: dotted.refine((d) => d !== "", "a mutation has a date"),
  InitialCode: code,
  TerminalCode: code,
});
type MutationRow = z.infer<typeof mutationRow>;

const mutationOptions = z.object({
  /** The register's mutations endpoint, with `{from}` and `{to}` for the period. */
  url: z.string().includes("{from}").includes("{to}"),
  /** The commune snapshots' `historyFrom`: mutations after it link places they hold. */
  historyFrom: isoDate,
  /** The scheme the register's commune numbers are recorded under. */
  scheme: z.string().min(1),
});
type MutationOptions = z.infer<typeof mutationOptions>;

export const bfsCommunesMutationsAdapter: Adapter<MutationRow[], MutationOptions> = {
  key: "bfs_communes_mutations",
  version: "1",
  decode: decodeCsv,
  schema: z.array(mutationRow),
  options: mutationOptions,
  // A merger dated on the first snapshot's day ended its communes the day
  // before, so neither end of it is a place the backfill knows.
  retrievals: (options, today) => [
    {
      url: options.url
        .replace("{from}", registerDate(dayAfter(options.historyFrom)))
        .replace("{to}", registerDate(today)),
    },
  ],
  map: (rows, { pack, options }) => {
    if (!pack) {
      throw new Error("the mutation register maps into a pack; the source names none");
    }
    const seen = new Set<string>();
    const relations: BatchRelation[] = [];
    for (const row of rows) {
      const key = `${row.TerminalCode}>${row.InitialCode}`;
      // A commune that keeps its number (renamed, territory exchanged) succeeds nobody.
      if (row.InitialCode === row.TerminalCode || seen.has(key)) {
        continue;
      }
      seen.add(key);
      relations.push({
        from: { scheme: options.scheme, value: row.TerminalCode },
        to: { scheme: options.scheme, value: row.InitialCode },
        relation: "succeeds",
        validFrom: isoFromDottedDate(row.MutationDate),
        validTo: null,
      });
    }
    return { pack: pack.key, jurisdictions: [], relations, facts: [] };
  },
};

/**
 * Applies a retrieval of a law register to the database (design L0). The same
 * discipline as the Places importer, for acts:
 *
 *  1. the raw bytes are kept under their sha256 and a `sources` row cites them;
 *  2. in ONE transaction new acts are inserted, a changed title or number
 *     supersedes the old row, a changed in-force flag is updated, and nothing
 *     is ever deleted;
 *  3. acts the register no longer lists are reported, not ended: only a
 *     publisher can say an act ended;
 *  4. a dry run does all of it and rolls back, so it reports the exact diff;
 *  5. a retrieval whose acts, as read, are those the register last applied
 *     stops at once, recorded as applied and `unchanged`.
 *
 * An import reads only what concerns its own register: the acts the retrieval
 * lists (by their identity), the identities this register stated before (for
 * what it no longer lists) and the places of the authorities it names. Its
 * cost does not grow with the rest of the law database.
 */
import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { LAW_AUTHORITIES, type LawRegisterSource } from "@/lib/config/law";
import type { Database } from "@/lib/db/client";
import { legalActIdentifiers, legalActNames, legalActs } from "@/lib/db/law-schema";
import { jurisdictionIdentifiers, placeImportRuns, sources } from "@/lib/db/places-schema";
import { sha256Hex, type SnapshotStore } from "@/lib/places/importer/snapshots";

export const IMPORTER_VERSION = "law-register-1";
const CHUNK = 1000;

export interface RegisterChanges {
  actsInserted: number;
  actsUpdated: number;
  namesInserted: number;
  namesSuperseded: number;
  identifiersInserted: number;
  identifiersSuperseded: number;
}

export interface RegisterReport {
  runId: string;
  status: "applied" | "dry_run" | "failed";
  sourceId: string | null;
  contentSha256: string | null;
  counts: RegisterChanges;
  /** Acts this register stated before that the retrieval no longer lists. */
  missingFromSource: number;
  /** Rows left out on purpose, with why. */
  skipped: { row: string; reason: string }[];
  problems: string[];
  /** The retrieval's acts, as read, were those the register last applied: nothing was done. */
  unchanged?: boolean;
}

/** One act as a register states it, whatever the register. */
export interface ActRow {
  authority: string;
  kind: string;
  inForce: boolean;
  /**
   * False when the register does not say whether the act is in force (the Republic of South
   * Ossetia's publishers do not): `inForce` is then only "listed and not marked withdrawn",
   * and every page and count says the status is not stated. Absent means stated.
   */
  statusStated?: boolean;
  title: string;
  /** True when the title is Solon's, built from the act's own text because the publisher gives none: shown as such. */
  titleDerived?: boolean;
  /** BCP 47 language of the title. */
  locale: string;
  /** What names this act in its register: scheme (config ACT_IDENTIFIER_SCHEMES) and value. */
  identity: { scheme: string; value: string };
  /**
   * The number its authority gave it (systematic number), when this register states one. A register that
   * states none removes only a number it stated itself earlier: one read from the act's own document stands.
   */
  systematicNumber: string | null;
  /** Further identifiers the register gives the act. */
  more?: { scheme: string; value: string }[];
}

export interface RegisterRead {
  rows: readonly ActRow[];
  skipped: { row: string; reason: string }[];
}

export interface RegisterImportOptions {
  /** Which register this is: its key, licence and the scheme that names its acts. */
  register: Pick<LawRegisterSource, "key" | "licenceSpdx" | "identityScheme">;
  /**
   * Maps `bytes` to the acts the register states, and the rows left out on
   * purpose, with why. Run inside the guarded part of the run, so bytes that
   * are not a register fail the run and are recorded rather than thrown.
   */
  read: () => Promise<RegisterRead> | RegisterRead;
  bytes: Uint8Array;
  url: string | null;
  retrievedAt: Date;
  snapshots: SnapshotStore;
  dryRun?: boolean;
}

const noChanges = (): RegisterChanges => ({
  actsInserted: 0,
  actsUpdated: 0,
  namesInserted: 0,
  namesSuperseded: 0,
  identifiersInserted: 0,
  identifiersSuperseded: 0,
});

class DryRunDone extends Error {}

function chunks<T>(items: readonly T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += CHUNK) out.push(items.slice(i, i + CHUNK));
  return out;
}

export async function importRegister(
  db: Database,
  options: RegisterImportOptions,
): Promise<RegisterReport> {
  const { register, dryRun = false } = options;
  const [run] = await db
    .insert(placeImportRuns)
    .values({ sourceKey: register.key, status: "running", report: {} })
    .returning({ id: placeImportRuns.id });
  const report: RegisterReport = {
    runId: run!.id,
    status: "failed",
    sourceId: null,
    contentSha256: null,
    counts: noChanges(),
    missingFromSource: 0,
    skipped: [],
    problems: [],
  };
  try {
    const sha = sha256Hex(options.bytes);
    report.contentSha256 = sha;
    const { rows, skipped } = await options.read();
    report.skipped.push(...skipped);
    // What read the bytes, and what it read from them: the same bytes read by a changed reader
    // (a new kind rule) are applied again; the same acts read again are not.
    const version = `${IMPORTER_VERSION}#${sha256Hex(new TextEncoder().encode(JSON.stringify(rows))).slice(0, 12)}`;
    const [last] = dryRun
      ? []
      : await db
          .select({
            id: sources.id,
            sha: sources.contentSha256,
            version: sources.importerVersion,
          })
          .from(sources)
          .where(eq(sources.sourceKey, register.key))
          .orderBy(desc(sources.retrievedAt))
          .limit(1);
    if (last && last.sha === sha && last.version === version) {
      report.status = "applied";
      report.sourceId = last.id;
      report.unchanged = true;
      // What it no longer lists is still reported each run: one query, no transaction.
      const listed = new Set(rows.map((r) => r.identity.value));
      report.missingFromSource = (
        await statedBefore(db, register.identityScheme, register.key)
      ).filter((value) => !listed.has(value)).length;
    } else {
      try {
        const snapshotKey = await options.snapshots.put(sha, options.bytes);
        await db.transaction(async (tx) => {
          const [source] = await tx
            .insert(sources)
            .values({
              sourceKey: register.key,
              retrievedAt: options.retrievedAt,
              url: options.url,
              contentSha256: sha,
              snapshotKey,
              importerVersion: version,
              licenceSpdx: register.licenceSpdx,
            })
            .returning({ id: sources.id });
          const sourceId = source!.id;
          report.sourceId = sourceId;

          const places = await placeIdsByAuthority(tx, [...new Set(rows.map((r) => r.authority))]);
          const known = await currentActs(
            tx,
            register.identityScheme,
            rows.map((r) => r.identity.value),
          );
          const registerKey = register.key;
          const listed = new Set<string>();
          const newActs: (typeof legalActs.$inferInsert)[] = [];
          const newIdentifiers: (typeof legalActIdentifiers.$inferInsert)[] = [];
          const newNames: (typeof legalActNames.$inferInsert)[] = [];
          const supersedeNames: string[] = [];
          const supersedeIdentifiers: string[] = [];
          const changedActs: {
            id: string;
            kind: string;
            inForce: boolean;
            statusStated: boolean;
          }[] = [];

          for (const row of rows) {
            listed.add(row.identity.value);
            const existing = known.get(row.identity.value);
            if (!existing) {
              const id = randomUUID();
              newActs.push({
                id,
                authority: row.authority,
                jurisdictionId: places.get(row.authority) ?? null,
                kind: row.kind,
                inForce: row.inForce,
                statusStated: row.statusStated ?? true,
                sourceId,
              });
              addRows(id, row, sourceId, newIdentifiers, newNames);
              continue;
            }
            if (
              existing.kind !== row.kind ||
              existing.inForce !== row.inForce ||
              existing.statusStated !== (row.statusStated ?? true)
            ) {
              changedActs.push({
                id: existing.actId,
                kind: row.kind,
                inForce: row.inForce,
                statusStated: row.statusStated ?? true,
              });
            }
            if (existing.title !== row.title) {
              supersedeNames.push(existing.nameId);
              newNames.push(nameRow(existing.actId, row, sourceId));
            }
            // A page the publisher moved, or one first read at a wrong address, follows the register.
            const page = row.more?.find((m) => m.scheme === "official_url")?.value;
            if (page && existing.officialUrl !== page) {
              if (existing.officialUrlRowId) supersedeIdentifiers.push(existing.officialUrlRowId);
              newIdentifiers.push({
                actId: existing.actId,
                scheme: "official_url",
                value: page,
                sourceId,
              });
            }
            // A register that states no number removes only a number it stated itself: one read from the
            // act's own document (store.ts, `number`) is not the register's to take away.
            const mayChange =
              Boolean(row.systematicNumber) ||
              existing.numberSourceKey === undefined ||
              existing.numberSourceKey === registerKey;
            if (mayChange && (existing.number ?? null) !== (row.systematicNumber ?? null)) {
              if (existing.numberRowId) supersedeIdentifiers.push(existing.numberRowId);
              if (row.systematicNumber) {
                newIdentifiers.push(numberRow(existing.actId, row.systematicNumber, sourceId));
              }
            }
          }
          report.missingFromSource = (
            await statedBefore(tx, register.identityScheme, register.key)
          ).filter((value) => !listed.has(value)).length;

          const now = new Date();
          // Superseded first: the unique indexes allow one current row per act.
          for (const part of chunks(supersedeNames)) {
            await tx
              .update(legalActNames)
              .set({ supersededAt: now })
              .where(inArray(legalActNames.id, part));
          }
          for (const part of chunks(supersedeIdentifiers)) {
            await tx
              .update(legalActIdentifiers)
              .set({ supersededAt: now })
              .where(inArray(legalActIdentifiers.id, part));
          }
          for (const part of chunks(newActs)) await tx.insert(legalActs).values(part);
          for (const part of chunks(newIdentifiers)) {
            await tx.insert(legalActIdentifiers).values(part);
          }
          for (const part of chunks(newNames)) await tx.insert(legalActNames).values(part);
          for (const change of changedActs) {
            await tx
              .update(legalActs)
              .set({
                kind: change.kind,
                inForce: change.inForce,
                statusStated: change.statusStated,
                sourceId,
                updatedAt: now,
              })
              .where(eq(legalActs.id, change.id));
          }
          report.counts = {
            actsInserted: newActs.length,
            actsUpdated: changedActs.length,
            namesInserted: newNames.length,
            namesSuperseded: supersedeNames.length,
            identifiersInserted: newIdentifiers.length,
            identifiersSuperseded: supersedeIdentifiers.length,
          };
          if (dryRun) throw new DryRunDone();
        });
        report.status = "applied";
      } catch (error) {
        if (!(error instanceof DryRunDone)) throw error;
        report.status = "dry_run";
        report.sourceId = null;
      }
    }
  } catch (error) {
    report.status = "failed";
    report.problems.push(error instanceof Error ? error.message : String(error));
  }
  await db
    .update(placeImportRuns)
    .set({
      status: report.status,
      sourceId: report.status === "applied" ? report.sourceId : null,
      report: { ...report, runId: undefined },
      finishedAt: new Date(),
    })
    .where(eq(placeImportRuns.id, report.runId));
  return report;
}

const nameRow = (actId: string, act: ActRow, sourceId: string) => ({
  actId,
  locale: act.locale,
  kind: "title",
  text: act.title,
  derived: act.titleDerived ?? false,
  sourceId,
});
const numberRow = (actId: string, value: string, sourceId: string) => ({
  actId,
  scheme: "systematic_number",
  value,
  sourceId,
});

function addRows(
  actId: string,
  act: ActRow,
  sourceId: string,
  identifiers: (typeof legalActIdentifiers.$inferInsert)[],
  names: (typeof legalActNames.$inferInsert)[],
): void {
  identifiers.push({ actId, scheme: act.identity.scheme, value: act.identity.value, sourceId });
  for (const more of act.more ?? []) {
    identifiers.push({ actId, scheme: more.scheme, value: more.value, sourceId });
  }
  if (act.systematicNumber) identifiers.push(numberRow(actId, act.systematicNumber, sourceId));
  names.push(nameRow(actId, act, sourceId));
}

type Reader = Pick<Database, "select">;

/** The place each of these authorities speaks for, where Places holds it: one query. */
async function placeIdsByAuthority(
  db: Reader,
  keys: readonly string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const wanted = LAW_AUTHORITIES.filter((a) => a.place && keys.includes(a.key));
  if (wanted.length === 0) return out;
  const rows = await db
    .select({
      id: jurisdictionIdentifiers.jurisdictionId,
      scheme: jurisdictionIdentifiers.scheme,
      value: jurisdictionIdentifiers.value,
    })
    .from(jurisdictionIdentifiers)
    .where(
      and(
        isNull(jurisdictionIdentifiers.supersededAt),
        sql`(${jurisdictionIdentifiers.scheme}, ${jurisdictionIdentifiers.value}) IN (${sql.join(
          wanted.map((a) => sql`(${a.place!.scheme}, ${a.place!.value})`),
          sql`, `,
        )})`,
      ),
    );
  for (const authority of wanted) {
    const row = rows.find(
      (r) => r.scheme === authority.place!.scheme && r.value === authority.place!.value,
    );
    if (row) out.set(authority.key, row.id);
  }
  return out;
}

interface KnownAct {
  actId: string;
  kind: string;
  inForce: boolean;
  statusStated: boolean;
  title: string | undefined;
  nameId: string;
  number: string | undefined;
  numberRowId: string | undefined;
  /** The source that gave the number: this register's, or a publisher's reading of the act's own document. */
  numberSourceKey?: string;
  /** The act's current page at its publisher, so a changed address replaces it. */
  officialUrl?: string;
  officialUrlRowId?: string;
}

/**
 * The acts these identities name, by the register's own id, with their current title, number and
 * page: read for the identities a retrieval lists, a thousand at a time, never the whole database.
 */
async function currentActs(
  db: Reader,
  identityScheme: string,
  values: readonly string[],
): Promise<Map<string, KnownAct>> {
  const acts: {
    actId: string;
    kind: string;
    inForce: boolean;
    statusStated: boolean;
    lexfindId: string;
  }[] = [];
  for (const part of chunks([...new Set(values)])) {
    acts.push(
      ...(await db
        .select({
          actId: legalActs.id,
          kind: legalActs.kind,
          inForce: legalActs.inForce,
          statusStated: legalActs.statusStated,
          lexfindId: legalActIdentifiers.value,
        })
        .from(legalActs)
        .innerJoin(
          legalActIdentifiers,
          and(
            eq(legalActIdentifiers.actId, legalActs.id),
            eq(legalActIdentifiers.scheme, identityScheme),
            isNull(legalActIdentifiers.supersededAt),
          ),
        )
        .where(inArray(legalActIdentifiers.value, part))),
    );
  }
  const byAct = new Map<string, KnownAct>();
  const byLexfind = new Map<string, KnownAct>();
  for (const row of acts) {
    const known: KnownAct = {
      actId: row.actId,
      kind: row.kind,
      inForce: row.inForce,
      statusStated: row.statusStated,
      title: undefined,
      nameId: "",
      number: undefined,
      numberRowId: undefined,
    };
    byAct.set(row.actId, known);
    byLexfind.set(row.lexfindId, known);
  }
  const ids = [...byAct.keys()];
  const names: { id: string; actId: string; text: string }[] = [];
  const numbers: { id: string; actId: string; value: string; sourceKey: string }[] = [];
  const pages: { id: string; actId: string; value: string }[] = [];
  for (const part of chunks(ids)) {
    names.push(
      ...(await db
        .select({ id: legalActNames.id, actId: legalActNames.actId, text: legalActNames.text })
        .from(legalActNames)
        .where(
          and(
            inArray(legalActNames.actId, part),
            eq(legalActNames.kind, "title"),
            isNull(legalActNames.supersededAt),
          ),
        )),
    );
    numbers.push(
      ...(await db
        .select({
          id: legalActIdentifiers.id,
          actId: legalActIdentifiers.actId,
          value: legalActIdentifiers.value,
          sourceKey: sources.sourceKey,
        })
        .from(legalActIdentifiers)
        .innerJoin(sources, eq(sources.id, legalActIdentifiers.sourceId))
        .where(
          and(
            inArray(legalActIdentifiers.actId, part),
            eq(legalActIdentifiers.scheme, "systematic_number"),
            isNull(legalActIdentifiers.supersededAt),
          ),
        )),
    );
    pages.push(
      ...(await db
        .select({
          id: legalActIdentifiers.id,
          actId: legalActIdentifiers.actId,
          value: legalActIdentifiers.value,
        })
        .from(legalActIdentifiers)
        .where(
          and(
            inArray(legalActIdentifiers.actId, part),
            eq(legalActIdentifiers.scheme, "official_url"),
            isNull(legalActIdentifiers.supersededAt),
          ),
        )),
    );
  }
  for (const name of names) {
    const known = byAct.get(name.actId);
    if (known) {
      known.title = name.text;
      known.nameId = name.id;
    }
  }
  for (const number of numbers) {
    const known = byAct.get(number.actId);
    if (known) {
      known.number = number.value;
      known.numberRowId = number.id;
      known.numberSourceKey = number.sourceKey;
    }
  }
  for (const page of pages) {
    const known = byAct.get(page.actId);
    if (known) {
      known.officialUrl = page.value;
      known.officialUrlRowId = page.id;
    }
  }
  return byLexfind;
}

/**
 * The identities this register itself stated that are still current: what it listed before, so
 * an act it no longer lists is reported. Another register sharing the scheme (publisher_ref) is
 * not counted against it.
 */
async function statedBefore(
  db: Reader,
  identityScheme: string,
  registerKey: string,
): Promise<string[]> {
  const rows = await db
    .select({ value: legalActIdentifiers.value })
    .from(legalActIdentifiers)
    .innerJoin(sources, eq(sources.id, legalActIdentifiers.sourceId))
    .where(
      and(
        eq(legalActIdentifiers.scheme, identityScheme),
        isNull(legalActIdentifiers.supersededAt),
        eq(sources.sourceKey, registerKey),
      ),
    );
  return rows.map((r) => r.value);
}

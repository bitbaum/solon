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
 *  4. a dry run does all of it and rolls back, so it reports the exact diff.
 */
import { randomUUID } from "node:crypto";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { LAW_AUTHORITIES, type LawRegisterSource } from "@/lib/config/law";
import type { Database } from "@/lib/db/client";
import { legalActIdentifiers, legalActNames, legalActs } from "@/lib/db/law-schema";
import { jurisdictionIdentifiers, placeImportRuns, sources } from "@/lib/db/places-schema";
import { sha256Hex, type SnapshotStore } from "@/lib/places/importer/snapshots";
import { parseRegisterSnapshot, type RegisterAct } from "./lexfind";

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
}

export interface RegisterImportOptions {
  register: LawRegisterSource;
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
    const snapshot = parseRegisterSnapshot(options.bytes);
    const snapshotKey = await options.snapshots.put(sha, options.bytes);
    try {
      await db.transaction(async (tx) => {
        const [source] = await tx
          .insert(sources)
          .values({
            sourceKey: register.key,
            retrievedAt: options.retrievedAt,
            url: options.url,
            contentSha256: sha,
            snapshotKey,
            importerVersion: IMPORTER_VERSION,
            licenceSpdx: register.licenceSpdx,
          })
          .returning({ id: sources.id });
        const sourceId = source!.id;
        report.sourceId = sourceId;

        const places = await placeIdsByAuthority(tx);
        const known = await currentActs(tx);
        const listed = new Set<string>();
        const newActs: (typeof legalActs.$inferInsert)[] = [];
        const newIdentifiers: (typeof legalActIdentifiers.$inferInsert)[] = [];
        const newNames: (typeof legalActNames.$inferInsert)[] = [];
        const supersedeNames: string[] = [];
        const supersedeIdentifiers: string[] = [];
        const changedActs: { id: string; kind: string; inForce: boolean }[] = [];

        for (const authority of snapshot.authorities) {
          const authorityKey = register.authorityByCode[authority.code];
          if (!authorityKey) {
            report.skipped.push({
              row: authority.code,
              reason: `authority ${authority.code} is not in config (${authority.acts.length} acts)`,
            });
            continue;
          }
          for (const act of authority.acts) {
            const lexfindId = String(act.id);
            listed.add(lexfindId);
            const kind = register.kindByCategory[act.categoryId];
            if (!kind) {
              report.skipped.push({
                row: `${authority.code} ${lexfindId}`,
                reason: `category ${act.categoryId} is not in config`,
              });
              continue;
            }
            const existing = known.get(lexfindId);
            if (!existing) {
              const id = randomUUID();
              newActs.push({
                id,
                authority: authorityKey,
                jurisdictionId: places.get(authorityKey) ?? null,
                kind,
                inForce: act.inForce,
                sourceId,
              });
              addRows(id, act, sourceId, newIdentifiers, newNames);
              continue;
            }
            if (existing.kind !== kind || existing.inForce !== act.inForce) {
              changedActs.push({ id: existing.actId, kind, inForce: act.inForce });
            }
            if (existing.title !== act.title) {
              supersedeNames.push(existing.nameId);
              newNames.push(nameRow(existing.actId, act, sourceId));
            }
            if ((existing.number ?? null) !== (act.systematicNumber ?? null)) {
              if (existing.numberRowId) supersedeIdentifiers.push(existing.numberRowId);
              if (act.systematicNumber) {
                newIdentifiers.push(numberRow(existing.actId, act.systematicNumber, sourceId));
              }
            }
          }
        }
        report.missingFromSource = [...known.keys()].filter((key) => !listed.has(key)).length;

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
            .set({ kind: change.kind, inForce: change.inForce, sourceId, updatedAt: now })
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

const nameRow = (actId: string, act: RegisterAct, sourceId: string) => ({
  actId,
  locale: "de",
  kind: "title",
  text: act.title,
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
  act: RegisterAct,
  sourceId: string,
  identifiers: (typeof legalActIdentifiers.$inferInsert)[],
  names: (typeof legalActNames.$inferInsert)[],
): void {
  identifiers.push({ actId, scheme: "lexfind_id", value: String(act.id), sourceId });
  if (act.systematicNumber) identifiers.push(numberRow(actId, act.systematicNumber, sourceId));
  names.push(nameRow(actId, act, sourceId));
}

type Reader = Pick<Database, "select">;

/** The place each authority speaks for, where Places holds it. */
async function placeIdsByAuthority(db: Reader): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (const authority of LAW_AUTHORITIES) {
    if (!authority.place) continue;
    const [row] = await db
      .select({ id: jurisdictionIdentifiers.jurisdictionId })
      .from(jurisdictionIdentifiers)
      .where(
        and(
          eq(jurisdictionIdentifiers.scheme, authority.place.scheme),
          eq(jurisdictionIdentifiers.value, authority.place.value),
          isNull(jurisdictionIdentifiers.supersededAt),
        ),
      )
      .limit(1);
    if (row) out.set(authority.key, row.id);
  }
  return out;
}

interface KnownAct {
  actId: string;
  kind: string;
  inForce: boolean;
  title: string | undefined;
  nameId: string;
  number: string | undefined;
  numberRowId: string | undefined;
}

/** Every act the register has stated, by the register's own id. */
async function currentActs(db: Reader): Promise<Map<string, KnownAct>> {
  const acts = await db
    .select({
      actId: legalActs.id,
      kind: legalActs.kind,
      inForce: legalActs.inForce,
      lexfindId: legalActIdentifiers.value,
    })
    .from(legalActs)
    .innerJoin(
      legalActIdentifiers,
      and(
        eq(legalActIdentifiers.actId, legalActs.id),
        eq(legalActIdentifiers.scheme, "lexfind_id"),
        isNull(legalActIdentifiers.supersededAt),
      ),
    );
  const byAct = new Map<string, KnownAct>();
  const byLexfind = new Map<string, KnownAct>();
  for (const row of acts) {
    const known: KnownAct = {
      actId: row.actId,
      kind: row.kind,
      inForce: row.inForce,
      title: undefined,
      nameId: "",
      number: undefined,
      numberRowId: undefined,
    };
    byAct.set(row.actId, known);
    byLexfind.set(row.lexfindId, known);
  }
  const names = await db
    .select({ id: legalActNames.id, actId: legalActNames.actId, text: legalActNames.text })
    .from(legalActNames)
    .where(and(eq(legalActNames.kind, "title"), isNull(legalActNames.supersededAt)));
  for (const name of names) {
    const known = byAct.get(name.actId);
    if (known) {
      known.title = name.text;
      known.nameId = name.id;
    }
  }
  const numbers = await db
    .select({
      id: legalActIdentifiers.id,
      actId: legalActIdentifiers.actId,
      value: legalActIdentifiers.value,
    })
    .from(legalActIdentifiers)
    .where(
      and(
        eq(legalActIdentifiers.scheme, "systematic_number"),
        isNull(legalActIdentifiers.supersededAt),
      ),
    );
  for (const number of numbers) {
    const known = byAct.get(number.actId);
    if (known) {
      known.number = number.value;
      known.numberRowId = number.id;
    }
  }
  return byLexfind;
}

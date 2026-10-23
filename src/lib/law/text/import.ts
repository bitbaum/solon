/**
 * Loads the Confederation's consolidated text into the register (design L1).
 *
 * For each act the register lists, the version in force on a day is read from
 * Fedlex, kept under its sha256, and split into articles. Safe to rerun and to
 * stop: an act whose version is already held is not fetched again, so a run
 * limited to N acts simply continues where the last one stopped.
 *
 * Nothing is deleted. When a newer version of an act appears, the held one is
 * closed the day before it takes over and the new one becomes current.
 */
import { and, eq, isNull } from "drizzle-orm";
import { FEDLEX } from "@/lib/config/law";
import type { Database } from "@/lib/db/client";
import {
  legalActIdentifiers,
  legalActs,
  legalActVersions,
  legalProvisions,
} from "@/lib/db/law-schema";
import { sources } from "@/lib/db/places-schema";
import { sha256Hex, type SnapshotStore } from "@/lib/places/importer/snapshots";
import { fetchHtml, listVersionsOn, parseProvisions, type FedlexVersion } from "./fedlex";

export const TEXT_IMPORTER_VERSION = "law-text-fedlex-1";
const CHUNK = 500;

export interface TextOptions {
  lang: string;
  /** The day whose versions are loaded (ISO). */
  day: string;
  snapshots: SnapshotStore;
  /** At most this many versions are stored in this run. */
  limit?: number;
  dryRun?: boolean;
  fetchImpl?: typeof fetch;
  /** Pause between fetches of the file store. */
  pauseMs?: number;
  onProgress?: (message: string) => void;
}

export interface TextReport {
  status: "applied" | "dry_run" | "failed";
  /** Versions Fedlex lists for the day. */
  listed: number;
  /** Listed versions whose act the register does not hold. */
  notInRegister: string[];
  /** Numbers that more than one act of the publisher carries: not guessed, left alone. */
  ambiguous: string[];
  /** Acts whose listed version is already held. */
  alreadyHeld: number;
  /** Versions fetched and stored in this run. */
  stored: number;
  provisions: number;
  /** Versions left for a later run because of the limit. */
  remaining: number;
  failures: { sr: string; reason: string }[];
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const dayBefore = (iso: string): string => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

/** Register acts of the authority, by their systematic number. */
async function actsBySr(db: Database): Promise<Map<string, string>> {
  const rows = await db
    .select({ actId: legalActs.id, sr: legalActIdentifiers.value })
    .from(legalActs)
    .innerJoin(
      legalActIdentifiers,
      and(
        eq(legalActIdentifiers.actId, legalActs.id),
        eq(legalActIdentifiers.scheme, "systematic_number"),
        isNull(legalActIdentifiers.supersededAt),
      ),
    )
    .where(eq(legalActs.authority, FEDLEX.authority));
  return new Map(rows.map((row) => [row.sr, row.actId]));
}

export async function importFedlexText(db: Database, options: TextOptions): Promise<TextReport> {
  const { lang, day, snapshots, dryRun = false, limit = Infinity, pauseMs = 700 } = options;
  const doFetch = options.fetchImpl ?? fetch;
  const say = options.onProgress ?? (() => undefined);
  const report: TextReport = {
    status: "applied",
    listed: 0,
    notInRegister: [],
    ambiguous: [],
    alreadyHeld: 0,
    stored: 0,
    provisions: 0,
    remaining: 0,
    failures: [],
  };
  const listed = await listVersionsOn(day, lang, doFetch);
  report.listed = listed.length;
  const acts = await actsBySr(db);

  const held = await db
    .select({ actId: legalActVersions.actId, from: legalActVersions.inForceFrom })
    .from(legalActVersions)
    .where(and(eq(legalActVersions.lang, lang), isNull(legalActVersions.inForceTo)));
  const heldFrom = new Map(held.map((row) => [row.actId, row.from]));

  const elis = new Map<string, Set<string>>();
  for (const version of listed) {
    elis.set(version.sr, (elis.get(version.sr) ?? new Set()).add(version.eli));
  }
  const todo: { version: FedlexVersion; actId: string }[] = [];
  for (const version of listed) {
    if ((elis.get(version.sr)?.size ?? 0) > 1) {
      if (!report.ambiguous.includes(version.sr)) report.ambiguous.push(version.sr);
      continue;
    }
    const actId = acts.get(version.sr);
    if (!actId) {
      report.notInRegister.push(version.sr);
      continue;
    }
    const current = heldFrom.get(actId);
    if (current && current >= version.date) {
      report.alreadyHeld++;
      continue;
    }
    todo.push({ version, actId });
  }
  todo.sort((a, b) => a.version.sr.localeCompare(b.version.sr, "en", { numeric: true }));
  let attempted = 0;

  for (const { version, actId } of todo) {
    // The limit counts versions stored: an act that keeps failing must not use it up.
    if (report.stored >= limit) break;
    attempted++;
    try {
      const bytes = await fetchHtml(version.url, doFetch);
      const html = new TextDecoder().decode(bytes);
      const provisions = parseProvisions(html);
      if (provisions.length === 0) {
        throw new Error("no articles found in the page");
      }
      const sha = sha256Hex(bytes);
      const snapshotKey = dryRun ? `dry/${sha}` : await snapshots.put(sha, bytes);
      if (!dryRun) {
        await db.transaction(async (tx) => {
          const [source] = await tx
            .insert(sources)
            .values({
              sourceKey: FEDLEX.key,
              retrievedAt: new Date(),
              url: version.url,
              contentSha256: sha,
              snapshotKey,
              importerVersion: TEXT_IMPORTER_VERSION,
              licenceSpdx: FEDLEX.licenceSpdx,
            })
            .returning({ id: sources.id });
          // Close the version this one replaces before the new one becomes current.
          await tx
            .update(legalActVersions)
            .set({ inForceTo: dayBefore(version.date) })
            .where(
              and(
                eq(legalActVersions.actId, actId),
                eq(legalActVersions.lang, lang),
                isNull(legalActVersions.inForceTo),
              ),
            );
          const [row] = await tx
            .insert(legalActVersions)
            .values({
              actId,
              lang,
              inForceFrom: version.date,
              status: FEDLEX.textStatus,
              format: "html",
              sourceId: source!.id,
            })
            .returning({ id: legalActVersions.id });
          for (let i = 0; i < provisions.length; i += CHUNK) {
            await tx.insert(legalProvisions).values(
              provisions.slice(i, i + CHUNK).map((p, j) => ({
                versionId: row!.id,
                path: p.path,
                heading: p.heading,
                text: p.text,
                ord: i + j,
              })),
            );
          }
          const known = await tx
            .select({ id: legalActIdentifiers.id })
            .from(legalActIdentifiers)
            .where(
              and(
                eq(legalActIdentifiers.actId, actId),
                eq(legalActIdentifiers.scheme, "ch_eli"),
                isNull(legalActIdentifiers.supersededAt),
              ),
            );
          if (known.length === 0) {
            await tx
              .insert(legalActIdentifiers)
              .values({ actId, scheme: "ch_eli", value: version.eli, sourceId: source!.id });
          }
        });
      }
      report.stored++;
      report.provisions += provisions.length;
      say(`${version.sr} ${version.date}: ${provisions.length} articles`);
    } catch (error) {
      report.failures.push({
        sr: version.sr,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
    await sleep(pauseMs);
  }
  report.remaining = todo.length - attempted;
  if (dryRun) report.status = "dry_run";
  return report;
}

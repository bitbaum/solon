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
import { legalActIdentifiers, legalActs, legalActVersions } from "@/lib/db/law-schema";
import type { SnapshotStore } from "@/lib/places/importer/snapshots";
import { storeVersion } from "./store";
import { fetchHtml, listVersionsOn, parseProvisions, type FedlexVersion } from "./fedlex";

export const TEXT_IMPORTER_VERSION = "law-text-fedlex-1";

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
      await storeVersion(
        db,
        snapshots,
        {
          actId,
          lang,
          inForceFrom: version.date,
          dateBasis: "publisher",
          status: FEDLEX.textStatus,
          format: "html",
          bytes,
          url: version.url,
          provisions,
          source: {
            key: FEDLEX.key,
            licenceSpdx: FEDLEX.licenceSpdx,
            importerVersion: TEXT_IMPORTER_VERSION,
          },
          identifier: { scheme: "ch_eli", value: version.eli },
        },
        dryRun,
      );
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

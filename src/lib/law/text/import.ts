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
import { and, eq, inArray, isNull } from "drizzle-orm";
import { FEDLEX } from "@/lib/config/law";
import type { Database } from "@/lib/db/client";
import { legalActIdentifiers, legalActs, legalActVersions } from "@/lib/db/law-schema";
import type { SnapshotStore } from "@/lib/places/importer/snapshots";
import { importRegister, type ActRow } from "../register/import";
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
  /** Acts Fedlex lists that the register lacked, registered from Fedlex's own list in this run. */
  registered: string[];
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

/** An act's Fedlex address without site or language: "eli/cc/2025/162", from either form of it. */
export const eliPath = (url: string): string | null =>
  /\/(eli\/cc\/.+?)(?:\/(?:de|fr|it))?$/.exec(url)?.[1] ?? null;

/** Register acts of the authority, by the Fedlex address of their own page. */
async function actsByEli(db: Database): Promise<Map<string, string>> {
  const rows = await db
    .select({ actId: legalActs.id, url: legalActIdentifiers.value })
    .from(legalActs)
    .innerJoin(
      legalActIdentifiers,
      and(
        eq(legalActIdentifiers.actId, legalActs.id),
        inArray(legalActIdentifiers.scheme, ["official_url", "ch_eli"]),
        isNull(legalActIdentifiers.supersededAt),
      ),
    )
    .where(eq(legalActs.authority, FEDLEX.authority));
  const out = new Map<string, string>();
  for (const row of rows) {
    const path = eliPath(row.url);
    if (path) out.set(path, row.actId);
  }
  return out;
}

export async function importFedlexText(db: Database, options: TextOptions): Promise<TextReport> {
  const { lang, day, snapshots, dryRun = false, limit = Infinity, pauseMs = 700 } = options;
  const doFetch = options.fetchImpl ?? fetch;
  const say = options.onProgress ?? (() => undefined);
  const report: TextReport = {
    status: "applied",
    listed: 0,
    notInRegister: [],
    registered: [],
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
  const byEli = await actsByEli(db);
  const withPage = new Set(byEli.values());

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
  /** Versions of acts Fedlex lists and the register lacks. */
  const missing: FedlexVersion[] = [];
  for (const version of listed) {
    let actId: string | undefined;
    if ((elis.get(version.sr)?.size ?? 0) > 1) {
      // Two acts carry this number: each is told by the address of its own page, never guessed.
      const path = eliPath(version.eli);
      actId = path ? byEli.get(path) : undefined;
      if (!actId) {
        const registered = acts.get(version.sr);
        if (!registered) {
          // No act of this number is registered at all: each of them is registered from Fedlex's list.
          report.notInRegister.push(`${version.sr} (${path ?? version.eli})`);
          missing.push(version);
        } else if (withPage.has(registered)) {
          // The register's act has its own page, and this is another act of the same number.
          report.notInRegister.push(`${version.sr} (${path ?? version.eli})`);
          missing.push(version);
        } else if (!report.ambiguous.includes(version.sr)) {
          report.ambiguous.push(version.sr);
        }
        continue;
      }
    } else {
      actId = acts.get(version.sr);
    }
    if (!actId) {
      report.notInRegister.push(version.sr);
      missing.push(version);
      continue;
    }
    const current = heldFrom.get(actId);
    if (current && current >= version.date) {
      report.alreadyHeld++;
      continue;
    }
    todo.push({ version, actId });
  }
  // An act Fedlex lists and the register lacks is registered from Fedlex's own list, then read.
  if (missing.length > 0 && !dryRun) {
    const rows: ActRow[] = missing.map((v) => ({
      authority: FEDLEX.authority,
      kind: v.sr.startsWith("0.") ? "treaty" : "other",
      inForce: true,
      title: v.title ?? `SR ${v.sr}`,
      locale: lang,
      identity: { scheme: "ch_eli", value: v.eli },
      systematicNumber: v.sr,
      more: [
        { scheme: "official_url", value: `https://www.fedlex.admin.ch/${eliPath(v.eli)}/${lang}` },
      ],
    }));
    await importRegister(db, {
      register: {
        key: `${FEDLEX.key}-list`,
        licenceSpdx: FEDLEX.licenceSpdx,
        identityScheme: "ch_eli",
      },
      read: () => ({ rows, skipped: [] }),
      bytes: new TextEncoder().encode(JSON.stringify(missing)),
      url: "https://fedlex.data.admin.ch/sparqlendpoint",
      retrievedAt: new Date(),
      snapshots,
    });
    const fresh = await actsByEli(db);
    for (const v of missing) {
      const id = fresh.get(eliPath(v.eli) ?? "");
      if (!id) continue;
      report.registered.push(v.sr);
      todo.push({ version: v, actId: id });
    }
    report.notInRegister = report.notInRegister.filter(
      (entry) => !report.registered.some((sr) => entry === sr || entry.startsWith(`${sr} (`)),
    );
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

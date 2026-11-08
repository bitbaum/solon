/**
 * Loads Austria's consolidated federal law (RIS in src/lib/config/law): every act
 * the RIS's OGD API lists in force, as acts of the authority `at` named by
 * Gesetzesnummer and titled in German (Kurztitel), and each act's whole
 * consolidated text from the RIS, cut into its sections, articles and annexes.
 * Safe to rerun and to stop: an act whose text was read after the RIS last changed
 * it is not read again, so a run limited to N continues where the last one
 * stopped; a text with a newer day closes the one before it. Each version is dated
 * by the publisher: the latest day a section of the act took effect, on or before
 * the day of the run. When the API gives no such day the reading is dated by the
 * day it was made, and says so.
 *
 * The text is read through the shared polite reader, so a refusal (403, 429, a
 * bot check) is answered from the Internet Archive's copy, and the copy's address
 * is what the version records. The API is asked politely: a page of a hundred
 * acts at a time, a pause after each question, a longer one after a 429.
 */
import { and, eq, isNull } from "drizzle-orm";
import { RIS } from "@/lib/config/law";
import type { Database } from "@/lib/db/client";
import { legalActIdentifiers, legalActVersions, legalActs } from "@/lib/db/law-schema";
import { sources } from "@/lib/db/places-schema";
import type { SnapshotStore } from "@/lib/places/importer/snapshots";
import { read } from "../publishers/http";
import { importRegister, type ActRow } from "../register/import";
import { reasonOf } from "./import-riigiteataja";
import { storeVersion } from "./store";
import {
  inForceFromOf,
  isActPage,
  listInForce,
  parseRisHtml,
  typeWordOf,
  type RisAct,
} from "./ris";

export const RIS_IMPORTER_VERSION = "law-text-ris-1";

export interface RisOptions {
  snapshots: SnapshotStore;
  limit?: number;
  dryRun?: boolean;
  today?: string;
  /** Read only these acts' texts, by Gesetzesnummer (a check of the reader on chosen acts). */
  only?: readonly string[];
  fetchImpl?: typeof fetch;
  pauseMs?: number;
  /** How long the shared reader waits before asking the archive again; tests pass none. */
  archiveRetryMs?: readonly number[];
  onProgress?: (message: string) => void;
}

export interface RisReport {
  status: "applied" | "dry_run";
  /** Acts the API lists in force. */
  acts: number;
  /** What the API said it matched, so a trial run's partial list is plain. */
  hits: number;
  /** Documents left out of the register, with why (no title, ended). */
  skipped: number;
  alreadyHeld: number;
  /** Acts whose text was read and held a version no newer than the one held. */
  unchanged: number;
  /** Versions stored; in a dry run, texts read and cut without storing. */
  stored: number;
  /** Of those stored, how many are dated by the day they were read, not by the publisher. */
  datedByReading: number;
  /** Of those stored, how many from the Internet Archive's copy because the RIS refused. */
  fromArchive: number;
  provisions: number;
  remaining: number;
  /** The RIS's own types of the acts listed (`Typ`, by first word), counted: what the live register holds. */
  typeCounts: Record<string, number>;
  /** Of those, the types that gave no kind but "other", by first word: what the config does not yet know. */
  unmappedTypes: Record<string, number>;
  failures: { act: string; reason: string }[];
  failureReasons: Record<string, number>;
  /** Set when the run stopped early because the publisher kept refusing: its last answer. */
  stoppedBecause?: string;
}

/** After this many refusals in a row the RIS is not answering; stop rather than ask thousands more times. */
const REFUSALS_BEFORE_STOP = 20;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function importRis(db: Database, options: RisOptions): Promise<RisReport> {
  const { snapshots, dryRun = false, limit = Infinity, pauseMs = 1500 } = options;
  const doFetch = options.fetchImpl ?? fetch;
  const say = options.onProgress ?? (() => undefined);
  const today = options.today ?? new Date().toISOString().slice(0, 10);
  const report: RisReport = {
    status: dryRun ? "dry_run" : "applied",
    acts: 0,
    hits: 0,
    skipped: 0,
    alreadyHeld: 0,
    unchanged: 0,
    stored: 0,
    datedByReading: 0,
    fromArchive: 0,
    provisions: 0,
    remaining: 0,
    typeCounts: {},
    unmappedTypes: {},
    failures: [],
    failureReasons: {},
  };

  const listed = await listInForce(doFetch, {
    today,
    pauseMs: Math.min(pauseMs, 1000),
    // A trial run reads `limit` texts: it needs a few more acts than that, not the whole register.
    stopAfter: dryRun && Number.isFinite(limit) && !options.only ? limit * 2 : undefined,
    onPage: (page, acts, hits) => {
      if (page % 10 === 1) say(`register page ${page}: ${acts} acts listed of ${hits} documents`);
    },
  });
  const acts = listed.acts;
  report.acts = acts.length;
  report.hits = listed.hits;
  report.skipped = listed.skipped.length;
  for (const act of acts) {
    const typ = act.typ ? typeWordOf(act.typ) : "none";
    report.typeCounts[typ] = (report.typeCounts[typ] ?? 0) + 1;
    if (act.kind === "other") report.unmappedTypes[typ] = (report.unmappedTypes[typ] ?? 0) + 1;
  }
  const rows: ActRow[] = acts.map((act) => ({
    authority: RIS.authority,
    kind: act.kind,
    inForce: true,
    title: act.title,
    locale: RIS.locale,
    identity: { scheme: "at_gesetzesnummer", value: act.gesetzesnummer },
    systematicNumber: null,
    more: [
      { scheme: "official_url", value: act.textUrl },
      ...(act.nor ? [{ scheme: "at_nor", value: act.nor }] : []),
    ],
  }));
  await importRegister(db, {
    register: {
      key: `${RIS.key}-register`,
      licenceSpdx: RIS.licenceSpdx,
      identityScheme: "at_gesetzesnummer",
    },
    read: () => ({
      rows,
      skipped: listed.skipped.map((s) => ({ row: s.act, reason: s.reason })),
    }),
    bytes: new TextEncoder().encode(JSON.stringify(acts)),
    url: RIS.api,
    retrievedAt: new Date(),
    snapshots,
    dryRun,
  });
  const known = new Map(
    (
      await db
        .select({ number: legalActIdentifiers.value, actId: legalActs.id })
        .from(legalActs)
        .innerJoin(
          legalActIdentifiers,
          and(
            eq(legalActIdentifiers.actId, legalActs.id),
            eq(legalActIdentifiers.scheme, "at_gesetzesnummer"),
            isNull(legalActIdentifiers.supersededAt),
          ),
        )
        .where(eq(legalActs.authority, RIS.authority))
    ).map((row) => [row.number, row.actId]),
  );
  const held = new Map(
    (
      await db
        .select({
          actId: legalActVersions.actId,
          from: legalActVersions.inForceFrom,
          readAt: sources.retrievedAt,
        })
        .from(legalActVersions)
        .innerJoin(legalActs, eq(legalActs.id, legalActVersions.actId))
        .innerJoin(sources, eq(sources.id, legalActVersions.sourceId))
        .where(
          and(
            eq(legalActs.authority, RIS.authority),
            eq(legalActVersions.lang, RIS.locale),
            isNull(legalActVersions.inForceTo),
          ),
        )
    ).map((row) => [
      row.actId,
      { from: String(row.from), readOn: row.readAt.toISOString().slice(0, 10) },
    ]),
  );

  const todo = acts.filter((act) => {
    if (options.only && !options.only.includes(act.gesetzesnummer)) return false;
    const actId = known.get(act.gesetzesnummer);
    const current = actId ? held.get(actId) : undefined;
    // Read after the RIS last changed the act's document: nothing new to read.
    if (current && (!act.changed || current.readOn >= act.changed)) {
      report.alreadyHeld++;
      return false;
    }
    // A dry run reads and cuts the texts too, so it checks the reader against the live pages; it stores nothing.
    return dryRun || Boolean(actId);
  });
  let attempted = 0;
  let refusedInARow = 0;
  for (const act of todo) {
    if (report.stored >= limit) break;
    if (refusedInARow >= REFUSALS_BEFORE_STOP) {
      report.stoppedBecause = report.failures.at(-1)?.reason;
      break;
    }
    attempted++;
    try {
      const actId = known.get(act.gesetzesnummer) ?? "";
      const stored = await storeAct(db, snapshots, act, actId, held.get(actId)?.from, today, {
        doFetch,
        options,
        pauseMs,
      });
      if (stored.unchanged) {
        report.unchanged++;
      } else {
        report.stored++;
        report.provisions += stored.provisions;
        if (stored.byReading) report.datedByReading++;
        if (stored.fromArchive) report.fromArchive++;
        say(
          `${act.gesetzesnummer} ${stored.from}: ${stored.provisions} provisions (${stored.paths}) · ${act.kind} · ${act.title.slice(0, 50)}`,
        );
      }
      refusedInARow = 0;
    } catch (error) {
      const reason = reasonOf(error);
      report.failures.push({ act: act.gesetzesnummer, reason });
      const kind = reason
        .replace(/https?:\/\/\S+/g, "URL")
        .replace(/\d+/g, "N")
        .slice(0, 120);
      report.failureReasons[kind] = (report.failureReasons[kind] ?? 0) + 1;
      refusedInARow =
        /^\d{3} for|no answer|Internet Archive|not an act's page|RIS answered \d+/.test(reason)
          ? refusedInARow + 1
          : 0;
    }
    await sleep(pauseMs);
  }
  report.remaining = todo.length - attempted;
  return report;
}

async function storeAct(
  db: Database,
  snapshots: SnapshotStore,
  act: RisAct,
  actId: string,
  heldFrom: string | undefined,
  today: string,
  context: { doFetch: typeof fetch; options: RisOptions; pauseMs: number },
): Promise<{
  provisions: number;
  fromArchive: boolean;
  byReading: boolean;
  unchanged: boolean;
  from: string;
  /** The first anchors and the annexes, for the log: what the cut made of the page. */
  paths: string;
}> {
  const { doFetch, options, pauseMs } = context;
  // The day the text in force began, as the publisher dates it; failing that, the day it was read.
  const dated = await inForceFromOf(act.gesetzesnummer, today, doFetch, pauseMs > 0 ? 3000 : 0);
  const from = dated ?? today;
  if (heldFrom && dated && heldFrom >= dated) {
    return {
      provisions: 0,
      fromArchive: false,
      byReading: false,
      unchanged: true,
      from,
      paths: "",
    };
  }
  await sleep(Math.min(pauseMs, 1000));
  const page = await read(act.textUrl, doFetch, RIS.hosts, options.archiveRetryMs);
  const html = new TextDecoder().decode(page.bytes);
  if (!isActPage(html)) throw new Error("not an act's page");
  const provisions = parseRisHtml(html);
  if (provisions.length === 0) throw new Error("no text in the page");
  await storeVersion(
    db,
    snapshots,
    {
      actId,
      lang: RIS.locale,
      inForceFrom: from,
      dateBasis: dated ? "publisher" : "retrieved",
      // Only the Bundesgesetzblatt is authentic; the RIS's consolidated text is a reading of it.
      status: RIS.textStatus,
      format: "html",
      bytes: page.bytes,
      url: page.url,
      provisions,
      source: {
        key: RIS.key,
        licenceSpdx: RIS.licenceSpdx,
        importerVersion: RIS_IMPORTER_VERSION,
      },
    },
    options.dryRun ?? false,
  );
  return {
    provisions: provisions.length,
    fromArchive: page.copy !== null,
    byReading: !dated,
    unchanged: false,
    from,
    paths: pathsOf(provisions),
  };
}

/** "§ 0, § 1, § 2 … § 1503, 4 Anlage": the cut in a line. */
function pathsOf(provisions: readonly { path: string }[]): string {
  const annexes = provisions.filter((p) => p.path.startsWith("Anlage")).length;
  const head = provisions.slice(0, 3).map((p) => p.path);
  const last = provisions.at(-1)?.path;
  return `${head.join(", ")}${provisions.length > 3 ? ` … ${last}` : ""}${annexes ? `, ${annexes} Anlage` : ""}`;
}

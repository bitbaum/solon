/**
 * Loads Germany's federal law from Gesetze im Internet (GII in
 * src/lib/config/law): every act in the portal's table of contents, as acts of
 * the authority `de` named by the portal's abbreviation (`gii_abbr`: `bgb`,
 * `gg`) and titled by their German long title, and each act's XML cut into
 * paragraphs, articles and annexes.
 *
 * The portal states no day for a version, so a version is dated by the day it
 * was read (`dateBasis: retrieved`). Every act is read again each week; its
 * cut text is compared with the text held, and a version is stored only when
 * they differ. A re-read that finds the text unchanged is noted on the
 * version's source (`retrieved_at` moves to that day), so a run limited to N
 * continues with the acts not read this week, and an interrupted load
 * continues where it stopped. Acts never read come first, then the longest
 * unread.
 *
 * Paced for a federal service: about a request a second. The portal is read
 * through the shared polite reader, so a refusal is answered from the
 * Internet Archive's copy, and the copy's address is what the version records.
 * After 20 refusals in a row the run stops.
 */
import { and, asc, eq, isNull } from "drizzle-orm";
import { GII } from "@/lib/config/law";
import type { Database } from "@/lib/db/client";
import {
  legalActIdentifiers,
  legalActVersions,
  legalActs,
  legalProvisions,
} from "@/lib/db/law-schema";
import { sources } from "@/lib/db/places-schema";
import { sha256Hex, type SnapshotStore } from "@/lib/places/importer/snapshots";
import { read } from "../publishers/http";
import { importRegister, type ActRow } from "../register/import";
import type { Provision } from "./fedlex";
import {
  isGiiXml,
  isToc,
  isZip,
  pageUrlOf,
  parseGiiXml,
  parseToc,
  xmlOfZip,
  zipUrlOf,
  type GiiAct,
} from "./gii";
import { reasonOf } from "./import-riigiteataja";
import { storeVersion } from "./store";

export const GII_IMPORTER_VERSION = "law-text-gii-1";

export interface GiiOptions {
  snapshots: SnapshotStore;
  limit?: number;
  dryRun?: boolean;
  today?: string;
  /** Read only these acts, by abbreviation (`bgb`); every act when unset. */
  only?: readonly string[];
  /** Read every act again, even one read this week. */
  again?: boolean;
  fetchImpl?: typeof fetch;
  pauseMs?: number;
  /** How long the shared reader waits before asking the archive again; tests pass none. */
  archiveRetryMs?: readonly number[];
  onProgress?: (message: string) => void;
}

export interface GiiReport {
  status: "applied" | "dry_run";
  /** Acts the table of contents lists. */
  acts: number;
  /** Entries of the table of contents that were left out, with why. */
  skipped: number;
  /** How many acts of each kind the titles gave. */
  kinds: Record<string, number>;
  /** Acts read this week, left alone. */
  alreadyHeld: number;
  /** Acts read again whose text is the text held. */
  unchanged: number;
  /** Versions stored; in a dry run, acts read and cut without storing. */
  stored: number;
  /** Of those stored, how many were the first version of the act. */
  firstVersions: number;
  /** Of those stored, how many from the Internet Archive's copy because the portal refused. */
  fromArchive: number;
  provisions: number;
  remaining: number;
  /** A few acts read, for a dry run to show: abbreviation, kind, title, provisions. */
  sample: { abbr: string; kind: string; title: string; provisions: number }[];
  failures: { act: string; reason: string }[];
  failureReasons: Record<string, number>;
  /** Set when the run stopped early because the portal kept refusing: its last answer. */
  stoppedBecause?: string;
}

/** After this many refusals in a row the portal is not answering; stop rather than ask thousands more times. */
const REFUSALS_BEFORE_STOP = 20;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const DAY_MS = 86_400_000;

/** A hash of what an act says: its provisions' paths, headings and texts, not the bytes they came in. */
export function contentHash(provisions: readonly Provision[]): string {
  return sha256Hex(
    new TextEncoder().encode(
      JSON.stringify(provisions.map((p) => [p.path, p.heading, p.text] as const)),
    ),
  );
}

export async function importGii(db: Database, options: GiiOptions): Promise<GiiReport> {
  const { snapshots, dryRun = false, limit = Infinity, pauseMs = GII.pauseMs } = options;
  const doFetch = options.fetchImpl ?? fetch;
  const say = options.onProgress ?? (() => undefined);
  const today = options.today ?? new Date().toISOString().slice(0, 10);
  const report: GiiReport = {
    status: dryRun ? "dry_run" : "applied",
    acts: 0,
    skipped: 0,
    kinds: {},
    alreadyHeld: 0,
    unchanged: 0,
    stored: 0,
    firstVersions: 0,
    fromArchive: 0,
    provisions: 0,
    remaining: 0,
    sample: [],
    failures: [],
    failureReasons: {},
  };

  const toc = await read(GII.tocUrl, doFetch, GII.hosts, options.archiveRetryMs);
  const tocXml = new TextDecoder().decode(toc.bytes);
  if (!isToc(tocXml)) throw new Error("not the portal's table of contents");
  const listed = parseToc(tocXml);
  const acts = listed.acts;
  report.acts = acts.length;
  report.skipped = listed.skipped.length;
  for (const act of acts) report.kinds[act.kind] = (report.kinds[act.kind] ?? 0) + 1;
  say(`register: ${acts.length} acts in force, ${listed.skipped.length} entries left out`);

  const rows: ActRow[] = acts.map((act) => ({
    authority: GII.authority,
    kind: act.kind,
    inForce: true,
    title: act.title,
    locale: GII.locale,
    identity: { scheme: "gii_abbr", value: act.abbr },
    systematicNumber: null,
    more: [{ scheme: "official_url", value: pageUrlOf(act.abbr) }],
  }));
  const register = await importRegister(db, {
    register: {
      key: `${GII.key}-register`,
      licenceSpdx: GII.licenceSpdx,
      identityScheme: "gii_abbr",
    },
    read: () => ({
      rows,
      skipped: listed.skipped,
    }),
    bytes: toc.bytes,
    url: toc.url,
    retrievedAt: new Date(),
    snapshots,
    dryRun,
  });
  if (register.status === "failed") throw new Error(`register: ${register.problems.join("; ")}`);

  const known = new Map(
    (
      await db
        .select({ abbr: legalActIdentifiers.value, actId: legalActs.id })
        .from(legalActs)
        .innerJoin(
          legalActIdentifiers,
          and(
            eq(legalActIdentifiers.actId, legalActs.id),
            eq(legalActIdentifiers.scheme, "gii_abbr"),
            isNull(legalActIdentifiers.supersededAt),
          ),
        )
        .where(eq(legalActs.authority, GII.authority))
    ).map((row) => [row.abbr, row.actId]),
  );
  /** The version in force of each act held, and when its source was last read. */
  const held = new Map(
    (
      await db
        .select({
          actId: legalActVersions.actId,
          versionId: legalActVersions.id,
          sourceId: sources.id,
          readAt: sources.retrievedAt,
        })
        .from(legalActVersions)
        .innerJoin(sources, eq(sources.id, legalActVersions.sourceId))
        .innerJoin(legalActs, eq(legalActs.id, legalActVersions.actId))
        .where(
          and(
            eq(legalActs.authority, GII.authority),
            eq(legalActVersions.lang, GII.locale),
            isNull(legalActVersions.inForceTo),
          ),
        )
    ).map((row) => [row.actId, row] as const),
  );

  const only = options.only?.length ? new Set(options.only) : null;
  const freshAfter = Date.now() - GII.freshDays * DAY_MS;
  const todo = acts
    .filter((act) => !only || only.has(act.abbr))
    .filter((act) => {
      const actId = known.get(act.abbr);
      const current = actId ? held.get(actId) : undefined;
      if (!options.again && current && current.readAt.getTime() > freshAfter) {
        report.alreadyHeld++;
        return false;
      }
      // A dry run reads and cuts the texts too, so it checks the reader against the live portal; it stores nothing.
      return dryRun || Boolean(actId);
    })
    // Never read first, then the longest unread; the table's order within each.
    .map((act, i) => ({ act, i, at: held.get(known.get(act.abbr) ?? "")?.readAt.getTime() ?? 0 }))
    .sort((a, b) => a.at - b.at || a.i - b.i)
    .map((x) => x.act);

  let attempted = 0;
  let refusedInARow = 0;
  for (const act of todo) {
    if (report.stored + report.unchanged >= limit) break;
    if (refusedInARow >= REFUSALS_BEFORE_STOP) {
      report.stoppedBecause = report.failures.at(-1)?.reason;
      break;
    }
    attempted++;
    try {
      const done = await readAct(db, snapshots, act, known.get(act.abbr), held, today, options);
      refusedInARow = 0;
      if (done.unchanged) {
        report.unchanged++;
      } else {
        report.stored++;
        report.provisions += done.provisions;
        if (done.first) report.firstVersions++;
        if (done.fromArchive) report.fromArchive++;
      }
      if (report.sample.length < 8) {
        report.sample.push({
          abbr: act.abbr,
          kind: act.kind,
          title: act.title.slice(0, 90),
          provisions: done.provisions,
        });
      }
      say(
        `${act.abbr}: ${done.provisions} provisions${done.unchanged ? " (unchanged)" : ""} — ${act.title.slice(0, 60)}`,
      );
    } catch (error) {
      const reason = reasonOf(error);
      report.failures.push({ act: act.abbr, reason });
      const kind = reason
        .replace(/https?:\/\/\S+/g, "URL")
        .replace(/\d+/g, "N")
        .slice(0, 120);
      report.failureReasons[kind] = (report.failureReasons[kind] ?? 0) + 1;
      refusedInARow = /^\d{3} for|no answer|Internet Archive|not an act's zip/.test(reason)
        ? refusedInARow + 1
        : 0;
    }
    await sleep(pauseMs);
  }
  report.remaining = todo.length - attempted;
  return report;
}

interface Held {
  versionId: string;
  sourceId: string;
}

async function readAct(
  db: Database,
  snapshots: SnapshotStore,
  act: GiiAct,
  actId: string | undefined,
  held: ReadonlyMap<string, Held>,
  today: string,
  options: GiiOptions,
): Promise<{ provisions: number; unchanged: boolean; first: boolean; fromArchive: boolean }> {
  const doFetch = options.fetchImpl ?? fetch;
  const page = await read(zipUrlOf(act.abbr), doFetch, GII.hosts, options.archiveRetryMs);
  if (!isZip(page.bytes)) {
    const head = new TextDecoder().decode(page.bytes.subarray(0, 120)).replace(/\s+/g, " ");
    throw new Error(`not an act's zip (began: ${head})`);
  }
  const bytes = xmlOfZip(page.bytes);
  const xml = new TextDecoder().decode(bytes);
  if (!isGiiXml(xml)) throw new Error("not an act's zip: no norms in its XML");
  const provisions = parseGiiXml(xml);
  if (provisions.length === 0) throw new Error("no text in the act's XML");
  const fromArchive = page.copy !== null;

  const current = actId ? held.get(actId) : undefined;
  if (current && !options.dryRun) {
    const before = await db
      .select({
        path: legalProvisions.path,
        heading: legalProvisions.heading,
        text: legalProvisions.text,
      })
      .from(legalProvisions)
      .where(eq(legalProvisions.versionId, current.versionId))
      .orderBy(asc(legalProvisions.ord));
    if (contentHash(before) === contentHash(provisions)) {
      // The text is what is held; the version's source was read again today.
      await db
        .update(sources)
        .set({ retrievedAt: new Date() })
        .where(eq(sources.id, current.sourceId));
      return { provisions: provisions.length, unchanged: true, first: false, fromArchive };
    }
  }
  await storeVersion(
    db,
    snapshots,
    {
      actId: actId ?? "",
      lang: GII.locale,
      // The portal states no day for a version: the day it was read stands in.
      inForceFrom: today,
      dateBasis: "retrieved",
      status: GII.textStatus,
      format: "xml",
      bytes,
      url: page.url,
      provisions,
      source: {
        key: GII.key,
        licenceSpdx: GII.licenceSpdx,
        importerVersion: fromArchive ? `${GII_IMPORTER_VERSION}+archive` : GII_IMPORTER_VERSION,
      },
    },
    options.dryRun ?? false,
  );
  return { provisions: provisions.length, unchanged: false, first: !current, fromArchive };
}

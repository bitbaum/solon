/**
 * Loads the United Kingdom's legislation from legislation.gov.uk (UKLEG in
 * src/lib/config/law): UK Public General Acts and UK Statutory Instruments, as
 * acts of the authority `uk` named by their address (`ukpga/2018/12`) and
 * titled in English, each with its current text cut into sections and
 * schedules. Safe to rerun and to stop: the run goes a type and a year at a
 * time, newest first, lists the year's items from the feed, registers them,
 * then reads the texts of those not yet held; a run limited to N stops after
 * N texts and continues where it stopped. An item whose feed entry says it
 * changed since the text held was read is read again, and a changed text
 * becomes a new version that closes the one before it.
 *
 * "In force": an item is in force until its text says every provision is
 * repealed or revoked (see ukleg.ts); then the act is marked out of force and
 * no text is stored for it, and a later register run keeps it out.
 *
 * Fair use (https://www.legislation.gov.uk/fair-use-policy): at most 1,500
 * requests per 5 minutes. This reader asks once a second (60 a minute, a fifth
 * of that), longer when robots.txt gives a crawl-delay, and stops after 20
 * refusals in a row. legislation.gov.uk is read through the shared polite
 * reader, so a refusal is answered from the Internet Archive's copy, whose
 * address the version then records.
 */
import { and, eq, inArray, isNull } from "drizzle-orm";
import { UKLEG } from "@/lib/config/law";
import type { Database } from "@/lib/db/client";
import { legalActIdentifiers, legalActVersions, legalActs } from "@/lib/db/law-schema";
import { sources } from "@/lib/db/places-schema";
import type { SnapshotStore } from "@/lib/places/importer/snapshots";
import { USER_AGENT, read } from "../publishers/http";
import { importRegister, type ActRow } from "../register/import";
import { reasonOf } from "./import-riigiteataja";
import { storeVersion } from "./store";
import {
  crawlDelayMs,
  listUrlOf,
  pageUrlOf,
  parseClml,
  parseFeed,
  xmlUrlOf,
  type UkAct,
} from "./ukleg";

export const UKLEG_IMPORTER_VERSION = "law-text-ukleg-1";

export interface UkLegOptions {
  snapshots: SnapshotStore;
  limit?: number;
  dryRun?: boolean;
  today?: string;
  /** Only these types (`ukpga`, `uksi`); every type in config when unset. */
  types?: readonly string[];
  /** Only these years; every year from the type's first to this one, newest first, when unset. */
  years?: readonly number[];
  fetchImpl?: typeof fetch;
  /** Milliseconds between requests; at least the crawl-delay robots.txt gives. */
  pauseMs?: number;
  /** How long the shared reader waits before asking the archive again; tests pass none. */
  archiveRetryMs?: readonly number[];
  onProgress?: (message: string) => void;
}

export interface UkLegReport {
  status: "applied" | "dry_run";
  /** Items the feeds listed. */
  acts: number;
  /** Feed entries left out, with why (no title, a type not read). */
  skipped: number;
  alreadyHeld: number;
  /** Versions stored; in a dry run, texts read and cut without storing. */
  stored: number;
  /** Of those stored, how many from the Internet Archive's copy because the site refused. */
  fromArchive: number;
  /** Items whose text says every provision is repealed or revoked: marked out of force, no text stored. */
  outOfForce: number;
  /** Provisions left out of stored texts because they are repealed, revoked or not yet in force. */
  omittedProvisions: number;
  /** How the stored versions' dates were found (see versionDateOf). */
  dateBasis: Record<string, number>;
  provisions: number;
  failures: { act: string; reason: string }[];
  failureReasons: Record<string, number>;
  /** Set when the run stopped early because the publisher kept refusing: its last answer. */
  stoppedBecause?: string;
  /** Years of each type the run listed (a type and a year each). */
  yearsListed: number;
  /** Items still to read in the years listed when the limit stopped the run. */
  remaining: number;
}

/** After this many refusals in a row legislation.gov.uk is not answering; stop rather than ask more. */
const REFUSALS_BEFORE_STOP = 20;
/** No type has more pages in a year than this; a feed that keeps going is not read further. */
const MAX_PAGES = 400;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const REFUSAL = /^\d{3} for|no answer|Internet Archive|not an act's page|not a feed|not CLML/;

export async function importUkLeg(db: Database, options: UkLegOptions): Promise<UkLegReport> {
  const { snapshots, dryRun = false, limit = Infinity } = options;
  const doFetch = options.fetchImpl ?? fetch;
  const say = options.onProgress ?? (() => undefined);
  const today = options.today ?? new Date().toISOString().slice(0, 10);
  const report: UkLegReport = {
    status: dryRun ? "dry_run" : "applied",
    acts: 0,
    skipped: 0,
    alreadyHeld: 0,
    stored: 0,
    fromArchive: 0,
    outOfForce: 0,
    omittedProvisions: 0,
    dateBasis: {},
    provisions: 0,
    failures: [],
    failureReasons: {},
    yearsListed: 0,
    remaining: 0,
  };

  let pauseMs = options.pauseMs ?? UKLEG.pauseMs;
  if (options.pauseMs === undefined) {
    // robots.txt may ask for more than we would; the fair use policy says to follow it.
    try {
      const robots = await doFetch(UKLEG.robotsUrl, {
        headers: { "user-agent": USER_AGENT },
        signal: AbortSignal.timeout(30_000),
      });
      const delay = robots.ok ? crawlDelayMs(await robots.text()) : null;
      if (delay !== null && delay > pauseMs) {
        pauseMs = delay;
        say(`robots.txt asks for ${delay / 1000} s between requests; honoured`);
      }
    } catch {
      // No robots.txt to read: the default pace stands.
    }
  }

  const fail = (act: string, reason: string) => {
    report.failures.push({ act, reason });
    const kind = reason
      .replace(/https?:\/\/\S+/g, "URL")
      .replace(/\d+/g, "N")
      .slice(0, 120);
    report.failureReasons[kind] = (report.failureReasons[kind] ?? 0) + 1;
  };
  let refusedInARow = 0;
  const refused = (reason: string) => {
    refusedInARow = REFUSAL.test(reason) ? refusedInARow + 1 : 0;
  };
  const stopped = () => {
    if (refusedInARow < REFUSALS_BEFORE_STOP) return false;
    report.stoppedBecause = report.failures.at(-1)?.reason;
    return true;
  };

  /** One year of one type, every page of the feed, politely paced. */
  async function listYear(type: string, year: number) {
    const acts: UkAct[] = [];
    const skipped: { row: string; reason: string }[] = [];
    const seen = new Set<string>();
    for (let page = 1; page <= MAX_PAGES; page++) {
      let feed;
      try {
        const got = await read(
          listUrlOf(type, year, page),
          doFetch,
          UKLEG.hosts,
          options.archiveRetryMs,
        );
        feed = parseFeed(new TextDecoder().decode(got.bytes));
      } catch (error) {
        const reason = reasonOf(error);
        // A year with no list (older years of a type) is an empty year, not a failure.
        if (/^404 for/.test(reason)) break;
        fail(`${type}/${year} page ${page}`, reason);
        refused(reason);
        break;
      }
      refusedInARow = 0;
      skipped.push(...feed.skipped);
      const fresh = feed.acts.filter((a) => !seen.has(a.path));
      for (const act of fresh) seen.add(act.path);
      acts.push(...fresh);
      await sleep(pauseMs);
      // A page that adds nothing new is the end, whatever the feed says.
      if (!feed.more || (feed.entries > 0 && fresh.length === 0 && feed.skipped.length === 0))
        break;
    }
    return { acts, skipped };
  }

  const types = (options.types ?? Object.keys(UKLEG.kinds)).filter((t) => t in UKLEG.kinds);
  const thisYear = Number(today.slice(0, 4));
  for (const type of types) {
    const first = UKLEG.firstYear[type] ?? 1801;
    const years =
      options.years ?? Array.from({ length: thisYear - first + 1 }, (_, i) => thisYear - i);
    for (const year of years) {
      if (report.stored >= limit || stopped()) break;
      const listed = await listYear(type, year);
      report.yearsListed++;
      report.acts += listed.acts.length;
      report.skipped += listed.skipped.length;
      if (listed.acts.length === 0) continue;
      say(`register ${type}/${year}: ${listed.acts.length} items`);
      await readYear(type, year, listed.acts);
    }
  }
  return report;

  /** Registers one year's items and reads the texts of those not yet held. */
  async function readYear(type: string, year: number, acts: UkAct[]) {
    const paths = acts.map((a) => a.path);
    const known = await actsHeld(db, paths);
    const rows: ActRow[] = acts.map((act) => ({
      authority: UKLEG.authority,
      kind: UKLEG.kinds[act.type] ?? "other",
      // In force until the text says otherwise; an act already found out of force stays so.
      inForce: !known.get(act.path)?.outOfForce,
      title: act.title,
      locale: UKLEG.locale,
      identity: { scheme: "uk_leg_id", value: act.path },
      systematicNumber: null,
      more: [{ scheme: "official_url", value: pageUrlOf(act.path) }],
    }));
    await importRegister(db, {
      register: {
        key: `${UKLEG.key}-register`,
        licenceSpdx: UKLEG.licenceSpdx,
        identityScheme: "uk_leg_id",
      },
      read: () => ({ rows, skipped: [] }),
      bytes: new TextEncoder().encode(JSON.stringify(acts)),
      url: listUrlOf(type, year, 1),
      retrievedAt: new Date(),
      snapshots,
      dryRun,
    });
    const registered = await actsHeld(db, paths);
    const todo = acts.filter((act) => {
      const held = registered.get(act.path);
      if (held?.outOfForce) return false;
      // Held, and the feed does not say it changed since it was read: not read again.
      if (held?.from && (!act.updated || act.updated <= held.retrieved)) {
        report.alreadyHeld++;
        return false;
      }
      // A dry run reads and cuts the texts too, so it checks the reader against the live pages.
      return dryRun || Boolean(held);
    });
    let attempted = 0;
    for (const act of todo) {
      if (report.stored >= limit || stopped()) break;
      attempted++;
      try {
        const held = registered.get(act.path);
        const stored = await storeAct(db, snapshots, act, held, today, doFetch, options);
        refusedInARow = 0;
        if (stored.unchanged) {
          report.alreadyHeld++;
        } else if (stored.outOfForce) {
          report.outOfForce++;
          say(`${act.path}: every provision repealed or revoked; out of force`);
        } else {
          report.stored++;
          report.provisions += stored.provisions;
          report.omittedProvisions += stored.omitted;
          report.dateBasis[stored.basis] = (report.dateBasis[stored.basis] ?? 0) + 1;
          if (stored.fromArchive) report.fromArchive++;
          say(`${act.path} ${stored.date}: ${stored.provisions} provisions`);
        }
      } catch (error) {
        const reason = reasonOf(error);
        fail(act.path, reason);
        refused(reason);
      }
      await sleep(pauseMs);
    }
    report.remaining += todo.length - attempted;
  }
}

interface Held {
  actId: string;
  outOfForce: boolean;
  /** The first day of the open version held, and the day it was read. */
  from: string | null;
  retrieved: string;
}

/** The acts of the authority among `paths`, with the version each holds open. */
async function actsHeld(db: Database, paths: readonly string[]): Promise<Map<string, Held>> {
  const out = new Map<string, Held>();
  for (let i = 0; i < paths.length; i += 1000) {
    const chunk = paths.slice(i, i + 1000);
    const acts = await db
      .select({
        path: legalActIdentifiers.value,
        actId: legalActs.id,
        inForce: legalActs.inForce,
      })
      .from(legalActs)
      .innerJoin(
        legalActIdentifiers,
        and(
          eq(legalActIdentifiers.actId, legalActs.id),
          eq(legalActIdentifiers.scheme, "uk_leg_id"),
          isNull(legalActIdentifiers.supersededAt),
        ),
      )
      .where(
        and(eq(legalActs.authority, UKLEG.authority), inArray(legalActIdentifiers.value, chunk)),
      );
    const versions =
      acts.length === 0
        ? []
        : await db
            .select({
              actId: legalActVersions.actId,
              from: legalActVersions.inForceFrom,
              retrieved: sources.retrievedAt,
            })
            .from(legalActVersions)
            .innerJoin(sources, eq(sources.id, legalActVersions.sourceId))
            .where(
              and(
                inArray(
                  legalActVersions.actId,
                  acts.map((a) => a.actId),
                ),
                eq(legalActVersions.lang, UKLEG.locale),
                isNull(legalActVersions.inForceTo),
              ),
            );
    const open = new Map(versions.map((v) => [v.actId, v]));
    for (const act of acts) {
      const v = open.get(act.actId);
      out.set(act.path, {
        actId: act.actId,
        outOfForce: !act.inForce,
        from: v ? String(v.from) : null,
        retrieved: v ? v.retrieved.toISOString().slice(0, 10) : "",
      });
    }
  }
  return out;
}

async function storeAct(
  db: Database,
  snapshots: SnapshotStore,
  act: UkAct,
  held: Held | undefined,
  today: string,
  doFetch: typeof fetch,
  options: UkLegOptions,
): Promise<{
  provisions: number;
  omitted: number;
  date: string;
  basis: string;
  fromArchive: boolean;
  outOfForce: boolean;
  /** The feed said the item changed, but the version it gives is the one held. */
  unchanged: boolean;
}> {
  const actId = held?.actId ?? "";
  const page = await read(xmlUrlOf(act.path), doFetch, UKLEG.hosts, options.archiveRetryMs);
  const parsed = parseClml(new TextDecoder().decode(page.bytes), today);
  const none = {
    provisions: 0,
    omitted: parsed.omitted,
    date: "",
    basis: "",
    fromArchive: false,
    outOfForce: false,
    unchanged: false,
  };
  if (parsed.outOfForce) {
    // Only a publisher can say an act ended, and this one has: every provision is gone.
    if (!options.dryRun && actId) {
      await db.update(legalActs).set({ inForce: false }).where(eq(legalActs.id, actId));
    }
    return { ...none, outOfForce: true };
  }
  if (parsed.provisions.length === 0) throw new Error("no text in the page");
  if (!parsed.version) throw new Error("no date in the page");
  // The publisher's date is the version's identity: the same day is the same version.
  if (held?.from && held.from >= parsed.version.date) return { ...none, unchanged: true };
  await storeVersion(
    db,
    snapshots,
    {
      actId,
      lang: UKLEG.locale,
      inForceFrom: parsed.version.date,
      dateBasis: "publisher",
      // The site's revised text is a reading of the enacted law, kept up to date by The National Archives.
      status: UKLEG.textStatus,
      format: "xml",
      bytes: page.bytes,
      url: page.url,
      provisions: parsed.provisions,
      source: {
        key: UKLEG.key,
        licenceSpdx: UKLEG.licenceSpdx,
        importerVersion: UKLEG_IMPORTER_VERSION,
      },
    },
    options.dryRun ?? false,
  );
  return {
    provisions: parsed.provisions.length,
    omitted: parsed.omitted,
    date: parsed.version.date,
    basis: parsed.version.basis,
    fromArchive: page.copy !== null,
    outOfForce: false,
    unchanged: false,
  };
}

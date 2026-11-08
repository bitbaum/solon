/**
 * Loads the European Union's legislation in force (EURLEX in
 * src/lib/config/law): every regulation and directive Cellar marks in force,
 * as acts of the authority `eu` named by CELEX number and titled in English,
 * and each act's text from EUR-Lex, cut into articles and annexes. Safe to
 * rerun and to stop: a version already held is not fetched again, so a run
 * limited to N continues where the last one stopped; a newer consolidated
 * version closes the one before it. Each version is dated by the day the
 * publisher states: the day in a consolidated version's CELEX number, or the
 * act's entry into force.
 *
 * EUR-Lex is read through the shared polite reader, so a refusal (403, 429,
 * a bot check) is answered from the Internet Archive's copy, and the copy's
 * address is what the version records.
 */
import { and, eq, isNull } from "drizzle-orm";
import { EURLEX } from "@/lib/config/law";
import type { Database } from "@/lib/db/client";
import { legalActIdentifiers, legalActVersions, legalActs } from "@/lib/db/law-schema";
import type { SnapshotStore } from "@/lib/places/importer/snapshots";
import { read } from "../publishers/http";
import { importRegister, type ActRow } from "../register/import";
import {
  htmlUrlOf,
  isActPage,
  listInForce,
  pageUrlOf,
  parseEurLexHtml,
  type EuAct,
} from "./eurlex";
import { reasonOf } from "./import-riigiteataja";
import { storeVersion } from "./store";

export const EURLEX_IMPORTER_VERSION = "law-text-eurlex-2";

export interface EurLexOptions {
  snapshots: SnapshotStore;
  limit?: number;
  dryRun?: boolean;
  today?: string;
  /** Read only these years of the register (CELEX years); every year when unset. */
  years?: readonly number[];
  fetchImpl?: typeof fetch;
  pauseMs?: number;
  /** How long the shared reader waits before asking the archive again; tests pass none. */
  archiveRetryMs?: readonly number[];
  onProgress?: (message: string) => void;
}

export interface EurLexReport {
  status: "applied" | "dry_run";
  acts: number;
  /** Acts the register lists that were left out, with why (no English title, no date). */
  skipped: number;
  alreadyHeld: number;
  /** Versions stored; in a dry run, versions read and cut without storing. */
  stored: number;
  /** Of those stored, how many from a consolidated version. */
  consolidated: number;
  /** Of those stored, how many from the Internet Archive's copy because EUR-Lex refused. */
  fromArchive: number;
  provisions: number;
  remaining: number;
  failures: { act: string; reason: string }[];
  failureReasons: Record<string, number>;
  /** Set when the run stopped early because the publisher kept refusing: its last answer. */
  stoppedBecause?: string;
}

/** After this many refusals in a row EUR-Lex is not answering; stop rather than ask thousands more times. */
const REFUSALS_BEFORE_STOP = 20;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function importEurLex(db: Database, options: EurLexOptions): Promise<EurLexReport> {
  const { snapshots, dryRun = false, limit = Infinity, pauseMs = 1500 } = options;
  const doFetch = options.fetchImpl ?? fetch;
  const say = options.onProgress ?? (() => undefined);
  const today = options.today ?? new Date().toISOString().slice(0, 10);
  const report: EurLexReport = {
    status: dryRun ? "dry_run" : "applied",
    acts: 0,
    skipped: 0,
    alreadyHeld: 0,
    stored: 0,
    consolidated: 0,
    fromArchive: 0,
    provisions: 0,
    remaining: 0,
    failures: [],
    failureReasons: {},
  };

  const listed = await listInForce(doFetch, {
    today,
    years: options.years,
    pauseMs: Math.min(pauseMs, 1000),
    onYear: (year, n) => {
      if (n > 0) say(`register ${year}: ${n} acts in force`);
    },
  });
  const acts = listed.acts;
  report.acts = acts.length;
  report.skipped = listed.skipped.length;
  const rows: ActRow[] = acts.map((act) => ({
    authority: EURLEX.authority,
    kind: EURLEX.kinds[act.type] ?? "other",
    inForce: true,
    title: act.title,
    locale: EURLEX.locale,
    identity: { scheme: "celex", value: act.celex },
    systematicNumber: null,
    more: [{ scheme: "official_url", value: pageUrlOf(act.celex) }],
  }));
  await importRegister(db, {
    register: {
      key: `${EURLEX.key}-register`,
      licenceSpdx: EURLEX.registerLicenceSpdx,
      identityScheme: "celex",
    },
    read: () => ({
      rows,
      skipped: listed.skipped.map((s) => ({ row: s.celex, reason: s.reason })),
    }),
    bytes: new TextEncoder().encode(JSON.stringify(acts)),
    url: EURLEX.sparql,
    retrievedAt: new Date(),
    snapshots,
    dryRun,
  });
  const known = new Map(
    (
      await db
        .select({ celex: legalActIdentifiers.value, actId: legalActs.id })
        .from(legalActs)
        .innerJoin(
          legalActIdentifiers,
          and(
            eq(legalActIdentifiers.actId, legalActs.id),
            eq(legalActIdentifiers.scheme, "celex"),
            isNull(legalActIdentifiers.supersededAt),
          ),
        )
        .where(eq(legalActs.authority, EURLEX.authority))
    ).map((row) => [row.celex, row.actId]),
  );
  const held = new Map(
    (
      await db
        .select({ actId: legalActVersions.actId, from: legalActVersions.inForceFrom })
        .from(legalActVersions)
        .innerJoin(legalActs, eq(legalActs.id, legalActVersions.actId))
        .where(
          and(
            eq(legalActs.authority, EURLEX.authority),
            eq(legalActVersions.lang, EURLEX.locale),
            isNull(legalActVersions.inForceTo),
          ),
        )
    ).map((row) => [row.actId, String(row.from)]),
  );

  const todo = acts.filter((act) => {
    const actId = known.get(act.celex);
    const current = actId ? held.get(actId) : undefined;
    if (current && current >= act.text.date) {
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
      const stored = await storeAct(
        db,
        snapshots,
        act,
        known.get(act.celex) ?? "",
        doFetch,
        options,
      );
      report.stored++;
      report.provisions += stored.provisions;
      if (act.text.consolidated) report.consolidated++;
      if (stored.fromArchive) report.fromArchive++;
      refusedInARow = 0;
      say(`${act.celex} ${act.text.date}: ${stored.provisions} provisions`);
    } catch (error) {
      const reason = reasonOf(error);
      report.failures.push({ act: act.celex, reason });
      const kind = reason
        .replace(/https?:\/\/\S+/g, "URL")
        .replace(/\d+/g, "N")
        .slice(0, 120);
      report.failureReasons[kind] = (report.failureReasons[kind] ?? 0) + 1;
      refusedInARow = /^\d{3} for|no answer|Internet Archive|not an act's page/.test(reason)
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
  act: EuAct,
  actId: string,
  doFetch: typeof fetch,
  options: EurLexOptions,
): Promise<{ provisions: number; fromArchive: boolean }> {
  const page = await read(htmlUrlOf(act.text.celex), doFetch, EURLEX.hosts, options.archiveRetryMs);
  const html = new TextDecoder().decode(page.bytes);
  if (!isActPage(html) || /The requested document does not exist/i.test(html)) {
    throw new Error("not an act's page");
  }
  const provisions = parseEurLexHtml(html);
  if (provisions.length === 0) throw new Error("no text in the page");
  await storeVersion(
    db,
    snapshots,
    {
      actId,
      lang: EURLEX.locale,
      inForceFrom: act.text.date,
      dateBasis: "publisher",
      // Only the electronic Official Journal is authentic; EUR-Lex's HTML, of a consolidated
      // version or of the act as published, is a reading of it.
      status: EURLEX.textStatus,
      format: "html",
      bytes: page.bytes,
      url: page.url,
      provisions,
      source: {
        key: EURLEX.key,
        licenceSpdx: EURLEX.licenceSpdx,
        importerVersion: EURLEX_IMPORTER_VERSION,
      },
    },
    options.dryRun ?? false,
  );
  return { provisions: provisions.length, fromArchive: page.copy !== null };
}

/**
 * Loads Estonia's national law from Riigi Teataja (RIIGITEATAJA in
 * src/lib/config/law): every consolidated text in force, as acts of the
 * authority `ee` named by the gazette's group id (stable across versions),
 * and each version's text cut into its sections. Safe to rerun and to stop: a
 * version already held is not fetched again, so a run limited to N continues
 * where the last one stopped; a newer version closes the one before it. Each
 * version is dated by the day the publisher says it took effect.
 */
import { and, eq, isNull } from "drizzle-orm";
import { RIIGITEATAJA } from "@/lib/config/law";
import type { Database } from "@/lib/db/client";
import { legalActIdentifiers, legalActVersions, legalActs } from "@/lib/db/law-schema";
import type { SnapshotStore } from "@/lib/places/importer/snapshots";
import { importRegister, type ActRow } from "../register/import";
import { inForceFromXml, listInForce, parseRiigiTeatajaXml, type RtAct } from "./riigiteataja";
import { storeVersion } from "./store";

export const RIIGITEATAJA_IMPORTER_VERSION = "law-text-riigiteataja-1";

export interface RiigiTeatajaOptions {
  snapshots: SnapshotStore;
  limit?: number;
  dryRun?: boolean;
  today?: string;
  fetchImpl?: typeof fetch;
  pauseMs?: number;
  onProgress?: (message: string) => void;
}

export interface RiigiTeatajaReport {
  status: "applied" | "dry_run";
  acts: number;
  alreadyHeld: number;
  stored: number;
  provisions: number;
  remaining: number;
  failures: { act: string; reason: string }[];
  /** How many acts failed for each reason, numbers left out, so a long run says why at a glance. */
  failureReasons: Record<string, number>;
  /** Set when the run stopped early because the publisher kept refusing: its last answer. */
  stoppedBecause?: string;
}

/** After this many refusals in a row the publisher is not answering; stop rather than ask thousands more times. */
const REFUSALS_BEFORE_STOP = 20;

/**
 * Why an act failed, in a line: the database's own words when it refused a
 * row (a query error wraps them in `cause`, after the whole statement), never
 * the statement and its parameters.
 */
export function reasonOf(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const cause = (error as { cause?: unknown }).cause;
  if (cause instanceof Error) return cause.message.slice(0, 300);
  return error.message.split("\n")[0]!.slice(0, 300);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const identityOf = (act: Pick<RtAct, "groupId">) => `${RIIGITEATAJA.key}:${act.groupId}`;
const url = (template: string, id: string) => template.replace("{id}", id);

export async function importRiigiTeataja(
  db: Database,
  options: RiigiTeatajaOptions,
): Promise<RiigiTeatajaReport> {
  const { snapshots, dryRun = false, limit = Infinity, pauseMs = 1500 } = options;
  const doFetch = options.fetchImpl ?? fetch;
  const say = options.onProgress ?? (() => undefined);
  const today = options.today ?? new Date().toISOString().slice(0, 10);
  const report: RiigiTeatajaReport = {
    status: dryRun ? "dry_run" : "applied",
    acts: 0,
    alreadyHeld: 0,
    stored: 0,
    provisions: 0,
    remaining: 0,
    failures: [],
    failureReasons: {},
  };

  const acts = await listInForce(today, doFetch, {
    national: true,
    pauseMs: Math.min(pauseMs, 400),
    onPage: (seen, total) => {
      if (seen % 1500 < 30) say(`register: ${seen} of ${total}`);
    },
  });
  report.acts = acts.length;
  const rows: ActRow[] = acts.map((act) => ({
    authority: RIIGITEATAJA.authority,
    kind: RIIGITEATAJA.kinds[act.type] ?? "other",
    inForce: true,
    title: act.title,
    locale: RIIGITEATAJA.locale,
    identity: { scheme: "publisher_ref", value: identityOf(act) },
    systematicNumber: null,
    more: [{ scheme: "official_url", value: url(RIIGITEATAJA.pageUrl, act.id) }],
  }));
  await importRegister(db, {
    register: {
      key: `${RIIGITEATAJA.key}-register`,
      licenceSpdx: RIIGITEATAJA.licenceSpdx,
      identityScheme: "publisher_ref",
    },
    read: () => ({ rows, skipped: [] }),
    bytes: new TextEncoder().encode(JSON.stringify(acts)),
    url: RIIGITEATAJA.searchUrl,
    retrievedAt: new Date(),
    snapshots,
    dryRun,
  });
  if (dryRun) return report;

  const known = new Map(
    (
      await db
        .select({ identity: legalActIdentifiers.value, actId: legalActs.id })
        .from(legalActs)
        .innerJoin(
          legalActIdentifiers,
          and(
            eq(legalActIdentifiers.actId, legalActs.id),
            eq(legalActIdentifiers.scheme, "publisher_ref"),
            isNull(legalActIdentifiers.supersededAt),
          ),
        )
        .where(eq(legalActs.authority, RIIGITEATAJA.authority))
    ).map((row) => [row.identity, row.actId]),
  );
  const held = new Map(
    (
      await db
        .select({ actId: legalActVersions.actId, from: legalActVersions.inForceFrom })
        .from(legalActVersions)
        .innerJoin(legalActs, eq(legalActs.id, legalActVersions.actId))
        .where(
          and(
            eq(legalActs.authority, RIIGITEATAJA.authority),
            eq(legalActVersions.lang, RIIGITEATAJA.locale),
            isNull(legalActVersions.inForceTo),
          ),
        )
    ).map((row) => [row.actId, String(row.from)]),
  );

  const todo = acts.filter((act) => {
    const actId = known.get(identityOf(act));
    const current = actId ? held.get(actId) : undefined;
    if (current && current >= act.inForceFrom) {
      report.alreadyHeld++;
      return false;
    }
    return Boolean(actId);
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
      const xmlUrl = url(RIIGITEATAJA.xmlUrl, act.id);
      if (!(RIIGITEATAJA.hosts as readonly string[]).includes(new URL(xmlUrl).hostname)) {
        throw new Error(`refusing to read ${xmlUrl}`);
      }
      const res = await doFetch(xmlUrl, { headers: { "user-agent": RIIGITEATAJA.userAgent } });
      if (!res.ok) throw new Error(`the act answered ${res.status}`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      const xml = new TextDecoder().decode(bytes);
      if (!xml.includes("<oigusakt")) throw new Error("not the gazette's XML");
      const provisions = parseRiigiTeatajaXml(xml);
      if (provisions.length === 0) throw new Error("no sections in the text");
      await storeVersion(
        db,
        snapshots,
        {
          actId: known.get(identityOf(act))!,
          lang: RIIGITEATAJA.locale,
          inForceFrom: inForceFromXml(xml) ?? act.inForceFrom,
          dateBasis: "publisher",
          status: RIIGITEATAJA.textStatus,
          format: "xml",
          bytes,
          url: xmlUrl,
          provisions,
          source: {
            key: RIIGITEATAJA.key,
            licenceSpdx: RIIGITEATAJA.licenceSpdx,
            importerVersion: RIIGITEATAJA_IMPORTER_VERSION,
          },
        },
        false,
      );
      report.stored++;
      report.provisions += provisions.length;
      refusedInARow = 0;
      say(`${act.title.slice(0, 70)}: ${provisions.length} sections`);
    } catch (error) {
      const reason = reasonOf(error);
      report.failures.push({ act: act.id, reason });
      const kind = reason.replace(/\d+/g, "N").slice(0, 120);
      report.failureReasons[kind] = (report.failureReasons[kind] ?? 0) + 1;
      refusedInARow = /answered \d+|fetch failed|not the gazette's XML/.test(reason)
        ? refusedInARow + 1
        : 0;
    }
    await sleep(pauseMs);
  }
  report.remaining = todo.length - attempted;
  return report;
}

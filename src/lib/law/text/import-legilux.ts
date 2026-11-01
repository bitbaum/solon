/**
 * Loads Luxembourg's law from Legilux into the register: the acts in force
 * (each act whose consolidated version Legilux marks applicable) as acts of
 * the authority `lux`, and that version's text, cut into articles. Safe to
 * rerun and to stop: a version already held is not fetched again, so a run
 * limited to N continues where the last one stopped; a newer version closes
 * the one held the day before it begins.
 */
import { and, eq, isNull } from "drizzle-orm";
import { LEGILUX } from "@/lib/config/law";
import type { Database } from "@/lib/db/client";
import { legalActIdentifiers, legalActs, legalActVersions } from "@/lib/db/law-schema";
import type { SnapshotStore } from "@/lib/places/importer/snapshots";
import { importRegister, type ActRow } from "../register/import";
import { fetchLegilux, listApplicable, parseLegiluxProvisions } from "./legilux";
import { storeVersion } from "./store";

export const LEGILUX_IMPORTER_VERSION = "law-text-legilux-1";

export interface LegiluxOptions {
  snapshots: SnapshotStore;
  limit?: number;
  dryRun?: boolean;
  fetchImpl?: typeof fetch;
  pauseMs?: number;
  onProgress?: (message: string) => void;
}

export interface LegiluxReport {
  status: "applied" | "dry_run";
  acts: number;
  alreadyHeld: number;
  stored: number;
  provisions: number;
  remaining: number;
  failures: { act: string; reason: string }[];
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** The act's page at Legilux, which a reader can open. */
const pageOf = (eli: string) =>
  eli.replace(/^https?:\/\/data\.legilux\.public\.lu\//, "https://legilux.public.lu/");

export async function importLegilux(db: Database, options: LegiluxOptions): Promise<LegiluxReport> {
  const { snapshots, dryRun = false, limit = Infinity, pauseMs = 800 } = options;
  const doFetch = options.fetchImpl ?? fetch;
  const say = options.onProgress ?? (() => undefined);
  const report: LegiluxReport = {
    status: dryRun ? "dry_run" : "applied",
    acts: 0,
    alreadyHeld: 0,
    stored: 0,
    provisions: 0,
    remaining: 0,
    failures: [],
  };

  const versions = await listApplicable(doFetch);
  report.acts = versions.length;
  const rows: ActRow[] = versions.map((v) => ({
    authority: LEGILUX.authority,
    kind: LEGILUX.kinds[v.type] ?? "other",
    inForce: true,
    title: v.title,
    locale: LEGILUX.locale,
    identity: { scheme: "lu_eli", value: v.work },
    systematicNumber: null,
    more: [{ scheme: "official_url", value: pageOf(v.consolidation) }],
  }));
  await importRegister(db, {
    register: {
      key: `${LEGILUX.key}-register`,
      licenceSpdx: LEGILUX.licenceSpdx,
      identityScheme: "lu_eli",
    },
    read: () => ({ rows, skipped: [] }),
    bytes: new TextEncoder().encode(JSON.stringify(versions)),
    url: LEGILUX.sparql,
    retrievedAt: new Date(),
    snapshots,
    dryRun,
  });
  if (dryRun) return report;

  const acts = new Map(
    (
      await db
        .select({ actId: legalActs.id, eli: legalActIdentifiers.value })
        .from(legalActs)
        .innerJoin(
          legalActIdentifiers,
          and(
            eq(legalActIdentifiers.actId, legalActs.id),
            eq(legalActIdentifiers.scheme, "lu_eli"),
            isNull(legalActIdentifiers.supersededAt),
          ),
        )
        .where(eq(legalActs.authority, LEGILUX.authority))
    ).map((row) => [row.eli, row.actId]),
  );
  const held = new Map(
    (
      await db
        .select({ actId: legalActVersions.actId, from: legalActVersions.inForceFrom })
        .from(legalActVersions)
        .where(and(eq(legalActVersions.lang, LEGILUX.locale), isNull(legalActVersions.inForceTo)))
    ).map((row) => [row.actId, String(row.from)]),
  );

  const todo = versions.filter((v) => {
    const actId = acts.get(v.work);
    const current = actId ? held.get(actId) : undefined;
    if (current && current >= v.date) {
      report.alreadyHeld++;
      return false;
    }
    return Boolean(actId);
  });
  let attempted = 0;
  for (const version of todo) {
    if (report.stored >= limit) break;
    attempted++;
    try {
      const bytes = await fetchLegilux(version.url, doFetch);
      const provisions = parseLegiluxProvisions(new TextDecoder().decode(bytes));
      if (provisions.length === 0) throw new Error("no text in the page");
      await storeVersion(
        db,
        snapshots,
        {
          actId: acts.get(version.work)!,
          lang: LEGILUX.locale,
          inForceFrom: version.date,
          dateBasis: "publisher",
          status: LEGILUX.textStatus,
          format: "html",
          bytes,
          url: version.url,
          provisions,
          source: {
            key: LEGILUX.key,
            licenceSpdx: LEGILUX.licenceSpdx,
            importerVersion: LEGILUX_IMPORTER_VERSION,
          },
        },
        false,
      );
      report.stored++;
      report.provisions += provisions.length;
      say(`${version.title.slice(0, 70)} ${version.date}: ${provisions.length} articles`);
    } catch (error) {
      report.failures.push({
        act: version.work,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
    await sleep(pauseMs);
  }
  report.remaining = todo.length - attempted;
  return report;
}

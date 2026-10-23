/**
 * Loads Liechtenstein's consolidated text into the register (design L2).
 *
 * For each act of the register that has no text yet, its Lilex page is read,
 * kept under its sha256 and split into articles. Resumable: acts that already
 * hold a version are not fetched again. Lilex does not say when a consolidated
 * version took effect, so the version is dated by the day it was read
 * (`date_basis: retrieved`); a later run that finds the page changed will say
 * so with a new version from that day.
 *
 * Statutes come before treaties, so what people ask for first arrives first.
 * The run is slow on purpose and stops at once if Lilex answers with its
 * proof-of-work page.
 */
import { and, asc, eq, isNull } from "drizzle-orm";
import { LILEX } from "@/lib/config/law";
import type { Database } from "@/lib/db/client";
import { legalActIdentifiers, legalActs, legalActVersions } from "@/lib/db/law-schema";
import type { SnapshotStore } from "@/lib/places/importer/snapshots";
import { ChallengeError, fetchLilexPage, lilexId, lilexUrl, parseLilexProvisions } from "./lilex";
import { storeVersion } from "./store";

export const LILEX_IMPORTER_VERSION = "law-text-lilex-1";

/** The order acts are read in: what people look for first. */
const KIND_ORDER = [
  "constitution",
  "statute",
  "ordinance",
  "regulation",
  "decree",
  "notice",
  "other",
  "treaty",
];

export interface LilexOptions {
  snapshots: SnapshotStore;
  /** The day the pages are read; dates the versions. */
  today: string;
  limit?: number;
  /** Only the act with this LR number. */
  lr?: string;
  dryRun?: boolean;
  fetchImpl?: typeof fetch;
  pauseMs?: number;
  onProgress?: (message: string) => void;
}

export interface LilexReport {
  status: "applied" | "dry_run";
  /** Acts of the register that hold no text yet. */
  wanted: number;
  stored: number;
  provisions: number;
  remaining: number;
  /** Acts with no plain page id (an issue like 60/1): not guessed. */
  noPageId: string[];
  failures: { lr: string; reason: string }[];
  /** Set when Lilex answered with its proof-of-work page and the run stopped. */
  stoppedByChallenge: boolean;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function importLilexText(db: Database, options: LilexOptions): Promise<LilexReport> {
  const { snapshots, today, dryRun = false, limit = Infinity, pauseMs = 3000 } = options;
  const say = options.onProgress ?? (() => undefined);
  const report: LilexReport = {
    status: dryRun ? "dry_run" : "applied",
    wanted: 0,
    stored: 0,
    provisions: 0,
    remaining: 0,
    noPageId: [],
    failures: [],
    stoppedByChallenge: false,
  };

  const lr = await db
    .select({
      actId: legalActs.id,
      kind: legalActs.kind,
      number: legalActIdentifiers.value,
    })
    .from(legalActs)
    .innerJoin(
      legalActIdentifiers,
      and(
        eq(legalActIdentifiers.actId, legalActs.id),
        eq(legalActIdentifiers.scheme, "systematic_number"),
        isNull(legalActIdentifiers.supersededAt),
      ),
    )
    .where(
      and(
        eq(legalActs.authority, LILEX.authority),
        options.lr ? eq(legalActIdentifiers.value, options.lr) : undefined,
      ),
    )
    .orderBy(asc(legalActIdentifiers.value));
  const lgbl = await db
    .select({ actId: legalActIdentifiers.actId, value: legalActIdentifiers.value })
    .from(legalActIdentifiers)
    .where(
      and(eq(legalActIdentifiers.scheme, "li_lgbl"), isNull(legalActIdentifiers.supersededAt)),
    );
  const lgblOf = new Map(lgbl.map((row) => [row.actId, row.value]));
  const held = new Set(
    (
      await db
        .select({ actId: legalActVersions.actId })
        .from(legalActVersions)
        .where(and(eq(legalActVersions.lang, LILEX.locale), isNull(legalActVersions.inForceTo)))
    ).map((row) => row.actId),
  );

  const todo = lr
    .filter((row) => !held.has(row.actId))
    .sort(
      (a, b) =>
        KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) ||
        a.number.localeCompare(b.number, "en", { numeric: true }),
    );
  report.wanted = todo.length;

  let attempted = 0;
  for (const row of todo) {
    if (report.stored >= limit) break;
    attempted++;
    const id = lilexId(lgblOf.get(row.actId) ?? null, row.number);
    if (!id) {
      report.noPageId.push(row.number);
      continue;
    }
    try {
      const bytes = await fetchLilexPage(id, options.fetchImpl);
      if (!bytes) {
        report.failures.push({ lr: row.number, reason: "no act at that page" });
      } else {
        const provisions = parseLilexProvisions(new TextDecoder().decode(bytes));
        if (provisions.length === 0) {
          report.failures.push({ lr: row.number, reason: "no provisions found in the page" });
        } else {
          await storeVersion(
            db,
            snapshots,
            {
              actId: row.actId,
              lang: LILEX.locale,
              inForceFrom: today,
              dateBasis: "retrieved",
              status: LILEX.textStatus,
              format: "html",
              bytes,
              url: lilexUrl(id),
              provisions,
              source: {
                key: LILEX.key,
                licenceSpdx: LILEX.licenceSpdx,
                importerVersion: LILEX_IMPORTER_VERSION,
              },
            },
            dryRun,
          );
          report.stored++;
          report.provisions += provisions.length;
          say(`${row.number}: ${provisions.length} provisions`);
        }
      }
    } catch (error) {
      if (error instanceof ChallengeError) {
        report.stoppedByChallenge = true;
        break;
      }
      report.failures.push({
        lr: row.number,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
    await sleep(pauseMs);
  }
  report.remaining = todo.length - attempted;
  return report;
}

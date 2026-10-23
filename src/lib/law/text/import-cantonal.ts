/**
 * Loads the text of cantonal and intercantonal acts into the register (design
 * L3, first pass): each act's document is read, kept under its sha256 and cut
 * into articles by `parseCantonalProvisions`.
 *
 * Resumable: an act that already holds a version is not fetched again. The
 * version is dated by the day it was read (`date_basis: retrieved`). A reader
 * per canton that takes the canton's own text, with the date it states, replaces
 * this for that canton; until then this is the stated fallback.
 */
import { statfsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { CANTONAL_DOCUMENTS, LAW_AUTHORITIES } from "@/lib/config/law";
import type { Database } from "@/lib/db/client";
import { legalActIdentifiers, legalActs, legalActVersions } from "@/lib/db/law-schema";
import { snapshotDir, type SnapshotStore } from "@/lib/places/importer/snapshots";
import {
  cleanPdfText,
  documentText,
  documentUrl,
  fetchDocument,
  parseCantonalProvisions,
} from "./cantonal";
import { storeVersion } from "./store";

export const CANTONAL_IMPORTER_VERSION = "law-text-cantonal-1";

/** The cantons' authorities, and the intercantonal one: every authority whose place is a canton. */
export const cantonalAuthorities = (): string[] =>
  LAW_AUTHORITIES.filter(
    (a) =>
      a.place?.scheme === CANTONAL_DOCUMENTS.placeScheme ||
      a.key === CANTONAL_DOCUMENTS.intercantonalAuthority,
  ).map((a) => a.key);

export interface CantonalOptions {
  snapshots: SnapshotStore;
  today: string;
  /** Only this authority (a canton's key). */
  authority?: string;
  limit?: number;
  dryRun?: boolean;
  fetchImpl?: typeof fetch;
  pauseMs?: number;
  /** Refuse to start with less than this many bytes free where snapshots are kept. */
  minFreeBytes?: number;
  onProgress?: (message: string) => void;
}

export interface CantonalReport {
  status: "applied" | "dry_run";
  wanted: number;
  stored: number;
  provisions: number;
  remaining: number;
  failures: { id: string; reason: string }[];
  freeBytesAtStart: number | null;
  refusedForSpace: boolean;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Bytes free where the snapshots are kept; null when the system will not say. */
export function freeBytes(dir: string = snapshotDir()): number | null {
  // The store makes its directory on first use; until then, ask the nearest one that exists.
  for (let at = resolve(dir); ; at = dirname(at)) {
    try {
      const stats = statfsSync(at);
      return stats.bavail * stats.bsize;
    } catch {
      if (dirname(at) === at) return null;
    }
  }
}

export async function importCantonalText(
  db: Database,
  options: CantonalOptions,
): Promise<CantonalReport> {
  const {
    snapshots,
    today,
    dryRun = false,
    limit = Infinity,
    pauseMs = 1200,
    minFreeBytes = 3 * 1024 ** 3,
  } = options;
  const say = options.onProgress ?? (() => undefined);
  const report: CantonalReport = {
    status: dryRun ? "dry_run" : "applied",
    wanted: 0,
    stored: 0,
    provisions: 0,
    remaining: 0,
    failures: [],
    freeBytesAtStart: freeBytes(),
    refusedForSpace: false,
  };
  if (!dryRun && report.freeBytesAtStart !== null && report.freeBytesAtStart < minFreeBytes) {
    report.refusedForSpace = true;
    return report;
  }

  const authorities = options.authority ? [options.authority] : cantonalAuthorities();
  const candidates = await db
    .select({
      actId: legalActs.id,
      authority: legalActs.authority,
      registerId: legalActIdentifiers.value,
    })
    .from(legalActs)
    .innerJoin(
      legalActIdentifiers,
      and(
        eq(legalActIdentifiers.actId, legalActs.id),
        eq(legalActIdentifiers.scheme, "lexfind_id"),
        isNull(legalActIdentifiers.supersededAt),
      ),
    )
    .where(and(inArray(legalActs.authority, authorities), eq(legalActs.inForce, true)))
    .orderBy(asc(legalActs.authority), asc(legalActIdentifiers.value));
  const held = new Set(
    (
      await db
        .select({ actId: legalActVersions.actId })
        .from(legalActVersions)
        .where(
          and(
            eq(legalActVersions.lang, CANTONAL_DOCUMENTS.locale),
            isNull(legalActVersions.inForceTo),
          ),
        )
    ).map((row) => row.actId),
  );
  const todo = candidates.filter((row) => !held.has(row.actId));
  report.wanted = todo.length;

  let attempted = 0;
  for (const row of todo) {
    if (report.stored >= limit) break;
    attempted++;
    try {
      const document = await fetchDocument(
        row.registerId,
        CANTONAL_DOCUMENTS.locale,
        options.fetchImpl,
      );
      if (!document) {
        report.failures.push({ id: row.registerId, reason: "no document" });
      } else {
        const text = cleanPdfText(await documentText(document.bytes, document.kind));
        const provisions = parseCantonalProvisions(text);
        if (provisions.length === 0) {
          report.failures.push({ id: row.registerId, reason: "no text in the document" });
        } else {
          await storeVersion(
            db,
            snapshots,
            {
              actId: row.actId,
              lang: CANTONAL_DOCUMENTS.locale,
              inForceFrom: today,
              dateBasis: "retrieved",
              status: CANTONAL_DOCUMENTS.textStatus,
              format: document.kind,
              bytes: document.bytes,
              url: documentUrl(row.registerId, CANTONAL_DOCUMENTS.locale),
              provisions,
              source: {
                key: CANTONAL_DOCUMENTS.key,
                licenceSpdx: CANTONAL_DOCUMENTS.licenceSpdx,
                importerVersion: CANTONAL_IMPORTER_VERSION,
              },
            },
            dryRun,
          );
          report.stored++;
          report.provisions += provisions.length;
          say(`${row.authority} ${row.registerId}: ${provisions.length} provisions`);
        }
      }
    } catch (error) {
      report.failures.push({
        id: row.registerId,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
    await sleep(pauseMs);
  }
  report.remaining = todo.length - attempted;
  return report;
}

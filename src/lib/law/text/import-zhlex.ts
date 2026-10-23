/**
 * Loads Zürich's laws from ZH-Lex, the canton's own collection (design L3),
 * replacing the first-pass reading by document: each act's current version, the
 * canton's PDF, with the day the canton says it took effect.
 *
 * An act is read when it has an official page and holds no version dated by
 * the publisher yet. Storing the publisher-dated version retires the first-pass
 * reading of the same act (see `storeVersion`).
 */
import { and, asc, eq, isNull } from "drizzle-orm";
import { ZHLEX } from "@/lib/config/law";
import type { Database } from "@/lib/db/client";
import { legalActIdentifiers, legalActs, legalActVersions } from "@/lib/db/law-schema";
import type { SnapshotStore } from "@/lib/places/importer/snapshots";
import { cleanPdfText, documentText, parseCantonalProvisions } from "./cantonal";
import { storeVersion } from "./store";
import { fetchZhlexPdf, inForceFromUrl, readZhlexPage } from "./zhlex";

export const ZHLEX_IMPORTER_VERSION = "law-text-zhlex-1";

export interface ZhlexOptions {
  snapshots: SnapshotStore;
  limit?: number;
  dryRun?: boolean;
  fetchImpl?: typeof fetch;
  pauseMs?: number;
  onProgress?: (message: string) => void;
}

export interface ZhlexReport {
  status: "applied" | "dry_run";
  wanted: number;
  stored: number;
  provisions: number;
  remaining: number;
  /** Acts the register links to an address that states no in-force day (an old PDF, or a page with the day blank); they keep the first-pass reading. */
  undated: number;
  failures: { page: string; reason: string }[];
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function importZhlexText(db: Database, options: ZhlexOptions): Promise<ZhlexReport> {
  const { snapshots, dryRun = false, limit = Infinity, pauseMs = 1500 } = options;
  const say = options.onProgress ?? (() => undefined);
  const report: ZhlexReport = {
    status: dryRun ? "dry_run" : "applied",
    wanted: 0,
    stored: 0,
    provisions: 0,
    remaining: 0,
    undated: 0,
    failures: [],
  };
  const pages = await db
    .select({ actId: legalActs.id, url: legalActIdentifiers.value })
    .from(legalActs)
    .innerJoin(
      legalActIdentifiers,
      and(
        eq(legalActIdentifiers.actId, legalActs.id),
        eq(legalActIdentifiers.scheme, "official_url"),
        isNull(legalActIdentifiers.supersededAt),
      ),
    )
    .where(and(eq(legalActs.authority, ZHLEX.authority), eq(legalActs.inForce, true)))
    .orderBy(asc(legalActIdentifiers.value));
  const done = new Set(
    (
      await db
        .select({ actId: legalActVersions.actId })
        .from(legalActVersions)
        .where(
          and(
            eq(legalActVersions.lang, ZHLEX.locale),
            eq(legalActVersions.dateBasis, "publisher"),
            isNull(legalActVersions.inForceTo),
          ),
        )
    ).map((row) => row.actId),
  );
  // An address that is a PDF itself (the canton's older links), or that states no in-force day,
  // carries no date to give the version.
  const undated = pages.filter(
    (row) =>
      /\.pdf$/i.test(row.url.split(/[?#]/)[0]!) ||
      !inForceFromUrl(row.url.replace(/^http:/, "https:")),
  );
  report.undated = undated.length;
  const todo = pages.filter((row) => !done.has(row.actId) && !undated.includes(row));
  report.wanted = todo.length;

  let attempted = 0;
  for (const row of todo) {
    if (report.stored >= limit) break;
    attempted++;
    try {
      const act = await readZhlexPage(row.url, options.fetchImpl);
      const bytes = act ? await fetchZhlexPdf(act.pdfUrl, options.fetchImpl) : null;
      if (!act || !bytes) {
        report.failures.push({ page: row.url, reason: "no PDF on the act's page" });
      } else {
        const provisions = parseCantonalProvisions(cleanPdfText(await documentText(bytes, "pdf")));
        if (provisions.length === 0) {
          report.failures.push({ page: row.url, reason: "no text in the PDF" });
        } else {
          await storeVersion(
            db,
            snapshots,
            {
              actId: row.actId,
              lang: ZHLEX.locale,
              inForceFrom: act.inForceFrom,
              dateBasis: "publisher",
              status: ZHLEX.textStatus,
              format: "pdf",
              bytes,
              url: act.pdfUrl,
              provisions,
              source: {
                key: ZHLEX.key,
                licenceSpdx: ZHLEX.licenceSpdx,
                importerVersion: ZHLEX_IMPORTER_VERSION,
              },
            },
            dryRun,
          );
          report.stored++;
          report.provisions += provisions.length;
          say(`${act.inForceFrom} ${row.url.split("/").pop()}: ${provisions.length} provisions`);
        }
      }
    } catch (error) {
      report.failures.push({
        page: row.url,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
    await sleep(pauseMs);
  }
  report.remaining = todo.length - attempted;
  return report;
}

/**
 * Registers Russia's federal laws and a subject's laws from the official
 * publication portal (config PRAVO_GOV_RU), one register per authority. Safe
 * to rerun and to stop: a run limited to some pages is a smaller listing,
 * never a retraction (src/lib/law/register/import.ts).
 */
import { PRAVO_GOV_RU } from "@/lib/config/law";
import type { Database } from "@/lib/db/client";
import type { SnapshotStore } from "@/lib/places/importer/snapshots";
import { importRegister, type RegisterReport } from "../register/import";
import { documentsPage, documentsUrl, rowsOf, type ListedDocument } from "./pravo-gov-ru";

export interface PravoRegisterOptions {
  snapshots: SnapshotStore;
  /** Read these authorities only (keys of PRAVO_GOV_RU.blocks); all when absent. */
  authorities?: readonly string[];
  /** Most listing pages to read per authority in this run. */
  limit?: number;
  dryRun?: boolean;
  fetchImpl?: typeof fetch;
  pauseMs?: number;
  onProgress?: (message: string) => void;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function registerPravoGovRu(
  db: Database,
  options: PravoRegisterOptions,
): Promise<{ authority: string; pagesRead: number; acts: number; register: RegisterReport }[]> {
  const doFetch = options.fetchImpl ?? fetch;
  const say = options.onProgress ?? (() => undefined);
  const pauseMs = options.pauseMs ?? PRAVO_GOV_RU.pauseMs;
  const blocks = PRAVO_GOV_RU.blocks.filter(
    (b) => !options.authorities || options.authorities.includes(b.authority),
  );
  const reports = [];
  let requests = 0;
  for (const block of blocks) {
    const docs: ListedDocument[] = [];
    let pagesRead = 0;
    for (let page = 1; pagesRead < (options.limit ?? Infinity); page++) {
      if (requests > 0) await sleep(pauseMs);
      const url = documentsUrl(block, page);
      const response = await doFetch(url, {
        headers: { "user-agent": PRAVO_GOV_RU.userAgent, accept: "application/json" },
        signal: AbortSignal.timeout(60_000),
      });
      requests++;
      if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
      const listing = documentsPage.parse(await response.json());
      pagesRead++;
      docs.push(...listing.items);
      say(
        `${block.authority} page ${page} of ${listing.pagesTotalCount}: ${listing.items.length} acts`,
      );
      if (page >= listing.pagesTotalCount || listing.items.length === 0) break;
    }
    const read = rowsOf(block, docs);
    const register = await importRegister(db, {
      register: {
        key: `${PRAVO_GOV_RU.key}-${block.authority}`,
        licenceSpdx: PRAVO_GOV_RU.licenceSpdx,
        identityScheme: "publisher_ref",
      },
      read: () => read,
      bytes: new TextEncoder().encode(JSON.stringify(docs)),
      url: documentsUrl(block, 1),
      retrievedAt: new Date(),
      snapshots: options.snapshots,
      dryRun: options.dryRun,
    });
    reports.push({ authority: block.authority, pagesRead, acts: read.rows.length, register });
  }
  return reports;
}

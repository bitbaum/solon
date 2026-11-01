/**
 * Keeps the text Solon holds current where the publisher states no dates
 * (design: law-as-data, "Staying current"): the cantons' documents and
 * Liechtenstein's Lilex pages are read again, oldest reading first, and a
 * document whose bytes differ from the version in force becomes a new version
 * dated by the day it was read; storeVersion closes the old one. The same
 * bytes read again move the reading's day, so the next run reads the next
 * oldest. Fedlex and Legilux state their versions' days and are kept current
 * by their own readers.
 */
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { CANTONAL_DOCUMENTS, LILEX } from "@/lib/config/law";
import type { Database } from "@/lib/db/client";
import { legalActVersions } from "@/lib/db/law-schema";
import { sources } from "@/lib/db/places-schema";
import { sha256Hex, type SnapshotStore } from "@/lib/places/importer/snapshots";
import { cleanPdfText, documentText, parseCantonalProvisions } from "./cantonal";
import type { Provision } from "./fedlex";
import { CANTONAL_IMPORTER_VERSION } from "./import-cantonal";
import { LILEX_IMPORTER_VERSION } from "./import-lilex";
import { ChallengeError, fetchLilexDocument, parseLilexProvisions } from "./lilex";
import { storeVersion } from "./store";

const USER_AGENT = "solon-law-text (cato@orangecat.ch)";

interface Reader {
  importerVersion: string;
  licenceSpdx: string;
  status: typeof CANTONAL_DOCUMENTS.textStatus;
  fetch(
    url: string,
    doFetch: typeof fetch,
  ): Promise<{ bytes: Uint8Array; format: "pdf" | "html" } | null>;
  parse(bytes: Uint8Array, format: "pdf" | "html"): Promise<Provision[]>;
}

/** The readers that can read a held document again, by source key. */
export const REFRESHABLE: Readonly<Record<string, Reader>> = {
  [CANTONAL_DOCUMENTS.key]: {
    importerVersion: CANTONAL_IMPORTER_VERSION,
    licenceSpdx: CANTONAL_DOCUMENTS.licenceSpdx,
    status: CANTONAL_DOCUMENTS.textStatus,
    async fetch(url, doFetch) {
      const response = await doFetch(url, {
        headers: { "user-agent": USER_AGENT },
        signal: AbortSignal.timeout(120_000),
      });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      const pdf = new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
      return { bytes, format: pdf ? "pdf" : "html" };
    },
    async parse(bytes, format) {
      return parseCantonalProvisions(cleanPdfText(await documentText(bytes, format)));
    },
  },
  [LILEX.key]: {
    importerVersion: LILEX_IMPORTER_VERSION,
    licenceSpdx: LILEX.licenceSpdx,
    status: LILEX.textStatus,
    async fetch(url, doFetch) {
      return fetchLilexDocument(url.slice(LILEX.page.length), doFetch);
    },
    async parse(bytes, format) {
      return format === "pdf"
        ? parseCantonalProvisions(cleanPdfText(await documentText(bytes, "pdf")))
        : parseLilexProvisions(new TextDecoder().decode(bytes));
    },
  },
};

export interface RefreshReport {
  status: "applied" | "dry_run";
  checked: number;
  unchanged: number;
  changed: number;
  stoppedByChallenge: boolean;
  failures: { url: string; reason: string }[];
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function refreshText(
  db: Database,
  options: {
    snapshots: SnapshotStore;
    today: string;
    limit?: number;
    sourceKeys?: readonly string[];
    dryRun?: boolean;
    pauseMs?: number;
    fetchImpl?: typeof fetch;
    onProgress?: (message: string) => void;
  },
): Promise<RefreshReport> {
  const { snapshots, today, limit = 500, dryRun = false, pauseMs = 1200 } = options;
  const doFetch = options.fetchImpl ?? fetch;
  const say = options.onProgress ?? (() => undefined);
  const keys = (options.sourceKeys ?? Object.keys(REFRESHABLE)).filter((k) => REFRESHABLE[k]);
  const report: RefreshReport = {
    status: dryRun ? "dry_run" : "applied",
    checked: 0,
    unchanged: 0,
    changed: 0,
    stoppedByChallenge: false,
    failures: [],
  };
  const due = await db
    .select({
      actId: legalActVersions.actId,
      lang: legalActVersions.lang,
      sourceId: sources.id,
      sourceKey: sources.sourceKey,
      url: sources.url,
      sha: sources.contentSha256,
    })
    .from(legalActVersions)
    .innerJoin(sources, eq(sources.id, legalActVersions.sourceId))
    .where(and(isNull(legalActVersions.inForceTo), inArray(sources.sourceKey, [...keys])))
    .orderBy(asc(sources.retrievedAt))
    .limit(limit);
  for (const row of due) {
    if (!row.url) continue;
    const reader = REFRESHABLE[row.sourceKey]!;
    report.checked++;
    try {
      const read = await reader.fetch(row.url, doFetch);
      if (!read) {
        report.failures.push({ url: row.url, reason: "the publisher no longer serves it" });
      } else if (sha256Hex(read.bytes) === row.sha) {
        report.unchanged++;
        if (!dryRun)
          await db
            .update(sources)
            .set({ retrievedAt: new Date() })
            .where(eq(sources.id, row.sourceId));
      } else {
        const provisions = await reader.parse(read.bytes, read.format);
        if (provisions.length === 0) throw new Error("no text in the new document");
        report.changed++;
        say(`changed: ${row.url} (${provisions.length} provisions)`);
        await storeVersion(
          db,
          snapshots,
          {
            actId: row.actId,
            lang: row.lang,
            inForceFrom: today,
            dateBasis: "retrieved",
            status: reader.status,
            format: read.format,
            bytes: read.bytes,
            url: row.url,
            provisions,
            source: {
              key: row.sourceKey,
              licenceSpdx: reader.licenceSpdx,
              importerVersion: reader.importerVersion,
            },
          },
          dryRun,
        );
      }
    } catch (error) {
      if (error instanceof ChallengeError) {
        report.stoppedByChallenge = true;
        break;
      }
      report.failures.push({
        url: row.url,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
    await sleep(pauseMs);
  }
  return report;
}

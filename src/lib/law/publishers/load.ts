/**
 * Loads one municipal collection through its adapter (design: docs/design/2026-10-law-as-data.md,
 * "Municipal collections"). The same steps for every commune:
 *
 *   register  the acts the collection lists, as acts of the commune's authority
 *   text      each act's versions, current first; history only when asked for
 *
 * Resumable: a version already held (same act, language, first day) is skipped,
 * so a run limited to N continues where the last stopped. A collection that
 * states no dates (`dateBasis: retrieved`) is checked by its document instead:
 * the same bytes as the version in force are not stored again.
 *
 * A publisher that refuses Solon's reader is read from the Internet Archive's
 * newest copy instead (http.ts); the act keeps the publisher's address as its
 * identity, and the version's source is the copy's address, which names the
 * archive and the day of the capture (`archive-copy.ts`).
 */
import { provisionsOfPdf } from "@/lib/law/text/pdf-provisions";
import { and, asc, eq, isNull } from "drizzle-orm";
import { sources } from "@/lib/db/places-schema";
import { sha256Hex } from "@/lib/places/importer/snapshots";
import type { Database } from "@/lib/db/client";
import { legalActIdentifiers, legalActs, legalActVersions } from "@/lib/db/law-schema";
import type { SnapshotStore } from "@/lib/places/importer/snapshots";
import { importRegister, type ActRow } from "../register/import";
import { storeVersion, dayBefore } from "../text/store";
import { archiveCopyOf } from "../archive-copy";
import { read } from "./http";
import type { PublisherAdapter, VersionRef } from "./types";

export const PUBLISHER_IMPORTER_VERSION = "law-text-publisher-1";

/** The reader's version, marked when the text was read by OCR or from an archive's copy. */
export const importerVersion = (scanned: boolean, fromCopy: boolean): string =>
  `${PUBLISHER_IMPORTER_VERSION}${scanned ? "+ocr" : ""}${fromCopy ? "+archive" : ""}`;

export interface LoadOptions {
  snapshots: SnapshotStore;
  today: string;
  /** Also store every earlier version the publisher lists. */
  history?: boolean;
  limit?: number;
  dryRun?: boolean;
  fetchImpl?: typeof fetch;
  pauseMs?: number;
  onProgress?: (message: string) => void;
}

export interface LoadReport {
  status: "applied" | "dry_run";
  acts: number;
  versionsStored: number;
  provisions: number;
  remainingActs: number;
  /** Versions read from the Internet Archive's copy because the publisher refused. */
  fromArchive: number;
  /** The archive's copy the collection's index was read from, when the publisher refused it. */
  listedFrom: string | null;
  failures: { page: string; reason: string }[];
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** The version in force on `today`: started, and not ended. A version not yet started waits. */
export function currentVersion(versions: readonly VersionRef[], today: string): VersionRef | null {
  const live = versions.filter(
    (v) => v.inForceFrom <= today && (v.inForceTo === null || v.inForceTo >= today),
  );
  return live.at(-1) ?? null;
}

export async function loadPublisher(
  db: Database,
  adapter: PublisherAdapter,
  options: LoadOptions,
): Promise<LoadReport> {
  const doFetch = options.fetchImpl ?? fetch;
  const say = options.onProgress ?? (() => undefined);
  const pause = options.pauseMs ?? 1500;
  const report: LoadReport = {
    status: options.dryRun ? "dry_run" : "applied",
    acts: 0,
    versionsStored: 0,
    provisions: 0,
    remainingActs: 0,
    fromArchive: 0,
    listedFrom: null,
    failures: [],
  };

  const listed = await adapter.list(doFetch);
  if (archiveCopyOf(listed.url)) {
    report.listedFrom = listed.url;
    say(`the publisher refused its index; read from ${listed.url}`);
  }
  const rows: ActRow[] = listed.acts.map((act) => ({
    authority: adapter.authority,
    kind: act.kind,
    inForce: true,
    title: act.title,
    locale: adapter.locale,
    identity: { scheme: "publisher_ref", value: `${adapter.key}:${act.ref}` },
    systematicNumber: act.ref,
    more: [{ scheme: "official_url", value: act.pageUrl }],
  }));
  await importRegister(db, {
    register: {
      key: `${adapter.key}-register`,
      licenceSpdx: adapter.licenceSpdx,
      identityScheme: "publisher_ref",
    },
    read: () => ({ rows, skipped: [] }),
    bytes: listed.bytes,
    url: listed.url,
    retrievedAt: new Date(),
    snapshots: options.snapshots,
    dryRun: options.dryRun,
  });
  report.acts = rows.length;
  if (options.dryRun) return report;

  const acts = await db
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
    .where(and(eq(legalActs.authority, adapter.authority), eq(legalActs.inForce, true)))
    .orderBy(asc(legalActIdentifiers.value));

  for (const [index, act] of acts.entries()) {
    if (report.versionsStored >= (options.limit ?? Infinity)) {
      report.remainingActs = acts.length - index;
      break;
    }
    try {
      const held = new Set(
        (
          await db
            .select({ from: legalActVersions.inForceFrom })
            .from(legalActVersions)
            .where(
              and(eq(legalActVersions.actId, act.actId), eq(legalActVersions.lang, adapter.locale)),
            )
        ).map((row) => String(row.from)),
      );
      const all = await adapter.versions(act.url, doFetch);
      await sleep(pause);
      const current = currentVersion(all, options.today);
      const wanted = options.history
        ? all.filter((v) => v.inForceFrom <= options.today)
        : current
          ? [current]
          : [];
      // Oldest first: each later version closes the one before it.
      for (const version of wanted) {
        const retrieved = version.dateBasis === "retrieved";
        if (!retrieved && held.has(version.inForceFrom)) continue;
        const next = all.find((v) => v.inForceFrom > version.inForceFrom);
        const isLatest = !next || next.inForceFrom > options.today;
        const document = await adapter.document(version, doFetch);
        await sleep(pause);
        if (!document || document.format !== "pdf") {
          report.failures.push({ page: version.pageUrl, reason: "no PDF for this version" });
          continue;
        }
        // The publisher's document, or the archive's dated copy when the publisher refuses (http.ts).
        const fetched = await read(document.url, doFetch, [new URL(document.url).hostname]);
        const { bytes } = fetched;
        if (fetched.copy) say(`${document.url}: refused, read from ${fetched.url}`);
        // A version dated by the day it was read is new only if its document is.
        if (retrieved) {
          const [open] = await db
            .select({ sha: sources.contentSha256 })
            .from(legalActVersions)
            .innerJoin(sources, eq(sources.id, legalActVersions.sourceId))
            .where(
              and(
                eq(legalActVersions.actId, act.actId),
                eq(legalActVersions.lang, adapter.locale),
                isNull(legalActVersions.inForceTo),
              ),
            );
          if (open?.sha === sha256Hex(bytes)) continue;
        }
        const { provisions, scanned } = await provisionsOfPdf(bytes, adapter.locale, () =>
          say(`${document.url}: no text layer, reading by OCR`),
        );
        if (provisions.length === 0) {
          report.failures.push({ page: document.url, reason: "no text in the PDF" });
          continue;
        }
        await storeVersion(
          db,
          options.snapshots,
          {
            actId: act.actId,
            lang: adapter.locale,
            inForceFrom: version.inForceFrom,
            // An earlier version ends the day before the next one begins; the latest ends only when the publisher says.
            inForceTo: isLatest ? undefined : dayBefore(next!.inForceFrom),
            dateBasis: version.dateBasis ?? "publisher",
            status: adapter.textStatus,
            format: "pdf",
            bytes,
            // A copy records the copy's address, which names the archive and the day it was captured.
            url: fetched.url,
            provisions,
            source: {
              key: adapter.key,
              licenceSpdx: adapter.licenceSpdx,
              importerVersion: importerVersion(scanned, fetched.copy !== null),
            },
          },
          false,
        );
        report.versionsStored++;
        if (fetched.copy) report.fromArchive++;
        report.provisions += provisions.length;
        say(`${act.url.split("/").pop()} ${version.inForceFrom}: ${provisions.length} provisions`);
      }
    } catch (error) {
      report.failures.push({
        page: act.url,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return report;
}

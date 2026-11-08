/**
 * Loads New Hampshire's Revised Statutes Annotated from the General Court's
 * site (GCNH in src/lib/config/law): every chapter its tables list as an act
 * of the authority `us-nh`, and each chapter's merged page cut into sections.
 *
 * Safe to rerun and to stop: a chapter whose text is held is not fetched
 * again unless `again` is set, and then a new version is stored only when the
 * page's bytes changed; each chapter is stored in its own transaction. Paced
 * as the site's robots.txt asks. When the site refuses Solon's reader (its
 * firewall has answered "Web Page Blocked"), a page is read from the Internet
 * Archive's newest good copy (publishers/http.ts): the act keeps the official
 * address, and the version records the copy's, which names its date.
 */
import { and, eq, isNull } from "drizzle-orm";
import { GCNH } from "@/lib/config/law";
import type { Database } from "@/lib/db/client";
import { legalActIdentifiers, legalActVersions, legalActs } from "@/lib/db/law-schema";
import { sources } from "@/lib/db/places-schema";
import { sha256Hex, type SnapshotStore } from "@/lib/places/importer/snapshots";
import { ARCHIVE_RETRY_MS, read, type Read } from "../publishers/http";
import { importRegister, type ActRow } from "../register/import";
import {
  chapterPage,
  decodePage,
  parseGcnhChapter,
  parseGcnhChapters,
  parseGcnhTitles,
  titlePage,
  type GcnhChapter,
} from "./gcnh";
import { storeVersion } from "./store";

export const GCNH_IMPORTER_VERSION = "law-text-gcnh-1";

export interface GcnhOptions {
  snapshots: SnapshotStore;
  /** Store at most this many versions in this run. */
  limit?: number;
  dryRun?: boolean;
  /** Read chapters already held again, storing a new version where the page changed. */
  again?: boolean;
  /** Only these titles, as the site writes them ("III", "XIX-A"). */
  titles?: readonly string[];
  /** Only these chapters ("39", "21-J"). */
  chapters?: readonly string[];
  today?: string;
  fetchImpl?: typeof fetch;
  pauseMs?: number;
  /** How long to wait before asking the archive again after a dropped connection; tests pass none. */
  retryWaits?: readonly number[];
  onProgress?: (message: string) => void;
}

export interface GcnhReport {
  status: "applied" | "dry_run";
  titles: number;
  chapters: number;
  alreadyHeld: number;
  unchanged: number;
  stored: number;
  provisions: number;
  /** Versions read from the Internet Archive's copy because the site refused. */
  fromArchive: number;
  /** Chapters the site says were repealed whole. */
  repealedChapters: number;
  remaining: number;
  failures: { page: string; reason: string }[];
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const identityOf = (chapter: string) => `${GCNH.key}:${chapter}`;
const officialUrl = (path: string) => `${GCNH.base}${path}`;

/**
 * A page of the RSA: from the site, or the archive's copy when it refuses.
 * The archive holds most of its copies under the General Court's former
 * address, so when it has none under the current one, that one is asked.
 */
async function readPage(
  path: string,
  doFetch: typeof fetch,
  retryWaits: readonly number[],
): Promise<Read> {
  try {
    return await read(officialUrl(path), doFetch, GCNH.hosts, retryWaits);
  } catch (error) {
    if (!(error instanceof Error) || !/Internet Archive/.test(error.message)) throw error;
    try {
      return await read(`${GCNH.formerBase}${path}`, doFetch, GCNH.hosts, retryWaits);
    } catch {
      throw error;
    }
  }
}

interface Held {
  actId: string;
  inForce: boolean;
  sha: string | null;
}

/** What is held: each chapter's act, whether it is in force, and the sha256 of its current version's page. */
async function heldChapters(db: Database): Promise<Map<string, Held>> {
  const rows = await db
    .select({
      identity: legalActIdentifiers.value,
      actId: legalActs.id,
      inForce: legalActs.inForce,
      sha: sources.contentSha256,
    })
    .from(legalActs)
    .innerJoin(
      legalActIdentifiers,
      and(
        eq(legalActIdentifiers.actId, legalActs.id),
        eq(legalActIdentifiers.scheme, "publisher_ref"),
        isNull(legalActIdentifiers.supersededAt),
      ),
    )
    .leftJoin(
      legalActVersions,
      and(
        eq(legalActVersions.actId, legalActs.id),
        eq(legalActVersions.lang, GCNH.locale),
        isNull(legalActVersions.inForceTo),
      ),
    )
    .leftJoin(sources, eq(sources.id, legalActVersions.sourceId))
    .where(eq(legalActs.authority, GCNH.authority));
  return new Map(rows.map((row) => [row.identity, row]));
}

export async function importGcnh(db: Database, options: GcnhOptions): Promise<GcnhReport> {
  const {
    snapshots,
    dryRun = false,
    limit = Infinity,
    pauseMs = GCNH.pauseMs,
    again = false,
    retryWaits = ARCHIVE_RETRY_MS,
  } = options;
  const doFetch = options.fetchImpl ?? fetch;
  const say = options.onProgress ?? (() => undefined);
  const today = options.today ?? new Date().toISOString().slice(0, 10);
  const report: GcnhReport = {
    status: dryRun ? "dry_run" : "applied",
    titles: 0,
    chapters: 0,
    alreadyHeld: 0,
    unchanged: 0,
    stored: 0,
    provisions: 0,
    fromArchive: 0,
    repealedChapters: 0,
    remaining: 0,
    failures: [],
  };

  // The register: the table of titles, then each title's chapters.
  const toc = await readPage(GCNH.titlesPage, doFetch, retryWaits);
  await sleep(pauseMs);
  const titles = parseGcnhTitles(decodePage(toc.bytes)).filter(
    (t) => !options.titles || options.titles.includes(t.title),
  );
  if (titles.length === 0) throw new Error(`no titles in ${toc.url}`);
  report.titles = titles.length;
  const chapters: GcnhChapter[] = [];
  const tables: string[] = [decodePage(toc.bytes)];
  for (const { title } of titles) {
    try {
      const page = await readPage(titlePage(title), doFetch, retryWaits);
      const html = decodePage(page.bytes);
      tables.push(html);
      const listed = parseGcnhChapters(html, title).filter(
        (c) => !options.chapters || options.chapters.includes(c.chapter),
      );
      chapters.push(...listed);
    } catch (error) {
      report.failures.push({
        page: officialUrl(titlePage(title)),
        reason: error instanceof Error ? error.message : String(error),
      });
    }
    await sleep(pauseMs);
  }
  report.chapters = chapters.length;

  const before = await heldChapters(db);
  const rowsFor = (repealed: ReadonlySet<string>): ActRow[] =>
    chapters.map((c) => ({
      authority: GCNH.authority,
      kind: "statute",
      // The tables do not say a chapter was repealed; its page does, and once read that stands.
      inForce: !repealed.has(c.chapter),
      title: `RSA ${c.chapter} ${c.name}`,
      locale: GCNH.locale,
      identity: { scheme: "publisher_ref", value: identityOf(c.chapter) },
      systematicNumber: c.chapter,
      more: [{ scheme: "official_url", value: officialUrl(chapterPage(c)) }],
    }));
  const register = (repealed: ReadonlySet<string>) =>
    importRegister(db, {
      register: {
        key: `${GCNH.key}-register`,
        licenceSpdx: GCNH.licenceSpdx,
        identityScheme: "publisher_ref",
      },
      read: () => ({ rows: rowsFor(repealed), skipped: [] }),
      bytes: new TextEncoder().encode(tables.join("\n")),
      url: GCNH.homepage,
      retrievedAt: new Date(),
      snapshots,
      dryRun,
    });
  const repealedBefore = new Set(
    chapters
      .filter((c) => before.get(identityOf(c.chapter))?.inForce === false)
      .map((c) => c.chapter),
  );
  await register(repealedBefore);

  const held = await heldChapters(db);
  const todo = chapters.filter((c) => {
    const row = held.get(identityOf(c.chapter));
    if (row?.sha && !again) {
      report.alreadyHeld++;
      return false;
    }
    return dryRun || Boolean(row);
  });
  const repealedNow = new Set(repealedBefore);
  let attempted = 0;
  for (const c of todo) {
    if (report.stored >= limit) break;
    attempted++;
    const page = officialUrl(chapterPage(c));
    try {
      const fetched = await readPage(chapterPage(c), doFetch, retryWaits);
      if (fetched.copy) say(`${page}: refused, read from ${fetched.url}`);
      const row = held.get(identityOf(c.chapter));
      if (row?.sha === sha256Hex(fetched.bytes)) {
        report.unchanged++;
      } else {
        const { provisions, repealed } = parseGcnhChapter(decodePage(fetched.bytes), c.chapter);
        if (provisions.length === 0) throw new Error("no sections on the page");
        if (repealed) repealedNow.add(c.chapter);
        else repealedNow.delete(c.chapter);
        if (!dryRun) {
          await storeVersion(
            db,
            snapshots,
            {
              actId: row!.actId,
              lang: GCNH.locale,
              // A copy is dated by the day the archive captured it, a page read from the site by today.
              inForceFrom: fetched.copy?.capturedOn ?? today,
              dateBasis: "retrieved",
              status: GCNH.textStatus,
              format: "html",
              bytes: fetched.bytes,
              url: fetched.url,
              provisions,
              source: {
                key: GCNH.key,
                licenceSpdx: GCNH.licenceSpdx,
                importerVersion: `${GCNH_IMPORTER_VERSION}${fetched.copy ? "+archive" : ""}`,
              },
            },
            false,
          );
        }
        report.stored++;
        if (fetched.copy) report.fromArchive++;
        if (repealed) report.repealedChapters++;
        report.provisions += provisions.length;
        say(`RSA ${c.chapter}: ${repealed ? "repealed" : `${provisions.length} sections`}`);
      }
    } catch (error) {
      report.failures.push({
        page,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
    await sleep(pauseMs);
  }
  report.remaining = todo.length - attempted;

  // A chapter whose page now says it was repealed (or no longer says so) is marked so in the register.
  const changed =
    repealedNow.size !== repealedBefore.size ||
    [...repealedNow].some((c) => !repealedBefore.has(c));
  if (changed && !dryRun) await register(repealedNow);
  return report;
}

/**
 * Loads Wyoming's statutes and Constitution from the Legislative Service
 * Office's downloads (WYOLEG in src/lib/config/law): each title as an act of
 * the authority `us-wy`, and its text cut into sections. Safe to rerun and to
 * stop: a title whose text is held is not fetched again unless `again` is set,
 * and then a new version is stored only when the file's bytes changed. Each
 * version is dated by the day it was read, because the publisher states its
 * date only on its rendered page.
 */
import { and, eq, isNull } from "drizzle-orm";
import { WYOLEG } from "@/lib/config/law";
import type { Database } from "@/lib/db/client";
import { legalActIdentifiers, legalActVersions, legalActs } from "@/lib/db/law-schema";
import { sources } from "@/lib/db/places-schema";
import { sha256Hex, type SnapshotStore } from "@/lib/places/importer/snapshots";
import { importRegister, type ActRow } from "../register/import";
import { documentText } from "./cantonal";
import { storeVersion } from "./store";
import { parseWyolegProvisions } from "./wyoleg";

export const WYOLEG_IMPORTER_VERSION = "law-text-wyoleg-1";

export interface WyolegOptions {
  snapshots: SnapshotStore;
  limit?: number;
  dryRun?: boolean;
  /** Read titles already held again, storing a new version where the file changed. */
  again?: boolean;
  /** Only these titles, by file number ("15", "97"). */
  only?: readonly string[];
  /** The titles to read, by file number and name; every title the publisher offers by default. */
  titles?: readonly (readonly [string, string])[];
  today?: string;
  fetchImpl?: typeof fetch;
  pauseMs?: number;
  onProgress?: (message: string) => void;
}

export interface WyolegReport {
  status: "applied" | "dry_run";
  titles: number;
  alreadyHeld: number;
  unchanged: number;
  stored: number;
  provisions: number;
  remaining: number;
  failures: { title: string; reason: string }[];
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const identityOf = (title: string) => `${WYOLEG.key}:${title}`;
const urlOf = (title: string) => WYOLEG.fileUrl.replace("{title}", title);
/** The number a title goes by in a citation: 15, 34.1; the Constitution has none. */
const numberOf = (title: string) => (title === "97" ? null : title.replace(/^0/, ""));

/** Fetches one title's file, refusing any host the config does not name. */
async function fetchTitle(title: string, doFetch: typeof fetch): Promise<Uint8Array> {
  const url = urlOf(title);
  if (!(WYOLEG.hosts as readonly string[]).includes(new URL(url).hostname)) {
    throw new Error(`refusing to read ${url}`);
  }
  const res = await doFetch(url, {
    headers: { "user-agent": "Solon law reader (solon.orangecat.ch)" },
  });
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") {
    throw new Error(`${url} is not a PDF`);
  }
  return bytes;
}

export async function importWyoleg(db: Database, options: WyolegOptions): Promise<WyolegReport> {
  const { snapshots, dryRun = false, limit = Infinity, pauseMs = 1500, again = false } = options;
  const doFetch = options.fetchImpl ?? fetch;
  const say = options.onProgress ?? (() => undefined);
  const today = options.today ?? new Date().toISOString().slice(0, 10);
  const titles = (options.titles ?? WYOLEG.titles).filter(
    ([n]) => !options.only || options.only.includes(n),
  );
  const report: WyolegReport = {
    status: dryRun ? "dry_run" : "applied",
    titles: titles.length,
    alreadyHeld: 0,
    unchanged: 0,
    stored: 0,
    provisions: 0,
    remaining: 0,
    failures: [],
  };

  const rows: ActRow[] = titles.map(([title, name]) => ({
    authority: WYOLEG.authority,
    kind: title === "97" ? "constitution" : "statute",
    inForce: true,
    title: name,
    locale: WYOLEG.locale,
    identity: { scheme: "publisher_ref", value: identityOf(title) },
    systematicNumber: numberOf(title),
    more: [{ scheme: "official_url", value: urlOf(title) }],
  }));
  await importRegister(db, {
    register: {
      key: `${WYOLEG.key}-register`,
      licenceSpdx: WYOLEG.licenceSpdx,
      identityScheme: "publisher_ref",
    },
    read: () => ({ rows, skipped: [] }),
    bytes: new TextEncoder().encode(JSON.stringify(titles)),
    url: WYOLEG.homepage,
    retrievedAt: new Date(),
    snapshots,
    dryRun,
  });

  // What is held: each title's act, and the sha256 of the file its current version was read from.
  const held = new Map(
    (
      await db
        .select({
          identity: legalActIdentifiers.value,
          actId: legalActs.id,
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
            eq(legalActVersions.lang, WYOLEG.locale),
            isNull(legalActVersions.inForceTo),
          ),
        )
        .leftJoin(sources, eq(sources.id, legalActVersions.sourceId))
        .where(eq(legalActs.authority, WYOLEG.authority))
    ).map((row) => [row.identity, row]),
  );

  const todo = titles.filter(([title]) => {
    const row = held.get(identityOf(title));
    if (row?.sha && !again) {
      report.alreadyHeld++;
      return false;
    }
    return dryRun || Boolean(row);
  });
  let attempted = 0;
  for (const [title, name] of todo) {
    if (report.stored >= limit) break;
    attempted++;
    try {
      const bytes = await fetchTitle(title, doFetch);
      const row = held.get(identityOf(title));
      if (row?.sha === sha256Hex(bytes)) {
        report.unchanged++;
      } else {
        const provisions = parseWyolegProvisions(
          await documentText(bytes, "pdf"),
          title.replace(/^0/, ""),
        );
        if (provisions.length === 0) throw new Error("no sections in the file");
        if (!dryRun) {
          await storeVersion(
            db,
            snapshots,
            {
              actId: row!.actId,
              lang: WYOLEG.locale,
              inForceFrom: today,
              dateBasis: "retrieved",
              status: WYOLEG.textStatus,
              format: "pdf",
              bytes,
              url: urlOf(title),
              provisions,
              source: {
                key: WYOLEG.key,
                licenceSpdx: WYOLEG.licenceSpdx,
                importerVersion: WYOLEG_IMPORTER_VERSION,
              },
            },
            false,
          );
        }
        report.stored++;
        report.provisions += provisions.length;
        say(`${name}: ${provisions.length} sections`);
      }
    } catch (error) {
      report.failures.push({
        title,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
    await sleep(pauseMs);
  }
  report.remaining = todo.length - attempted;
  return report;
}

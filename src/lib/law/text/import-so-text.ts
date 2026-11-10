/**
 * Loads the text of the Republic of South Ossetia's acts the registers hold
 * (`import-so-registers.ts`): the Parliament's node pages and the President's
 * posts, each cut into articles (`so-text.ts`) and stored as the version dated
 * by the day the publisher gives: the Parliament's own date field, the day a
 * decree is signed. Safe to rerun and to stop: an act with a version held is
 * not fetched again, so a run limited to N continues where the last stopped.
 * Paced by the Parliament's robots.txt crawl-delay (90 s) and, for the
 * President, a second between requests.
 *
 * The date is the one printed on the act; the publishers do not state when an
 * act took effect, and a text is the one printed with its amendments (if any)
 * as separate acts, not a consolidated reading.
 */
import { and, eq, isNull, like } from "drizzle-orm";
import { PARLIAMENTRSO, PRESIDENTRUO } from "@/lib/config/law";
import type { Database } from "@/lib/db/client";
import { legalActIdentifiers, legalActVersions, legalActs } from "@/lib/db/law-schema";
import type { SnapshotStore } from "@/lib/places/importer/snapshots";
import { reasonOf } from "./import-riigiteataja";
import { storeVersion } from "./store";
import { cutProvisions, linesOf, numberOf, parseNode, postText, signedOn } from "./so-text";
import { crawlDelayMs } from "./ukleg";

export const SO_TEXT_IMPORTER_VERSION = "law-text-so-1";

export type SoPublisher = "parliamentrso" | "presidentruo";

export interface SoTextOptions {
  snapshots: SnapshotStore;
  limit?: number;
  dryRun?: boolean;
  today?: string;
  fetchImpl?: typeof fetch;
  pauseMs?: number;
  onProgress?: (message: string) => void;
}

export interface SoTextReport {
  status: "applied" | "dry_run";
  publisher: SoPublisher;
  acts: number;
  alreadyHeld: number;
  stored: number;
  provisions: number;
  remaining: number;
  /** Acts whose date was not printed in the act and fell back to the day it was read or the site's. */
  dateFallbacks: number;
  failures: { act: string; reason: string }[];
  failureReasons: Record<string, number>;
  stoppedBecause?: string;
}

const REFUSALS_BEFORE_STOP = 10;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function importSoText(
  db: Database,
  publisher: SoPublisher,
  options: SoTextOptions,
): Promise<SoTextReport> {
  const config = publisher === "parliamentrso" ? PARLIAMENTRSO : PRESIDENTRUO;
  const doFetch = options.fetchImpl ?? fetch;
  const say = options.onProgress ?? (() => undefined);
  const limit = options.limit ?? Infinity;
  const today = options.today ?? new Date().toISOString().slice(0, 10);
  const report: SoTextReport = {
    status: options.dryRun ? "dry_run" : "applied",
    publisher,
    acts: 0,
    alreadyHeld: 0,
    stored: 0,
    provisions: 0,
    remaining: 0,
    dateFallbacks: 0,
    failures: [],
    failureReasons: {},
  };

  let pauseMs = options.pauseMs;
  if (pauseMs === undefined) {
    pauseMs = publisher === "presidentruo" ? PRESIDENTRUO.pauseMs : 5000;
    if (publisher === "parliamentrso") {
      const robots = await doFetch(PARLIAMENTRSO.robotsUrl, {
        headers: { "user-agent": config.userAgent },
        signal: AbortSignal.timeout(30_000),
      });
      if (!robots.ok) throw new Error(`robots.txt answered ${robots.status}`);
      pauseMs = crawlDelayMs(await robots.text()) ?? pauseMs;
      say(`pace: ${pauseMs / 1000} s between requests (robots.txt)`);
    }
  }

  const prefix = `${config.key}:`;
  const acts = await db
    .select({ actId: legalActs.id, identity: legalActIdentifiers.value })
    .from(legalActs)
    .innerJoin(
      legalActIdentifiers,
      and(
        eq(legalActIdentifiers.actId, legalActs.id),
        eq(legalActIdentifiers.scheme, "publisher_ref"),
        isNull(legalActIdentifiers.supersededAt),
      ),
    )
    .where(
      and(eq(legalActs.authority, config.authority), like(legalActIdentifiers.value, `${prefix}%`)),
    );
  report.acts = acts.length;
  const held = new Set(
    (
      await db
        .select({ actId: legalActVersions.actId })
        .from(legalActVersions)
        .innerJoin(legalActs, eq(legalActs.id, legalActVersions.actId))
        .where(
          and(eq(legalActs.authority, config.authority), eq(legalActVersions.lang, config.locale)),
        )
    ).map((r) => r.actId),
  );
  const todo = acts
    .filter((a) => {
      if (held.has(a.actId)) {
        report.alreadyHeld++;
        return false;
      }
      return true;
    })
    // Oldest first, by the publisher's number: the same acts again on a rerun.
    .sort(
      (a, b) => Number(a.identity.slice(prefix.length)) - Number(b.identity.slice(prefix.length)),
    );

  let attempted = 0;
  let refusedInARow = 0;
  for (const act of todo) {
    if (report.stored >= limit) break;
    if (refusedInARow >= REFUSALS_BEFORE_STOP) {
      report.stoppedBecause = report.failures.at(-1)?.reason;
      break;
    }
    attempted++;
    const id = act.identity.slice(prefix.length);
    try {
      const url =
        publisher === "parliamentrso"
          ? PARLIAMENTRSO.pageUrl.replace("{id}", id)
          : PRESIDENTRUO.postUrl.replace("{id}", id);
      if (!(config.hosts as readonly string[]).includes(new URL(url).hostname)) {
        throw new Error(`refusing to read ${url}`);
      }
      const res = await doFetch(url, {
        headers: { "user-agent": config.userAgent },
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) throw new Error(`the act answered ${res.status}`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      const raw = new TextDecoder().decode(bytes);

      let text: string;
      let day: string | null;
      let dateBasis: "publisher" | "retrieved" = "publisher";
      if (publisher === "parliamentrso") {
        const node = parseNode(raw);
        if (!node) throw new Error("not an act page");
        text = linesOf(node.bodyHtml);
        day = node.enacted;
      } else {
        const post = postText(JSON.parse(raw));
        text = post.text;
        // The decree's own day when it prints one; else the day the site dated the post.
        day = signedOn(text) ?? post.date;
        if (!signedOn(text)) report.dateFallbacks++;
      }
      if (!day) {
        day = today;
        dateBasis = "retrieved";
        report.dateFallbacks++;
      }
      const provisions = cutProvisions(text);
      if (provisions.length === 0) throw new Error("no text in the act");
      const number = numberOf(text);
      await storeVersion(
        db,
        options.snapshots,
        {
          actId: act.actId,
          lang: config.locale,
          inForceFrom: day,
          dateBasis,
          status: config.textStatus,
          format: publisher === "parliamentrso" ? "html" : "json",
          bytes,
          url,
          provisions,
          source: {
            key: config.key,
            licenceSpdx: config.licenceSpdx,
            importerVersion: SO_TEXT_IMPORTER_VERSION,
          },
          ...(number
            ? { identifier: { scheme: "act_number", value: `${day.slice(0, 4)}/${number}` } }
            : {}),
        },
        options.dryRun ?? false,
      );
      report.stored++;
      report.provisions += provisions.length;
      refusedInARow = 0;
      say(`${id}: ${provisions.length} provisions, ${day}`);
    } catch (error) {
      const reason = reasonOf(error);
      report.failures.push({ act: id, reason });
      const kind = reason.replace(/\d+/g, "N").slice(0, 120);
      report.failureReasons[kind] = (report.failureReasons[kind] ?? 0) + 1;
      refusedInARow = /answered \d+|fetch failed|timeout/i.test(reason) ? refusedInARow + 1 : 0;
    }
    await sleep(pauseMs);
  }
  report.remaining = todo.length - attempted;
  return report;
}

/**
 * Loads the law of the communes that keep it in a LexWork collection (config
 * LEXWORK) into the register: each commune's acts as acts of its authority,
 * and every version the collection dates, oldest first, cut into articles. The
 * collection states the day each version took effect, so versions are dated by
 * the publisher. Safe to rerun and to stop: a version already held is not
 * stored again, and a newer one closes the one before it.
 */
import { and, eq, isNull } from "drizzle-orm";
import { LEXWORK } from "@/lib/config/law";
import type { Database } from "@/lib/db/client";
import { legalActIdentifiers, legalActs, legalActVersions } from "@/lib/db/law-schema";
import type { SnapshotStore } from "@/lib/places/importer/snapshots";
import { importRegister, type ActRow } from "../register/import";
import {
  fetchLexworkAct,
  fetchLexworkIndex,
  fetchLexworkPdf,
  parseLexworkProvisions,
  versionsToHold,
  type LexworkAct,
} from "./lexwork";
import { provisionsOfPdf } from "./pdf-provisions";
import { dayBefore, storeVersion } from "./store";

export const LEXWORK_IMPORTER_VERSION = "law-text-lexwork-1";

export interface LexworkOptions {
  snapshots: SnapshotStore;
  /** The day reading happens: versions that begin later are not yet in force. */
  today: string;
  /** Only this host (zug.tlex.ch). */
  host?: string;
  /** Stop after this many versions stored. */
  limit?: number;
  dryRun?: boolean;
  fetchImpl?: typeof fetch;
  pauseMs?: number;
  onProgress?: (message: string) => void;
}

export interface LexworkReport {
  status: "applied" | "dry_run";
  communes: { host: string; acts: number; stored: number }[];
  versionsStored: number;
  provisions: number;
  remaining: boolean;
  failures: { act: string; reason: string }[];
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const refOf = (host: string, systematicNumber: string) => `lexwork:${host}:${systematicNumber}`;

export async function importLexwork(db: Database, options: LexworkOptions): Promise<LexworkReport> {
  const { snapshots, today, dryRun = false, limit = Infinity, pauseMs = 400 } = options;
  const doFetch = options.fetchImpl ?? fetch;
  const say = options.onProgress ?? (() => undefined);
  const report: LexworkReport = {
    status: dryRun ? "dry_run" : "applied",
    communes: [],
    versionsStored: 0,
    provisions: 0,
    remaining: false,
    failures: [],
  };

  const instances = LEXWORK.instances.filter((i) => !options.host || i.host === options.host);
  if (instances.length === 0) throw new Error(`no LexWork instance ${options.host ?? ""}`);

  for (const instance of instances) {
    if (report.versionsStored >= limit) {
      report.remaining = true;
      break;
    }
    const { host, authority } = instance;
    const listed = await fetchLexworkIndex(host, doFetch);
    const rows: ActRow[] = listed.map((a) => ({
      authority,
      kind: "communal_act",
      inForce: !a.abrogated,
      title: a.title,
      locale: LEXWORK.locale,
      identity: { scheme: "publisher_ref", value: refOf(host, a.systematicNumber) },
      systematicNumber: a.systematicNumber,
      more: [
        {
          scheme: "official_url",
          value: `https://${host}/app/${LEXWORK.locale}/texts_of_law/${encodeURIComponent(a.systematicNumber)}`,
        },
      ],
    }));
    await importRegister(db, {
      register: {
        key: `${LEXWORK.key}-${host}-register`,
        licenceSpdx: LEXWORK.licenceSpdx,
        identityScheme: "publisher_ref",
      },
      read: () => ({ rows, skipped: [] }),
      bytes: new TextEncoder().encode(JSON.stringify(listed)),
      url: `https://${host}/api/${LEXWORK.locale}/texts_of_law/lightweight_index`,
      retrievedAt: new Date(),
      snapshots,
      dryRun,
    });
    const commune = { host, acts: listed.length, stored: 0 };
    report.communes.push(commune);
    if (dryRun) continue;

    const actIds = new Map(
      (
        await db
          .select({ actId: legalActs.id, ref: legalActIdentifiers.value })
          .from(legalActs)
          .innerJoin(
            legalActIdentifiers,
            and(
              eq(legalActIdentifiers.actId, legalActs.id),
              eq(legalActIdentifiers.scheme, "publisher_ref"),
              isNull(legalActIdentifiers.supersededAt),
            ),
          )
          .where(eq(legalActs.authority, authority))
      ).map((r) => [r.ref, r.actId]),
    );
    const heldRows = await db
      .select({ actId: legalActVersions.actId, from: legalActVersions.inForceFrom })
      .from(legalActVersions)
      .innerJoin(legalActs, eq(legalActs.id, legalActVersions.actId))
      .where(and(eq(legalActs.authority, authority), eq(legalActVersions.lang, LEXWORK.locale)));
    const held = new Map<string, Set<string>>();
    for (const r of heldRows) {
      const set = held.get(r.actId) ?? new Set<string>();
      set.add(String(r.from));
      held.set(r.actId, set);
    }

    for (const listedAct of listed) {
      if (listedAct.abrogated) continue;
      if (report.versionsStored >= limit) {
        report.remaining = true;
        break;
      }
      const actId = actIds.get(refOf(host, listedAct.systematicNumber));
      if (!actId) continue;
      try {
        const current = await fetchLexworkAct(host, listedAct.systematicNumber, undefined, doFetch);
        await sleep(pauseMs);
        if (!current) throw new Error("no such act");
        const wanted = versionsToHold(current.act, today);
        const have = held.get(actId) ?? new Set<string>();
        const currentId = current.act.text_of_law.current_version.id;
        for (const [i, version] of wanted.entries()) {
          if (have.has(version.inForceFrom!)) continue;
          let source: { act: LexworkAct; bytes: Uint8Array } | null = current;
          if (version.id !== currentId) {
            source = await fetchLexworkAct(host, listedAct.systematicNumber, version.id, doFetch);
            await sleep(pauseMs);
          }
          if (!source) throw new Error(`version ${version.id} not served`);
          let provisions = parseLexworkProvisions(source.act);
          let format: "json" | "pdf" = "json";
          let bytes = source.bytes;
          if (provisions.length === 0) {
            // Older versions are held only as a PDF.
            const pdf = await fetchLexworkPdf(host, source.act, doFetch);
            await sleep(pauseMs);
            if (pdf) {
              provisions = (await provisionsOfPdf(pdf, LEXWORK.locale)).provisions;
              format = "pdf";
              bytes = pdf;
            }
          }
          if (provisions.length === 0) throw new Error(`version ${version.id}: no text`);
          const next = wanted[i + 1];
          await storeVersion(
            db,
            snapshots,
            {
              actId,
              lang: LEXWORK.locale,
              inForceFrom: version.inForceFrom!,
              // An earlier version ends the day before the next begins; the latest ends only when the collection says.
              inForceTo: next ? dayBefore(next.inForceFrom!) : undefined,
              dateBasis: "publisher",
              status: LEXWORK.textStatus,
              format,
              bytes,
              url: current.act.text_of_law.canonical_link,
              provisions,
              source: {
                key: LEXWORK.key,
                licenceSpdx: LEXWORK.licenceSpdx,
                importerVersion: LEXWORK_IMPORTER_VERSION,
              },
            },
            false,
          );
          have.add(version.inForceFrom!);
          held.set(actId, have);
          commune.stored++;
          report.versionsStored++;
          report.provisions += provisions.length;
          say(
            `${host} ${listedAct.systematicNumber} ${version.inForceFrom}: ${provisions.length} provisions`,
          );
        }
      } catch (error) {
        report.failures.push({
          act: `${host} ${listedAct.systematicNumber}`,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
  return report;
}

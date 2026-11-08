/**
 * Cuts the acts already held again, from the bytes they were read from, when a
 * cutter improves (cantonal.ts, eurlex.ts): no publisher is asked again.
 * A version is re-cut once per reader version; its provisions are replaced
 * only when the new cut finds more of them, so a better reader can only add
 * structure, never lose it. Every provision's text still comes from the
 * snapshot its version cites.
 */
import { and, eq, inArray, isNull, notInArray, sql } from "drizzle-orm";
import { CANTONAL_DOCUMENTS, EURLEX } from "@/lib/config/law";
import type { Database } from "@/lib/db/client";
import { legalActs, legalActVersions, legalProvisions } from "@/lib/db/law-schema";
import { sources } from "@/lib/db/places-schema";
import type { SnapshotStore } from "@/lib/places/importer/snapshots";
import { cleanPdfText, documentText, parseCantonalProvisions } from "./cantonal";
import { parseEurLexHtml } from "./eurlex";
import type { Provision } from "./fedlex";
import { CANTONAL_IMPORTER_VERSION, cantonalAuthorities } from "./import-cantonal";
import { EURLEX_IMPORTER_VERSION } from "./import-eurlex";

export interface RecutReport {
  status: "applied" | "dry_run";
  examined: number;
  improved: number;
  provisionsBefore: number;
  provisionsAfter: number;
  remaining: number;
  failures: { version: string; reason: string }[];
}

interface RecutOptions {
  snapshots: SnapshotStore;
  authority?: string;
  limit?: number;
  dryRun?: boolean;
  onProgress?: (message: string) => void;
}

/** What a recut needs to know about one reader: whose texts, its current version, how it cuts. */
interface Reader {
  sourceKey: string;
  importerVersion: string;
  authorities: string[];
  cut: (bytes: Uint8Array, format: string) => Promise<Provision[]>;
}

export async function recutCantonalText(db: Database, options: RecutOptions): Promise<RecutReport> {
  return recutTexts(db, options, {
    sourceKey: CANTONAL_DOCUMENTS.key,
    importerVersion: CANTONAL_IMPORTER_VERSION,
    authorities: options.authority ? [options.authority] : cantonalAuthorities(),
    cut: async (bytes, format) =>
      parseCantonalProvisions(
        cleanPdfText(await documentText(bytes, format === "pdf" ? "pdf" : "html")),
      ),
  });
}

/** The EU acts held, cut again from the EUR-Lex pages they were read from (eurlex.ts). */
export async function recutEurLexText(db: Database, options: RecutOptions): Promise<RecutReport> {
  return recutTexts(db, options, {
    sourceKey: EURLEX.key,
    importerVersion: EURLEX_IMPORTER_VERSION,
    authorities: [EURLEX.authority],
    cut: async (bytes) => parseEurLexHtml(new TextDecoder().decode(bytes)),
  });
}

async function recutTexts(
  db: Database,
  options: RecutOptions,
  reader: Reader,
): Promise<RecutReport> {
  const { snapshots, dryRun = false, limit = Infinity } = options;
  const say = options.onProgress ?? (() => undefined);
  const report: RecutReport = {
    status: dryRun ? "dry_run" : "applied",
    examined: 0,
    improved: 0,
    provisionsBefore: 0,
    provisionsAfter: 0,
    remaining: 0,
    failures: [],
  };
  const authorities = reader.authorities;
  // A version read from an archive copy keeps that mark (importerVersion "…+archive").
  const current = [reader.importerVersion, `${reader.importerVersion}+archive`];
  const todo = await db
    .select({
      versionId: legalActVersions.id,
      format: legalActVersions.format,
      sourceId: sources.id,
      snapshotKey: sources.snapshotKey,
      importerVersion: sources.importerVersion,
      authority: legalActs.authority,
      held: sql<number>`(SELECT count(*)::int FROM legal_provisions p WHERE p.version_id = ${legalActVersions.id})`,
    })
    .from(legalActVersions)
    .innerJoin(sources, eq(sources.id, legalActVersions.sourceId))
    .innerJoin(legalActs, eq(legalActs.id, legalActVersions.actId))
    .where(
      and(
        isNull(legalActVersions.inForceTo),
        eq(sources.sourceKey, reader.sourceKey),
        notInArray(sources.importerVersion, current),
        inArray(legalActs.authority, authorities),
      ),
    );
  for (const row of todo) {
    if (report.examined >= limit) break;
    report.examined++;
    try {
      const bytes = await snapshots.get(row.snapshotKey);
      const provisions = await reader.cut(bytes, row.format);
      report.provisionsBefore += row.held;
      const better = provisions.length > row.held;
      report.provisionsAfter += better ? provisions.length : row.held;
      if (better) {
        report.improved++;
        say(`${row.authority} ${row.versionId}: ${row.held} → ${provisions.length} provisions`);
      }
      if (dryRun) continue;
      await db.transaction(async (tx) => {
        if (better) {
          await tx.delete(legalProvisions).where(eq(legalProvisions.versionId, row.versionId));
          for (let i = 0; i < provisions.length; i += 500)
            await tx.insert(legalProvisions).values(
              provisions.slice(i, i + 500).map((p, j) => ({
                versionId: row.versionId,
                path: p.path,
                heading: p.heading,
                text: p.text,
                ord: i + j,
              })),
            );
        }
        // Read by this reader now, whether or not it found more.
        await tx
          .update(sources)
          .set({
            importerVersion: row.importerVersion?.endsWith("+archive")
              ? `${reader.importerVersion}+archive`
              : reader.importerVersion,
          })
          .where(eq(sources.id, row.sourceId));
      });
    } catch (error) {
      report.failures.push({
        version: row.versionId,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }
  report.remaining = todo.length - report.examined;
  return report;
}

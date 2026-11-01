/**
 * Cuts the cantonal acts already held again, from the bytes they were read
 * from, when the cutter improves (cantonal.ts): no publisher is asked again.
 * A version is re-cut once per reader version; its provisions are replaced
 * only when the new cut finds more of them, so a better reader can only add
 * structure, never lose it. Every provision's text still comes from the
 * snapshot its version cites.
 */
import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { CANTONAL_DOCUMENTS } from "@/lib/config/law";
import type { Database } from "@/lib/db/client";
import { legalActs, legalActVersions, legalProvisions } from "@/lib/db/law-schema";
import { sources } from "@/lib/db/places-schema";
import type { SnapshotStore } from "@/lib/places/importer/snapshots";
import { cleanPdfText, documentText, parseCantonalProvisions } from "./cantonal";
import { CANTONAL_IMPORTER_VERSION, cantonalAuthorities } from "./import-cantonal";

export interface RecutReport {
  status: "applied" | "dry_run";
  examined: number;
  improved: number;
  provisionsBefore: number;
  provisionsAfter: number;
  remaining: number;
  failures: { version: string; reason: string }[];
}

export async function recutCantonalText(
  db: Database,
  options: {
    snapshots: SnapshotStore;
    authority?: string;
    limit?: number;
    dryRun?: boolean;
    onProgress?: (message: string) => void;
  },
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
  const authorities = options.authority ? [options.authority] : cantonalAuthorities();
  const todo = await db
    .select({
      versionId: legalActVersions.id,
      format: legalActVersions.format,
      sourceId: sources.id,
      snapshotKey: sources.snapshotKey,
      authority: legalActs.authority,
      held: sql<number>`(SELECT count(*)::int FROM legal_provisions p WHERE p.version_id = ${legalActVersions.id})`,
    })
    .from(legalActVersions)
    .innerJoin(sources, eq(sources.id, legalActVersions.sourceId))
    .innerJoin(legalActs, eq(legalActs.id, legalActVersions.actId))
    .where(
      and(
        isNull(legalActVersions.inForceTo),
        eq(sources.sourceKey, CANTONAL_DOCUMENTS.key),
        ne(sources.importerVersion, CANTONAL_IMPORTER_VERSION),
        inArray(legalActs.authority, authorities),
      ),
    );
  for (const row of todo) {
    if (report.examined >= limit) break;
    report.examined++;
    try {
      const bytes = await snapshots.get(row.snapshotKey);
      const kind = row.format === "pdf" ? "pdf" : "html";
      const provisions = parseCantonalProvisions(cleanPdfText(await documentText(bytes, kind)));
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
          .set({ importerVersion: CANTONAL_IMPORTER_VERSION })
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

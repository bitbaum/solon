/**
 * The scheduled import as a queue (schedule.ts, importQueue): one worker per
 * process fetches every source the run log says is behind, in registry order,
 * until the queue is empty or its time is up. The hourly timer starts it and
 * does not wait for it: a publisher that takes minutes to answer, or a few
 * hundred sources due on one day, never outlasts an HTTP request.
 *
 * Every attempt is in `place_import_runs`: an import records itself, and a
 * fetch that failed before any import (the publisher was down) is recorded
 * here, so the queue knows to try again later and a reader of the log sees it.
 */
import { sql } from "drizzle-orm";
import type { PlacesConfig } from "@/lib/config/places/schema";
import type { Database } from "@/lib/db/client";
import { placeImportRuns } from "@/lib/db/places-schema";
import { rowsOf } from "@/lib/db/rows";
import { ADAPTERS } from "../adapters";
import { importQueue, type SourceRuns } from "../schedule";
import { fetchAndImport } from "./fetch";
import { refreshAncestors } from "./run";
import type { GeometryStore } from "./geometry-store";
import type { SnapshotStore } from "./snapshots";

/** What the run log says of every source: its latest finished run and its failures in a row. */
export async function sourceRuns(db: Database): Promise<Map<string, SourceRuns>> {
  const rows = rowsOf<{
    source_key: string;
    status: "applied" | "failed";
    started_at: Date | string;
  }>(
    await db.execute(sql`
      SELECT source_key, status, started_at FROM place_import_runs
      WHERE status IN ('applied', 'failed')
      ORDER BY source_key, started_at DESC`),
  );
  const out = new Map<string, SourceRuns>();
  const counting = new Set<string>();
  for (const r of rows) {
    let state = out.get(r.source_key);
    if (!state) {
      state = { latest: { status: r.status, at: new Date(r.started_at) }, failuresInARow: 0 };
      out.set(r.source_key, state);
      counting.add(r.source_key);
    }
    if (!counting.has(r.source_key)) continue;
    if (r.status === "failed") state.failuresInARow += 1;
    else counting.delete(r.source_key);
  }
  return out;
}

export interface QueueOptions {
  config: PlacesConfig;
  snapshots: SnapshotStore;
  geometry?: GeometryStore;
  gitSha?: string | null;
  /** Stop starting new sources after this long; the next start takes the rest. */
  budgetMs: number;
  now?: () => Date;
  fetchSource?: typeof fetchAndImport;
}

export interface QueueReport {
  queued: number;
  ran: { source: string; status: "applied" | "failed"; problems: string[] }[];
}

const fetchable = (source: { adapter: string }) =>
  Boolean(ADAPTERS.get(source.adapter)?.retrievals);

/** The sources behind right now. */
export const pendingSources = async (db: Database, config: PlacesConfig, now = new Date()) =>
  importQueue(config, await sourceRuns(db), now, fetchable);

// The day this process last rebuilt the ancestors view.
const state = globalThis as unknown as { solonAncestorsDay?: string };

export async function drainQueue(db: Database, options: QueueOptions): Promise<QueueReport> {
  const now = options.now ?? (() => new Date());
  const started = now().getTime();
  // An import rebuilds the ancestors view only when it moved a place; a relation that starts or
  // ends on a later day moves one without any import, so the view is also rebuilt once a day.
  const today = now().toISOString().slice(0, 10);
  if (state.solonAncestorsDay !== today) {
    await refreshAncestors(db);
    state.solonAncestorsDay = today;
  }
  const fetchSource = options.fetchSource ?? fetchAndImport;
  const queue = await pendingSources(db, options.config, now());
  const report: QueueReport = { queued: queue.length, ran: [] };
  for (const source of queue) {
    if (now().getTime() - started >= options.budgetMs) break;
    try {
      const reports = await fetchSource(db, {
        config: options.config,
        sourceKey: source.key,
        today: now().toISOString().slice(0, 10),
        snapshots: options.snapshots,
        geometry: options.geometry,
        gitSha: options.gitSha,
      });
      const failed = reports.find((r) => r.status === "failed");
      report.ran.push({
        source: source.key,
        status: failed ? "failed" : "applied",
        problems: failed?.problems ?? [],
      });
    } catch (error) {
      const problem = error instanceof Error ? error.message : String(error);
      await db.insert(placeImportRuns).values({
        sourceKey: source.key,
        status: "failed",
        report: { problems: [problem], stage: "fetch" },
        finishedAt: now(),
      });
      report.ran.push({ source: source.key, status: "failed", problems: [problem] });
    }
  }
  return report;
}

/** Runs failed since `since`, for the timer's answer: what the last hour's work could not load. */
export async function failedSince(
  db: Database,
  since: Date,
): Promise<{ source: string; problems: unknown }[]> {
  const rows = rowsOf<{ source_key: string; problems: unknown }>(
    await db.execute(sql`
      SELECT source_key, report->'problems' AS problems FROM place_import_runs
      WHERE status = 'failed' AND finished_at > (${since.toISOString()}::timestamptz AT TIME ZONE 'UTC')
      ORDER BY finished_at`),
  );
  return rows.map((r) => ({ source: r.source_key, problems: r.problems }));
}

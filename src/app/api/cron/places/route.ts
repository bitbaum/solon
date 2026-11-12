import { after, NextResponse } from "next/server";
import { placesConfig } from "@/lib/config/places";
import { isCronRequest } from "@/lib/cron-auth";
import { db } from "@/lib/db/client";
import { fetchAndImport } from "@/lib/places/importer/fetch";
import { drainQueue, failedSince, pendingSources } from "@/lib/places/importer/queue";
import { defaultSnapshotStore } from "@/lib/places/importer/snapshots";
import { STATISTIC_RECORDS } from "@/lib/config/statistics/records";
import { syncStatisticRecords } from "@/lib/statistics/sync";

export const dynamic = "force-dynamic";

/** How long one worker keeps starting sources; the next hour's call takes what is left. */
const WORKER_BUDGET_MS = 50 * 60_000;
/** The timer calls hourly; failures are reported once, over a little more than that. */
const REPORT_WINDOW_MS = 65 * 60_000;

// One worker per process: an hourly call that finds one still at work starts no second.
const state = globalThis as unknown as { solonImportWorker?: Promise<unknown> | null };

/**
 * The scheduled Places import (design §8.3). The box's appcron timer calls it
 * every hour. The call starts a worker that fetches every source the run log
 * says is behind (src/lib/places/importer/queue.ts) and answers at once: the
 * work goes on after the answer, each attempt recorded in
 * `place_import_runs`. It answers 500 when a run failed since the last call,
 * so the timer's failure alert fires once per failure. `?source=<key>` runs
 * one source now and waits for it. No model is called: this only fetches
 * public registers.
 *
 * Every call first writes the curated statistics records (links from series
 * to the law) into their append-only log, so a record merged reaches
 * production within the hour; a place not loaded yet leaves its record for a
 * later run.
 */
export async function POST(request: Request) {
  if (!isCronRequest(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const today = new Date().toISOString().slice(0, 10);
  const gitSha = process.env.GIT_SHA ?? null;

  let statistics: Awaited<ReturnType<typeof syncStatisticRecords>> | { error: string };
  try {
    statistics = await syncStatisticRecords(db, STATISTIC_RECORDS, { gitSha });
  } catch (error) {
    statistics = { error: error instanceof Error ? error.message : String(error) };
  }

  const only = new URL(request.url).searchParams.get("source");
  if (only) {
    if (!placesConfig.sources.some((s) => s.key === only)) {
      return NextResponse.json(
        { error: `source "${only}" is not in the registry` },
        { status: 404 },
      );
    }
    let runs: { status: string; problems: string[] }[];
    try {
      const reports = await fetchAndImport(db, {
        config: placesConfig,
        sourceKey: only,
        today,
        snapshots: defaultSnapshotStore(),
        gitSha,
      });
      runs = reports.map((r) => ({ status: r.status, problems: r.problems }));
    } catch (error) {
      runs = [
        { status: "failed", problems: [error instanceof Error ? error.message : String(error)] },
      ];
    }
    const failed = "error" in statistics || runs.some((r) => r.status === "failed");
    return NextResponse.json(
      { today, statistics, source: only, runs },
      { status: failed ? 500 : 200 },
    );
  }

  const failures = await failedSince(db, new Date(Date.now() - REPORT_WINDOW_MS));
  const pending = (await pendingSources(db, placesConfig)).map((s) => s.key);
  const busy = Boolean(state.solonImportWorker);
  if (!busy && pending.length > 0) {
    const worker = drainQueue(db, {
      config: placesConfig,
      snapshots: defaultSnapshotStore(),
      gitSha,
      budgetMs: WORKER_BUDGET_MS,
    })
      .catch((error) => console.error("[places import worker]", error))
      .finally(() => {
        state.solonImportWorker = null;
      });
    state.solonImportWorker = worker;
    // Keeps the work alive after the answer is sent.
    after(() => worker);
  }
  const failed = "error" in statistics || failures.length > 0;
  return NextResponse.json(
    { today, statistics, busy, started: !busy && pending.length > 0, pending, failures },
    { status: failed ? 500 : 200 },
  );
}

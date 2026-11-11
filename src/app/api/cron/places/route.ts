import { NextResponse } from "next/server";
import { placesConfig } from "@/lib/config/places";
import { isCronRequest } from "@/lib/cron-auth";
import { db } from "@/lib/db/client";
import { ADAPTERS } from "@/lib/places/adapters";
import { fetchAndImport } from "@/lib/places/importer/fetch";
import { defaultSnapshotStore } from "@/lib/places/importer/snapshots";
import { dueSources, firstLoads } from "@/lib/places/schedule";
import { sql } from "drizzle-orm";
import { rowsOf } from "@/lib/db/rows";
import { STATISTIC_RECORDS } from "@/lib/config/statistics/records";
import { syncStatisticRecords } from "@/lib/statistics/sync";

export const dynamic = "force-dynamic";

/**
 * Sources not to load for the first time today: those with an applied run,
 * and those whose run failed this past week (a source waiting on another is
 * tried again weekly, not daily, so the failure alert does not fire every day).
 */
async function loadedSources(): Promise<Set<string>> {
  const rows = rowsOf<{ source_key: string }>(
    await db.execute(
      sql`SELECT DISTINCT source_key FROM place_import_runs
          WHERE status = 'applied' OR (status = 'failed' AND started_at > now() - INTERVAL '7 days')`,
    ),
  );
  return new Set(rows.map((r) => r.source_key));
}

/**
 * The scheduled Places import (design §8.3). The box's appcron timer calls it
 * once a day; each source whose cadence names today is fetched and imported in
 * registry order, and a few sources never loaded yet (schedule.ts, firstLoads), recorded in `place_import_runs` like a run by hand. A failed
 * run answers 500, so the timer's failure alert fires. `?source=<key>` runs
 * one source now, whatever its cadence. No model is called: this only fetches
 * public registers.
 *
 * Every run first writes the curated statistics records (links from series to
 * the law) into their append-only log, so a record merged reaches production
 * the next morning; a place not loaded yet leaves its record for a later run.
 */
export async function POST(request: Request) {
  if (!isCronRequest(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const today = new Date().toISOString().slice(0, 10);
  const only = new URL(request.url).searchParams.get("source");
  const fetchable = (source: { adapter: string }) =>
    Boolean(ADAPTERS.get(source.adapter)?.retrievals);
  const sources = only
    ? placesConfig.sources.filter((s) => s.key === only)
    : [
        ...dueSources(placesConfig, today),
        // A source never loaded is loaded now, a few a day, not on its day of the month.
        ...firstLoads(placesConfig, await loadedSources(), today, fetchable),
      ];
  if (only && sources.length === 0) {
    return NextResponse.json({ error: `source "${only}" is not in the registry` }, { status: 404 });
  }

  let statistics: Awaited<ReturnType<typeof syncStatisticRecords>> | { error: string };
  try {
    statistics = await syncStatisticRecords(db, STATISTIC_RECORDS, {
      gitSha: process.env.GIT_SHA ?? null,
    });
  } catch (error) {
    statistics = { error: error instanceof Error ? error.message : String(error) };
  }

  const results = [];
  for (const source of sources) {
    if (!ADAPTERS.get(source.adapter)?.retrievals) {
      continue;
    }
    try {
      const reports = await fetchAndImport(db, {
        config: placesConfig,
        sourceKey: source.key,
        today,
        snapshots: defaultSnapshotStore(),
        gitSha: process.env.GIT_SHA ?? null,
      });
      results.push({
        source: source.key,
        runs: reports.map((r) => ({
          runId: r.runId,
          status: r.status,
          changes: Object.fromEntries(Object.entries(r.counts).filter(([, n]) => n > 0)),
          problems: r.problems,
        })),
      });
    } catch (error) {
      // A fetch that fails before any import (the publisher is down) leaves no run row.
      results.push({
        source: source.key,
        runs: [
          { status: "failed", problems: [error instanceof Error ? error.message : String(error)] },
        ],
      });
    }
  }
  const failed =
    "error" in statistics || results.some((r) => r.runs.some((run) => run.status === "failed"));
  return NextResponse.json({ today, statistics, results }, { status: failed ? 500 : 200 });
}

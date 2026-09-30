import { NextResponse } from "next/server";
import { placesConfig } from "@/lib/config/places";
import { isCronRequest } from "@/lib/cron-auth";
import { db } from "@/lib/db/client";
import { ADAPTERS } from "@/lib/places/adapters";
import { fetchAndImport } from "@/lib/places/importer/fetch";
import { defaultSnapshotStore } from "@/lib/places/importer/snapshots";
import { dueSources } from "@/lib/places/schedule";

export const dynamic = "force-dynamic";

/**
 * The scheduled Places import (design §8.3). The box's appcron timer calls it
 * once a day; each source whose cadence names today is fetched and imported in
 * registry order, recorded in `place_import_runs` like a run by hand. A failed
 * run answers 500, so the timer's failure alert fires. `?source=<key>` runs
 * one source now, whatever its cadence. No model is called: this only fetches
 * public registers.
 */
export async function POST(request: Request) {
  if (!isCronRequest(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const today = new Date().toISOString().slice(0, 10);
  const only = new URL(request.url).searchParams.get("source");
  const sources = only
    ? placesConfig.sources.filter((s) => s.key === only)
    : dueSources(placesConfig, today);
  if (only && sources.length === 0) {
    return NextResponse.json({ error: `source "${only}" is not in the registry` }, { status: 404 });
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
  const failed = results.some((r) => r.runs.some((run) => run.status === "failed"));
  return NextResponse.json({ today, results }, { status: failed ? 500 : 200 });
}

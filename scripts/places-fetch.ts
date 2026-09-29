/**
 * Fetch a source as its adapter plans it for today, and import each retrieval
 * in order (design §8.3). The scheduled runner calls this per the source's
 * cadence; run by hand, it is how a source is first loaded.
 *
 *   pnpm run places:fetch <source-key> [--backfill] [--dry-run] [--plan]
 *
 * --backfill loads the source's history first (once, when a source is first
 * loaded; the schedule never passes it). --plan prints the URLs it would fetch
 * and stops. Exit 1 on a failed run, so a cron runner alerts.
 */
import { execFileSync } from "node:child_process";
import { placesConfig } from "@/lib/config/places";
import { db } from "@/lib/db/client";
import { fetchAndImport, plannedRetrievals } from "@/lib/places/importer/fetch";
import { defaultSnapshotStore } from "@/lib/places/importer/snapshots";

const args = process.argv.slice(2);
const [sourceKey] = args.filter((a) => !a.startsWith("--"));
const today = new Date().toISOString().slice(0, 10);
const backfill = args.includes("--backfill");

if (!sourceKey) {
  console.error("usage: pnpm run places:fetch <source-key> [--backfill] [--dry-run] [--plan]");
  process.exit(2);
}

function gitSha(): string | null {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return process.env.GIT_SHA ?? null;
  }
}

async function main(): Promise<number> {
  if (args.includes("--plan")) {
    console.log(plannedRetrievals(placesConfig, sourceKey!, today, { backfill }).join("\n"));
    return 0;
  }
  const reports = await fetchAndImport(db, {
    config: placesConfig,
    sourceKey: sourceKey!,
    today,
    snapshots: defaultSnapshotStore(),
    dryRun: args.includes("--dry-run"),
    backfill,
    gitSha: gitSha(),
  });
  console.log(JSON.stringify(reports, null, 2));
  return reports.some((r) => r.status === "failed") ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(error);
    process.exit(2);
  },
);

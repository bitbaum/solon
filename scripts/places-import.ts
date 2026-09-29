/**
 * Import one retrieval of a source (design §8.3).
 *
 *   pnpm run places:import <source-key> <file> [--dry-run] [--url=<where it came from>]
 *
 * The file is the source's raw bytes as retrieved; they are snapshotted under
 * their sha256 (PLACES_SNAPSHOT_DIR). The run syncs the config registries
 * first, applies in one transaction, and is recorded in place_import_runs
 * whatever happens. Exit 1 on a failed run, so a cron runner alerts.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { placesConfig } from "@/lib/config/places";
import { db } from "@/lib/db/client";
import { runImport } from "@/lib/places/importer/run";
import { defaultSnapshotStore } from "@/lib/places/importer/snapshots";

const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");
const url = args.find((a) => a.startsWith("--url="))?.slice("--url=".length) ?? null;
const [sourceKey, file] = positional;

if (!sourceKey || !file) {
  console.error("usage: pnpm run places:import <source-key> <file> [--dry-run] [--url=<url>]");
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
  const report = await runImport(db, {
    config: placesConfig,
    sourceKey: sourceKey!,
    retrieval: { bytes: readFileSync(file!), url, retrievedAt: new Date() },
    snapshots: defaultSnapshotStore(),
    dryRun,
    gitSha: gitSha(),
  });
  console.log(JSON.stringify(report, null, 2));
  return report.status === "failed" ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(error);
    process.exit(2);
  },
);

/**
 * Import every Places file kept in this repository whose bytes differ from
 * the last retrieval of its source applied to this database
 * (src/lib/config/places/repo-files.ts). Run after each merge by
 * `.github/workflows/places-data.yml`, so an edited file reaches the site by
 * itself; safe to run any number of times.
 *
 *   pnpm run places:import-files [--dry-run]
 *
 * Exit 1 when an import failed, so the workflow goes red and says which.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { desc, eq } from "drizzle-orm";
import { placesConfig } from "@/lib/config/places";
import { PLACES_REPO_FILES } from "@/lib/config/places/repo-files";
import { db } from "@/lib/db/client";
import { sources } from "@/lib/db/places-schema";
import { runImport } from "@/lib/places/importer/run";
import { defaultSnapshotStore, sha256Hex } from "@/lib/places/importer/snapshots";

const dryRun = process.argv.includes("--dry-run");

function gitSha(): string | null {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return process.env.GIT_SHA ?? null;
  }
}

/** The sha256 of the last retrieval of this source that was applied, if any. */
async function lastApplied(sourceKey: string): Promise<string | null> {
  const [row] = await db
    .select({ sha: sources.contentSha256 })
    .from(sources)
    .where(eq(sources.sourceKey, sourceKey))
    .orderBy(desc(sources.retrievedAt))
    .limit(1);
  return row?.sha ?? null;
}

async function main(): Promise<number> {
  let failed = 0;
  for (const { source, file } of PLACES_REPO_FILES) {
    const bytes = readFileSync(file);
    if ((await lastApplied(source)) === sha256Hex(bytes)) {
      console.log(`${source}: unchanged`);
      continue;
    }
    const report = await runImport(db, {
      config: placesConfig,
      sourceKey: source,
      retrieval: {
        bytes,
        url: `https://github.com/bitbaum/solon/blob/main/${file}`,
        retrievedAt: new Date(),
      },
      snapshots: defaultSnapshotStore(),
      dryRun,
      gitSha: gitSha(),
    });
    const changed = Object.entries(report.counts ?? {}).filter(([, n]) => Number(n) > 0);
    console.log(
      `${source}: ${report.status}${changed.length ? ` (${changed.map(([k, n]) => `${k} ${n}`).join(", ")})` : ""}`,
    );
    for (const problem of report.problems ?? []) console.log(`  problem: ${problem}`);
    if (report.status === "failed") failed++;
  }
  return failed > 0 ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(error);
    process.exit(2);
  },
);

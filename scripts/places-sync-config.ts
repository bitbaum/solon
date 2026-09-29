/**
 * Project the Places config registries into the database (design §5.3).
 *
 *   pnpm run places:sync-config           apply, recording the change
 *   pnpm run places:sync-config --check   change nothing; exit 1 when the
 *                                         database disagrees with config
 *
 * Every import run also syncs first, inside its own transaction, so this is
 * for CI (`--check` against a migrated database) and for operators.
 */
import { execFileSync } from "node:child_process";
import { placesConfig } from "@/lib/config/places";
import { db } from "@/lib/db/client";
import { PlacesSyncRefused, syncPlacesConfig } from "@/lib/places/sync-config";

const check = process.argv.includes("--check");

function gitSha(): string | null {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return process.env.GIT_SHA ?? null;
  }
}

async function main(): Promise<number> {
  try {
    const { plan, configSha256, applied } = await syncPlacesConfig(db, placesConfig, {
      check,
      gitSha: gitSha(),
    });
    for (const change of plan.changes) {
      console.log(`${check ? "would " : ""}${change.action} ${change.registry} "${change.key}"`);
    }
    if (check && plan.changes.length > 0) {
      console.error(
        `❌ the database disagrees with config (${plan.changes.length} change(s)); run places:sync-config`,
      );
      return 1;
    }
    console.log(
      `✅ places registries ${applied ? "synced" : "already match config"} (config ${configSha256.slice(0, 12)})`,
    );
    return 0;
  } catch (error) {
    if (error instanceof PlacesSyncRefused) {
      console.error(`❌ ${error.message}`);
      return 1;
    }
    throw error;
  }
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(error);
    process.exit(2);
  },
);

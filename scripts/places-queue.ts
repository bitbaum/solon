/**
 * Drains the import queue for one side (design §8.3): every source of that
 * side the run log says is behind, until the queue is empty or the time is
 * up. The box's hourly worker does this inside the app for `fetchFrom: box`
 * sources; a GitHub runner runs this daily for `fetchFrom: runner` sources,
 * publishers that refuse the box's address, writing to the production
 * database through a tunnel (.github/workflows/places-load-cloud.yml). The
 * run log is the same record whichever side fetched.
 *
 *   pnpm run places:queue --from runner [--minutes 25] [--plan]
 *
 * --plan prints the sources behind and stops. Exit 1 when a source failed.
 */
import { execFileSync } from "node:child_process";
import { placesConfig } from "@/lib/config/places";
import { db } from "@/lib/db/client";
import { drainQueue, pendingSources, type QueueSide } from "@/lib/places/importer/queue";
import { defaultSnapshotStore } from "@/lib/places/importer/snapshots";

const args = process.argv.slice(2);
const value = (flag: string) => {
  const at = args.indexOf(flag);
  return at >= 0 ? args[at + 1] : undefined;
};
const side = value("--from");
const minutes = Number(value("--minutes") ?? 25);

function gitSha(): string | null {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return process.env.GIT_SHA ?? null;
  }
}

async function main(): Promise<number> {
  if (side !== "box" && side !== "runner") {
    console.error("usage: pnpm run places:queue --from runner|box [--minutes 25] [--plan]");
    return 2;
  }
  if (args.includes("--plan")) {
    const pending = await pendingSources(
      db,
      placesConfig,
      new Date(),
      undefined,
      side as QueueSide,
    );
    console.log(pending.map((s) => s.key).join("\n") || "(nothing behind)");
    return 0;
  }
  const report = await drainQueue(db, {
    config: placesConfig,
    snapshots: defaultSnapshotStore(),
    gitSha: gitSha(),
    budgetMs: minutes * 60_000,
    side: side as QueueSide,
    // The box's worker rebuilds the ancestors view daily; a runner's imports rebuild it when
    // they move a place.
    dailyRefresh: false,
  });
  console.log(JSON.stringify(report, null, 2));
  return report.ran.some((r) => r.status === "failed") ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(error);
    process.exit(2);
  },
);

/**
 * Write the curated statistics records (src/lib/config/statistics/records.ts)
 * into the append-only `statistic_records`.
 *
 *   pnpm run statistics:sync           apply
 *   pnpm run statistics:sync --check   change nothing; exit 1 when the log disagrees with config
 */
import { execFileSync } from "node:child_process";
import { STATISTIC_RECORDS } from "@/lib/config/statistics/records";
import { db } from "@/lib/db/client";
import { syncStatisticRecords } from "@/lib/statistics/sync";

const check = process.argv.includes("--check");

function gitSha(): string | null {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return process.env.GIT_SHA ?? null;
  }
}

async function main(): Promise<number> {
  const report = await syncStatisticRecords(db, STATISTIC_RECORDS, { gitSha: gitSha(), check });
  for (const key of report.asserted) console.log(`${check ? "would assert" : "asserted"} ${key}`);
  for (const key of report.retracted)
    console.log(`${check ? "would retract" : "retracted"} ${key}`);
  for (const { key, reason } of report.skipped) console.log(`skipped ${key}: ${reason}`);
  console.log(`${report.unchanged} unchanged`);
  if (check && report.asserted.length + report.retracted.length > 0) {
    console.error("❌ the statistics log disagrees with config; run statistics:sync");
    return 1;
  }
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(2);
  });

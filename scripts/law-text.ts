/**
 * Load the text of the law from its publisher (design: docs/design/2026-10-law-as-data.md, L1).
 *
 *   pnpm run law:text <source-key> [--lang de] [--limit 200] [--day YYYY-MM-DD] [--dry-run]
 *
 * Resumable: acts whose version is already held are skipped, so a run limited to
 * N continues where the last stopped. Exit 1 when an act failed, so a runner alerts.
 */
import { FEDLEX } from "@/lib/config/law";
import { db } from "@/lib/db/client";
import { defaultSnapshotStore } from "@/lib/places/importer/snapshots";
import { importFedlexText } from "@/lib/law/text/import";

const args = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? args[at + 1] : undefined;
};
const [sourceKey] = args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));

async function main(): Promise<number> {
  if (sourceKey !== FEDLEX.key) {
    console.error(
      `usage: pnpm run law:text ${FEDLEX.key} [--lang de] [--limit N] [--day YYYY-MM-DD] [--dry-run]`,
    );
    return 2;
  }
  const report = await importFedlexText(db, {
    lang: flag("lang") ?? "de",
    day: flag("day") ?? new Date().toISOString().slice(0, 10),
    limit: flag("limit") ? Number(flag("limit")) : undefined,
    snapshots: defaultSnapshotStore(),
    dryRun: args.includes("--dry-run"),
    onProgress: (message) => console.error(message),
  });
  console.log(
    JSON.stringify(
      {
        ...report,
        notInRegister: report.notInRegister.slice(0, 20),
        notInRegisterCount: report.notInRegister.length,
      },
      null,
      2,
    ),
  );
  return report.failures.length > 0 ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(error);
    process.exit(2);
  },
);

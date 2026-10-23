/**
 * Read the law register and import it (design: docs/design/2026-10-law-as-data.md, L0).
 *
 *   pnpm run law:register [--dry-run] [--file <snapshot.json>]
 *
 * Without --file it reads the publisher now (about a minute: one polite request
 * per slice of each authority's tree). --file imports a snapshot a previous
 * run stored. Exit 1 on a failed run, so a runner alerts.
 */
import { readFileSync } from "node:fs";
import { LEXFIND } from "@/lib/config/law";
import { db } from "@/lib/db/client";
import { defaultSnapshotStore } from "@/lib/places/importer/snapshots";
import { fetchRegister } from "@/lib/law/register/lexfind";
import { importRegister } from "@/lib/law/register/import";

const args = process.argv.slice(2);
const fileAt = args.indexOf("--file");
const file = fileAt >= 0 ? args[fileAt + 1] : undefined;

async function main(): Promise<number> {
  let bytes: Uint8Array;
  if (file) {
    bytes = new Uint8Array(readFileSync(file));
  } else {
    const snapshot = await fetchRegister(fetch, (code, acts) =>
      console.error(`read ${code}: ${acts} acts`),
    );
    bytes = new TextEncoder().encode(JSON.stringify(snapshot));
  }
  const report = await importRegister(db, {
    register: LEXFIND,
    bytes,
    url: file ? `file:${file.replace(/^.*\//, "")}` : LEXFIND.homepage,
    retrievedAt: new Date(),
    snapshots: defaultSnapshotStore(),
    dryRun: args.includes("--dry-run"),
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

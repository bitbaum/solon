/**
 * pnpm run snapshots:compress [--dry-run]
 *
 * Gzips the source snapshots written before the store compressed them
 * (src/lib/places/importer/snapshots-compress.ts). Safe to rerun: a snapshot
 * already compressed is not touched.
 */
import { compressSnapshots } from "@/lib/places/importer/snapshots-compress";
import { snapshotDir } from "@/lib/places/importer/snapshots";

const gb = (bytes: number): string => `${(bytes / 1024 ** 3).toFixed(2)} GB`;

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const dir = snapshotDir();
  const report = await compressSnapshots(dir, { dryRun });
  console.log(`${dir}${dryRun ? " (dry run, nothing written)" : ""}`);
  console.log(`plain snapshots found: ${report.plain}`);
  console.log(`${dryRun ? "would compress" : "compressed"}: ${report.compressed}`);
  console.log(`size: ${gb(report.bytesBefore)} -> ${gb(report.bytesAfter)}`);
  if (report.mismatched.length > 0) {
    console.log(`left alone, name is not the sha256 of the bytes: ${report.mismatched.length}`);
    for (const key of report.mismatched.slice(0, 20)) {
      console.log(`  ${key}`);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

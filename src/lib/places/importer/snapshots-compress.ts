/**
 * Gzip the snapshots written before the store compressed them
 * (`snapshots.ts`). One file at a time: compressed aside, read back and
 * checked against the sha256 that is its name, renamed into place, and only
 * then is the plain file removed. A file whose bytes do not match its name is
 * left exactly as it is and reported; nothing is ever deleted unverified.
 */
import { readdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { gunzip, gzip } from "node:zlib";
import { GZIP_SUFFIX, sha256Hex } from "./snapshots";

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

const SHARD = /^[0-9a-f]{2}$/;
const SHA256 = /^[0-9a-f]{64}$/;

export interface CompressReport {
  /** Plain snapshots found. */
  plain: number;
  /** Converted (or, in a dry run, that would be). */
  compressed: number;
  /** Left alone: the name is not the sha256 of the bytes. */
  mismatched: string[];
  bytesBefore: number;
  bytesAfter: number;
}

export async function compressSnapshots(
  dir: string,
  options: { dryRun?: boolean } = {},
): Promise<CompressReport> {
  const report: CompressReport = {
    plain: 0,
    compressed: 0,
    mismatched: [],
    bytesBefore: 0,
    bytesAfter: 0,
  };
  const shards = (await readdir(dir).catch(() => [])).filter((name) => SHARD.test(name));
  for (const shard of shards.sort()) {
    for (const name of (await readdir(join(dir, shard))).sort()) {
      if (!SHA256.test(name)) {
        continue;
      }
      const path = join(dir, shard, name);
      const bytes = await readFile(path);
      report.plain += 1;
      report.bytesBefore += bytes.byteLength;
      if (sha256Hex(bytes) !== name) {
        report.mismatched.push(`${shard}/${name}`);
        report.bytesAfter += bytes.byteLength;
        continue;
      }
      const packed = await gzipAsync(bytes);
      report.compressed += 1;
      report.bytesAfter += packed.byteLength;
      if (options.dryRun) {
        continue;
      }
      const partial = `${path}${GZIP_SUFFIX}.${process.pid}.partial`;
      await writeFile(partial, packed);
      const readBack = await gunzipAsync(await readFile(partial));
      if (sha256Hex(readBack) !== name) {
        await unlink(partial);
        throw new Error(`${shard}/${name}: the compressed copy did not read back the same`);
      }
      await rename(partial, path + GZIP_SUFFIX);
      // The gzipped file is in place and verified; only now does the plain one go.
      if ((await stat(path + GZIP_SUFFIX)).size === packed.byteLength) {
        await unlink(path);
      }
    }
  }
  return report;
}

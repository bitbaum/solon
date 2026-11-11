/**
 * Where a source's raw bytes are kept, under their sha256 (design §4.6,
 * §8.3 step 1). Content-addressed, so storing the same retrieval twice is a
 * no-op and a snapshot can never be changed after the fact.
 *
 * Kept gzipped on disk. The store held 17 GB of law text and register pages
 * on 2026-11-11, on a disk it shares with every other site, and almost all of
 * it is XML, HTML and JSON. The key and the bytes handed back are unchanged:
 * compression is how the file is written, not what the snapshot is.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { gunzip, gzip } from "node:zlib";

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

export interface SnapshotStore {
  /** Store the bytes; returns the key they can be read back by. */
  put(sha256: string, bytes: Uint8Array): Promise<string>;
  get(key: string): Promise<Uint8Array>;
}

export const sha256Hex = (bytes: Uint8Array): string =>
  createHash("sha256").update(bytes).digest("hex");

/** The file a key's bytes are gzipped into, beside where the plain file was. */
export const GZIP_SUFFIX = ".gz";

const exists = async (path: string): Promise<boolean> =>
  stat(path).then(
    () => true,
    () => false,
  );

/**
 * Files under a directory: `<dir>/<first two hex>/<sha256>.gz`. A snapshot
 * written before compression is `<dir>/<first two hex>/<sha256>` and is read
 * as it is (`scripts/snapshots-compress.ts` converts those).
 */
export class FileSnapshotStore implements SnapshotStore {
  constructor(private readonly dir: string) {}

  async put(sha256: string, bytes: Uint8Array): Promise<string> {
    const key = `${sha256.slice(0, 2)}/${sha256}`;
    const path = join(this.dir, key);
    // Content-addressed: either form already on disk is these same bytes.
    if ((await exists(path + GZIP_SUFFIX)) || (await exists(path))) {
      return key;
    }
    await mkdir(dirname(path), { recursive: true });
    // Written aside and renamed, so a reader never sees half a file.
    const partial = `${path}${GZIP_SUFFIX}.${process.pid}.partial`;
    await writeFile(partial, await gzipAsync(bytes));
    await rename(partial, path + GZIP_SUFFIX);
    return key;
  }

  async get(key: string): Promise<Uint8Array> {
    const path = join(this.dir, key);
    try {
      return await gunzipAsync(await readFile(path + GZIP_SUFFIX));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
      return readFile(path);
    }
  }
}

/** PLACES_SNAPSHOT_DIR, or ./data/snapshots in development. */
export const snapshotDir = (): string =>
  process.env.PLACES_SNAPSHOT_DIR || join(process.cwd(), "data", "snapshots");

/** The store the app uses. */
export function defaultSnapshotStore(): SnapshotStore {
  return new FileSnapshotStore(snapshotDir());
}

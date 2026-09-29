/**
 * Where a source's raw bytes are kept, under their sha256 (design §4.6,
 * §8.3 step 1). Content-addressed, so storing the same retrieval twice is a
 * no-op and a snapshot can never be changed after the fact.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export interface SnapshotStore {
  /** Store the bytes; returns the key they can be read back by. */
  put(sha256: string, bytes: Uint8Array): Promise<string>;
  get(key: string): Promise<Uint8Array>;
}

export const sha256Hex = (bytes: Uint8Array): string =>
  createHash("sha256").update(bytes).digest("hex");

/** Files under a directory: `<dir>/<first two hex>/<sha256>`. */
export class FileSnapshotStore implements SnapshotStore {
  constructor(private readonly dir: string) {}

  async put(sha256: string, bytes: Uint8Array): Promise<string> {
    const key = `${sha256.slice(0, 2)}/${sha256}`;
    const path = join(this.dir, key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, bytes, { flag: "w" });
    return key;
  }

  async get(key: string): Promise<Uint8Array> {
    return readFile(join(this.dir, key));
  }
}

/** The store the app uses: PLACES_SNAPSHOT_DIR, or ./data/snapshots in development. */
export function defaultSnapshotStore(): SnapshotStore {
  return new FileSnapshotStore(
    process.env.PLACES_SNAPSHOT_DIR || join(process.cwd(), "data", "snapshots"),
  );
}

/**
 * Where geometry files are published, under their sha256 (§4.4, §9.1): the
 * database holds references into them, never the geometry. Content-addressed,
 * so a file never changes after a reference points into it, and the server
 * can let browsers keep it forever.
 */
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { snapshotDir } from "./snapshots";

export interface GeometryStore {
  put(sha256: string, text: string): Promise<void>;
  /** The file's bytes, or null when this store does not hold it. */
  get(sha256: string): Promise<Uint8Array | null>;
}

const SHA256 = /^[0-9a-f]{64}$/;

/** Files under a directory: `<dir>/<sha256>.topojson`. */
export class FileGeometryStore implements GeometryStore {
  constructor(private readonly dir: string) {}

  /** Written aside and renamed, so a reader never sees half a file. */
  async put(sha256: string, text: string): Promise<void> {
    if (!SHA256.test(sha256)) {
      throw new Error(`not a sha256: ${sha256}`);
    }
    await mkdir(this.dir, { recursive: true });
    const path = join(this.dir, `${sha256}.topojson`);
    await writeFile(`${path}.${process.pid}.partial`, text);
    await rename(`${path}.${process.pid}.partial`, path);
  }

  async get(sha256: string): Promise<Uint8Array | null> {
    if (!SHA256.test(sha256)) {
      return null;
    }
    try {
      return await readFile(join(this.dir, `${sha256}.topojson`));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }
}

/** The store the app uses: `geometry/` beside the snapshots. */
export function defaultGeometryStore(): GeometryStore {
  return new FileGeometryStore(join(snapshotDir(), "geometry"));
}

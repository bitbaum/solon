import { mkdtemp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { FileSnapshotStore, sha256Hex } from "../snapshots";
import { compressSnapshots } from "../snapshots-compress";

const text = (s: string): Uint8Array => new TextEncoder().encode(s);
const tmp = (): Promise<string> => mkdtemp(join(tmpdir(), "snapshots-"));

describe("FileSnapshotStore", () => {
  it("hands back the bytes it was given, and keeps them gzipped", async () => {
    const dir = await tmp();
    const store = new FileSnapshotStore(dir);
    const bytes = text("<law>".repeat(500));
    const sha = sha256Hex(bytes);

    const key = await store.put(sha, bytes);

    expect(key).toBe(`${sha.slice(0, 2)}/${sha}`);
    expect(await store.get(key)).toEqual(Buffer.from(bytes));
    expect(await readdir(join(dir, sha.slice(0, 2)))).toEqual([`${sha}.gz`]);
  });

  it("reads a snapshot written before compression", async () => {
    const dir = await tmp();
    const bytes = text("plain, from before");
    const sha = sha256Hex(bytes);
    await mkdir(join(dir, sha.slice(0, 2)));
    await writeFile(join(dir, sha.slice(0, 2), sha), bytes);

    const store = new FileSnapshotStore(dir);

    expect(await store.get(`${sha.slice(0, 2)}/${sha}`)).toEqual(Buffer.from(bytes));
    // Storing it again does not write a second copy.
    await store.put(sha, bytes);
    expect(await readdir(join(dir, sha.slice(0, 2)))).toEqual([sha]);
  });
});

describe("compressSnapshots", () => {
  const seed = async (dir: string, name: string, bytes: Uint8Array): Promise<string> => {
    await mkdir(join(dir, name.slice(0, 2)), { recursive: true });
    const path = join(dir, name.slice(0, 2), name);
    await writeFile(path, bytes);
    return path;
  };

  it("gzips plain snapshots, removes the plain file, and the store still reads them", async () => {
    const dir = await tmp();
    const bytes = text("<article>".repeat(2000));
    const sha = sha256Hex(bytes);
    await seed(dir, sha, bytes);

    const report = await compressSnapshots(dir);

    expect(report).toMatchObject({ plain: 1, compressed: 1, mismatched: [] });
    expect(report.bytesAfter).toBeLessThan(report.bytesBefore);
    expect(await readdir(join(dir, sha.slice(0, 2)))).toEqual([`${sha}.gz`]);
    expect(gunzipSync(await readFile(join(dir, sha.slice(0, 2), `${sha}.gz`)))).toEqual(
      Buffer.from(bytes),
    );
    expect(await new FileSnapshotStore(dir).get(`${sha.slice(0, 2)}/${sha}`)).toEqual(
      Buffer.from(bytes),
    );
    // A second run finds nothing left to do.
    expect((await compressSnapshots(dir)).plain).toBe(0);
  });

  it("a dry run writes nothing", async () => {
    const dir = await tmp();
    const bytes = text("x".repeat(5000));
    const sha = sha256Hex(bytes);
    await seed(dir, sha, bytes);

    const report = await compressSnapshots(dir, { dryRun: true });

    expect(report.compressed).toBe(1);
    expect(await readdir(join(dir, sha.slice(0, 2)))).toEqual([sha]);
  });

  it("leaves a file whose name is not the sha256 of its bytes, and other folders, alone", async () => {
    const dir = await tmp();
    const wrong = "ab".repeat(32);
    await seed(dir, wrong, text("not what the name says"));
    await mkdir(join(dir, "geometry"));
    await writeFile(join(dir, "geometry", `${wrong}.topojson`), "{}");

    const report = await compressSnapshots(dir);

    expect(report.mismatched).toEqual([`ab/${wrong}`]);
    expect(report.compressed).toBe(0);
    expect(await readdir(join(dir, "ab"))).toEqual([wrong]);
    expect(await readdir(join(dir, "geometry"))).toEqual([`${wrong}.topojson`]);
  });
});

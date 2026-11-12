import { describe, expect, it } from "vitest";
import { alreadyApplied, importerVersion } from "../importer/applied";

const adapter = { key: "oecd_sdmx", version: "2" };

describe("the importer version a retrieval is recorded with", () => {
  it("names the adapter and hashes the options, whatever order config writes them in", () => {
    const a = importerVersion(adapter, { options: { b: 1, a: [1, 2] }, packs: ["world"] });
    const b = importerVersion(adapter, { options: { a: [1, 2], b: 1 }, packs: ["world"] });
    expect(a).toBe(b);
    expect(a).toMatch(/^oecd_sdmx@2#[0-9a-f]{12}$/);
  });

  it("changes with an option, a pack or the adapter's version", () => {
    const base = importerVersion(adapter, { options: { divideBy: 100 }, packs: ["world"] });
    expect(importerVersion(adapter, { options: { divideBy: 1 }, packs: ["world"] })).not.toBe(base);
    expect(importerVersion(adapter, { options: { divideBy: 100 }, packs: ["ch"] })).not.toBe(base);
    expect(
      importerVersion(
        { ...adapter, version: "3" },
        { options: { divideBy: 100 }, packs: ["world"] },
      ),
    ).not.toBe(base);
  });

  it("calls a retrieval applied only when the bytes and the importer both match", () => {
    const last = { sha256: "aa", importerVersion: "x@1#0" };
    expect(alreadyApplied(last, "aa", "x@1#0")).toBe(true);
    expect(alreadyApplied(last, "bb", "x@1#0")).toBe(false);
    expect(alreadyApplied(last, "aa", "x@2#0")).toBe(false);
    expect(alreadyApplied(null, "aa", "x@1#0")).toBe(false);
  });
});

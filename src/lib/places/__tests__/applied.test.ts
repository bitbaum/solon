import { describe, expect, it } from "vitest";
import { alreadyApplied } from "../importer/applied";

describe("whether a repository file has already been applied", () => {
  const last = { sha256: "a".repeat(64), importerVersion: "csv_facts@2" };

  it("is applied when neither the bytes nor the adapter changed", () => {
    expect(alreadyApplied(last, "a".repeat(64), "csv_facts@2")).toBe(true);
  });

  it("is not applied when the bytes changed", () => {
    expect(alreadyApplied(last, "b".repeat(64), "csv_facts@2")).toBe(false);
  });

  it("is not applied when the adapter that reads it changed, though the bytes did not", () => {
    expect(alreadyApplied(last, "a".repeat(64), "csv_facts@3")).toBe(false);
  });

  it("is not applied when the source was never applied", () => {
    expect(alreadyApplied(null, "a".repeat(64), "csv_facts@3")).toBe(false);
  });
});

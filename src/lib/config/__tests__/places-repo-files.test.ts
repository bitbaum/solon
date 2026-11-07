import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { placesConfig } from "@/lib/config/places";
import { PLACES_REPO_FILES } from "@/lib/config/places/repo-files";

/** Every file under a directory, as repository paths. */
function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

describe("Places data kept in the repository", () => {
  it("names every file under data/places exactly once, so none is left unloaded", () => {
    const named = PLACES_REPO_FILES.map((r) => r.file);
    expect(new Set(named).size).toBe(named.length);
    expect([...named].sort()).toEqual(filesUnder("data/places").sort());
  });

  it("gives each file a source the registry has", () => {
    const keys = new Set(placesConfig.sources.map((s) => s.key));
    expect(PLACES_REPO_FILES.filter((r) => !keys.has(r.source)).map((r) => r.source)).toEqual([]);
  });
});

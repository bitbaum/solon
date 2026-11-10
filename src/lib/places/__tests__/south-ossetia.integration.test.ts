/**
 * South Ossetia through the real importer into a real database, and its page
 * path: `/places/south_ossetia` (the pack's key) and `/places/south-ossetia`
 * (the world list's slug) name one place, the second being canonical. Found
 * live: the two answered with contradicting pages.
 *
 * Runs only with INTEGRATION=1 against a migrated database.
 */
import { readFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { placesConfig } from "@/lib/config/places";
import { PLACES_REPO_FILES } from "@/lib/config/places/repo-files";
import { db } from "@/lib/db/client";
import { jurisdictions, placePaths } from "@/lib/db/places-schema";
import type { GeometryStore } from "../importer/geometry-store";
import { runImport } from "../importer/run";
import type { SnapshotStore } from "../importer/snapshots";
import { resolvePlacePath } from "../paths";
import { withTestland } from "./fixtures/testland/config";

const RUN = process.env.INTEGRATION === "1";
const config = withTestland(placesConfig);
const SOURCE = "so-constitution-units";

const snapshots: SnapshotStore = {
  async put(sha) {
    return `memory/${sha}`;
  },
  async get() {
    throw new Error("not needed here");
  },
};
const geometry: GeometryStore = {
  async put() {},
  async get() {
    return null;
  },
};

describe.skipIf(!RUN)("South Ossetia, imported", () => {
  it("imports, and its hyphenated slug is the pack root's canonical path", async () => {
    const file = PLACES_REPO_FILES.find((r) => r.source === SOURCE)!.file;
    const report = await runImport(db, {
      config,
      sourceKey: SOURCE,
      retrieval: {
        bytes: new Uint8Array(readFileSync(file)),
        url: `fixture:${file.replace(/^.*\//, "")}`,
        retrievedAt: new Date(),
      },
      snapshots,
      geometry,
    });
    expect(report.problems).toEqual([]);
    expect(report.status).toBe("applied");

    const hyphenated = await resolvePlacePath(db, "south-ossetia");
    expect(hyphenated?.isCanonical).toBe(true);
    expect(hyphenated?.target.kind).toBe("jurisdiction");

    const underscored = await resolvePlacePath(db, "south_ossetia");
    expect(underscored).toMatchObject({ canonical: "south-ossetia", isCanonical: false });
    expect(underscored?.target).toEqual(hyphenated?.target);
  });

  it("gives the nation and each of its five units one canonical path below the hyphenated root, and the old one as a redirect", async () => {
    const places = await db
      .select({ id: jurisdictions.id, slugPath: jurisdictions.slugPath })
      .from(jurisdictions)
      .where(eq(jurisdictions.countryPack, "south_ossetia"));
    expect(places).toHaveLength(6);
    const paths = await db.select().from(placePaths);
    for (const place of places) {
      const mine = paths.filter((p) => p.jurisdictionId === place.id);
      const canonical = mine.filter((p) => p.canonical);
      expect(canonical, place.slugPath!).toHaveLength(1);
      expect(canonical[0]!.path.split("/")[0]).toBe("south-ossetia");
      expect(mine.filter((p) => !p.canonical).map((p) => p.path)).toEqual([place.slugPath]);
    }
  });
});

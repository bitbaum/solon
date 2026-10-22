/**
 * The Liechtenstein pack through the real importer into a real database: the
 * hand-kept batch of its Landschaften and communes
 * (data/places/liechtenstein/communes.json), then its part of swisstopo's
 * postcode directory (a cut of the real retrieval of 2026-09-30, with one
 * Swiss row the source must leave out). Vaduz resolves up its chain to
 * Liechtenstein, by name and by postcode, beside Switzerland.
 *
 * Safe to rerun on the same database: the second pass changes nothing.
 *
 * Runs only with INTEGRATION=1 against a migrated database.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { and, eq, isNull } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { placesConfig } from "@/lib/config/places";
import { db } from "@/lib/db/client";
import { jurisdictionIdentifiers, jurisdictions } from "@/lib/db/places-schema";
import { loadChain } from "../chain";
import { runImport, type ImportReport } from "../importer/run";
import type { SnapshotStore } from "../importer/snapshots";
import { resolvePostcode } from "../postcodes";
import { evaluate as evaluateSearch, typoCases, words } from "@bitbaum/searchkit";
import { placesAtLevel, searchPlaces } from "../search";
import { withTestland } from "./fixtures/testland/config";

const RUN = process.env.INTEGRATION === "1";
const ON = "2026-10-22";

/** CI's database also holds Testland, and sync refuses a config that drops data. */
const config = withTestland(placesConfig);

const snapshots: SnapshotStore = {
  async put(sha) {
    return `memory/${sha}`;
  },
  async get() {
    throw new Error("not needed here");
  },
};

/** In the order a first load imports them: the places, then their postcodes. */
const RETRIEVALS: [sourceKey: string, path: string][] = [
  [
    "li-constitution-communes",
    join(__dirname, "../../../../data/places/liechtenstein/communes.json"),
  ],
  [
    "swisstopo-postcode-localities-li",
    join(__dirname, "fixtures", "liechtenstein", "postcode-localities-2026-09-30.csv"),
  ],
];

const importFile = (sourceKey: string, path: string): Promise<ImportReport> =>
  runImport(db, {
    config,
    sourceKey,
    retrieval: {
      bytes: new Uint8Array(readFileSync(path)),
      url: `fixture:${path.replace(/^.*\//, "")}`,
      retrievedAt: new Date(),
    },
    snapshots,
  });

async function placeId(scheme: string, value: string): Promise<string> {
  const [row] = await db
    .select({ id: jurisdictionIdentifiers.jurisdictionId })
    .from(jurisdictionIdentifiers)
    .where(
      and(
        eq(jurisdictionIdentifiers.scheme, scheme),
        eq(jurisdictionIdentifiers.value, value),
        isNull(jurisdictionIdentifiers.supersededAt),
      ),
    );
  expect(row, `${scheme}:${value}`).toBeDefined();
  return row!.id;
}

describe.skipIf(!RUN)("Liechtenstein, imported", () => {
  it("imports the communes, then their postcodes", async () => {
    for (const [sourceKey, path] of RETRIEVALS) {
      const report = await importFile(sourceKey, path);
      expect(report.problems, sourceKey).toEqual([]);
      expect(report.status, sourceKey).toBe("applied");
    }
  });

  it("changes nothing when the same state arrives again", async () => {
    for (const [sourceKey, path] of RETRIEVALS) {
      const report = await importFile(sourceKey, path);
      expect(report.status, sourceKey).toBe("applied");
      expect(
        Object.entries(report.counts).filter(([, n]) => n > 0),
        sourceKey,
      ).toEqual([]);
    }
  });

  it("holds eleven communes under Liechtenstein, each with its number", async () => {
    const communes = await db
      .select({ value: jurisdictionIdentifiers.value })
      .from(jurisdictions)
      .innerJoin(
        jurisdictionIdentifiers,
        eq(jurisdictionIdentifiers.jurisdictionId, jurisdictions.id),
      )
      .where(
        and(
          eq(jurisdictions.countryPack, "liechtenstein"),
          eq(jurisdictions.levelKey, "municipality"),
          eq(jurisdictionIdentifiers.scheme, "li_municipality"),
          isNull(jurisdictionIdentifiers.supersededAt),
        ),
      );
    expect(communes.map((c) => c.value).sort()).toEqual(
      Array.from({ length: 11 }, (_, i) => String(7001 + i)),
    );
  });

  it("resolves Vaduz up its chain to Liechtenstein", async () => {
    const chain = await loadChain(db, await placeId("li_municipality", "7001"), ON);
    const ladder = chain
      .filter((p) => p.depth !== null)
      .sort((a, b) => a.depth! - b.depth!)
      .map((p) => [p.levelKey, p.names.find((n) => n.locale === "de")?.name]);
    expect(ladder).toEqual([
      ["municipality", "Vaduz"],
      ["landschaft", "Oberland"],
      ["nation", "Liechtenstein"],
    ]);
  });

  it("finds Vaduz by name and by postcode, as /api/v1/places does", async () => {
    const byName = await searchPlaces(db, config, "Vaduz", ON, "de");
    expect(byName.kind).toBe("name");
    expect(byName.hits[0]).toMatchObject({ name: "Vaduz", packName: "Liechtenstein" });
    expect(byName.hits[0]?.slugPath).toBe("liechtenstein/oberland/vaduz");

    const byPostcode = await searchPlaces(db, config, "9490", ON, "de");
    expect(byPostcode.kind).toBe("postcode");
    expect(byPostcode.hits.map((h) => h.name)).toEqual(["Vaduz"]);
  });

  it("gives every commune a postcode that spans several, largest share first", async () => {
    const gamprin = await resolvePostcode(db, "liechtenstein", "9487", ON);
    expect(gamprin.map((m) => m.jurisdictionId)).toEqual([
      await placeId("li_municipality", "7009"),
      await placeId("li_municipality", "7007"),
      await placeId("li_municipality", "7001"),
    ]);
    expect(await resolvePostcode(db, "liechtenstein", "9470", ON)).toEqual([]);
  });

  it("finds each place with one slip in a word of its name, beside Switzerland's", async () => {
    const top = async (typed: string) =>
      (await searchPlaces(db, config, typed, ON, "de")).hits.map((h) => h.name);
    const pack = config.packs.find((p) => p.key === "liechtenstein")!;
    const places = (
      await Promise.all(
        pack.levels.map((level) => placesAtLevel(db, config, pack.key, level.key, ON, "de")),
      )
    ).flat();
    const names = [...new Set(places.map((p) => p.name))];
    expect(names).toHaveLength(14);
    const cases = typoCases(
      names.map((name) => ({ id: name, name })),
      { fold: words, perWord: 6 },
    );
    const notFirst: string[] = [];
    const report = await evaluateSearch(cases, async (typed) => {
      const found = await top(typed);
      if (!cases.find((c) => c.query === typed)!.expect.includes(found[0]!)) {
        notFirst.push(typed);
      }
      return found;
    });
    expect(report.misses).toEqual([]);
    // One answer is second, honestly: "schen" is the start of Schellenberg
    // (and of Switzerland's Schenkon) before it is Eschen with its first letter slipped.
    expect(notFirst).toEqual(["schen"]);
  });
});

/**
 * The Swiss pack through the real importer into a real database, from cuts of
 * the actual retrievals (fixtures/switzerland): the FSO commune register on
 * 1 January 2021 and on 29 September 2026, its mutations in between, the City
 * of Zürich's statistical quarters, and the canton's municipal multipliers.
 * The P1 acceptance (§11) as far as it is built: Witikon resolves up its chain
 * to Switzerland, a merger is a succession, not an edit, and a commune's
 * multiplier is a dated fact from its source.
 *
 * Safe to rerun on the same database: the second pass of every import must
 * change nothing, which is also what the scheduled runs rely on.
 *
 * Runs only with INTEGRATION=1 against a migrated database.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { and, eq, isNull } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { placesConfig } from "@/lib/config/places";
import { db } from "@/lib/db/client";
import {
  facts,
  jurisdictionIdentifiers,
  jurisdictionRelations,
  jurisdictions,
} from "@/lib/db/places-schema";
import { loadChain } from "../chain";
import { runImport, type ImportReport } from "../importer/run";
import type { SnapshotStore } from "../importer/snapshots";
import { loadPlacePage } from "../place-page";
import { withTestland } from "./fixtures/testland/config";

const RUN = process.env.INTEGRATION === "1";
const ON = "2026-09-29";
const FIXTURES = join(__dirname, "fixtures", "switzerland");

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

/** In the order `places:fetch --backfill` then the schedule would import them. */
const RETRIEVALS: [sourceKey: string, file: string][] = [
  ["bfs-communes-snapshot", "communes-2026-09-29.csv"],
  ["bfs-communes-snapshot", "communes-2021-01-01.csv"],
  ["bfs-communes-snapshot", "communes-2026-09-29.csv"],
  ["bfs-communes-mutations", "mutations-2021-2026.csv"],
  ["zurich-statistical-quarters", "statistical-quarters.json"],
  ["zurich-municipal-multipliers", "multipliers-2020-2026.csv"],
];

const importFixture = (sourceKey: string, file: string): Promise<ImportReport> =>
  runImport(db, {
    config,
    sourceKey,
    retrieval: {
      bytes: new Uint8Array(readFileSync(join(FIXTURES, file))),
      url: `fixture:${file}`,
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

describe.skipIf(!RUN)("Switzerland, imported (P1)", () => {
  it("imports the register's snapshots, its mergers, the city's quarters and the multipliers", async () => {
    for (const [sourceKey, file] of RETRIEVALS) {
      const report = await importFixture(sourceKey, file);
      expect(report.problems, file).toEqual([]);
      expect(report.status, file).toBe("applied");
    }
  });

  it("changes nothing when a scheduled run brings the same state again", async () => {
    // The first two are backfill: a schedule never refetches the past.
    for (const [sourceKey, file] of RETRIEVALS.slice(2)) {
      const report = await importFixture(sourceKey, file);
      expect(report.status, file).toBe("applied");
      expect(
        Object.entries(report.counts).filter(([, n]) => n > 0),
        file,
      ).toEqual([]);
    }
  });

  it("resolves Witikon up its chain to Switzerland", async () => {
    const chain = await loadChain(db, await placeId("zurich_statistical_quarter", "74"), ON);
    const ladder = chain
      .filter((p) => p.depth !== null)
      .sort((a, b) => a.depth! - b.depth!)
      .map((p) => [
        p.levelKey,
        p.names.find((n) => n.nameType === "self" && n.locale === "de")?.name,
      ]);
    expect(ladder).toEqual([
      ["statistical_quarter", "Witikon"],
      ["city_district", "Kreis 7"],
      ["municipality", "Zürich"],
      ["district", "Bezirk Zürich"],
      ["canton", "Zürich"],
      ["nation", "Schweiz"],
    ]);
  });

  it("gives Witikon a page at its path, taking no tax", async () => {
    const view = await loadPlacePage(
      db,
      config,
      "switzerland/zurich/bezirk-zurich/zurich/kreis-7/witikon",
      ON,
      "de",
    );
    expect(view).toMatchObject({
      name: "Witikon",
      levelName: "Statistisches Quartier",
      takesTax: false,
    });
    expect(view!.partOf.map((p) => p.name)).toEqual([
      "Schweiz",
      "Zürich",
      "Bezirk Zürich",
      "Zürich",
      "Kreis 7",
    ]);
  });

  it("ends the merged communes and links the new one to each", async () => {
    const andelfingen = await placeId("bfs_municipality", "291");
    const successions = await db
      .select({ to: jurisdictionRelations.toId, validFrom: jurisdictionRelations.validFrom })
      .from(jurisdictionRelations)
      .where(
        and(
          eq(jurisdictionRelations.fromId, andelfingen),
          eq(jurisdictionRelations.relation, "succeeds"),
          isNull(jurisdictionRelations.supersededAt),
        ),
      );
    const predecessors = await Promise.all(
      ["21", "32", "30"].map((value) => placeId("bfs_municipality", value)),
    );
    expect(successions.map((s) => s.to).sort()).toEqual([...predecessors].sort());
    expect(new Set(successions.map((s) => s.validFrom))).toEqual(new Set(["2023-01-01"]));

    const ended = await db
      .select({ validTo: jurisdictions.validTo })
      .from(jurisdictions)
      .where(eq(jurisdictions.id, predecessors[0]!));
    expect(ended[0]!.validTo).toBe("2022-12-31");
  });

  it("keeps the plain path for the commune that exists now", async () => {
    const paths = await db
      .select({ slugPath: jurisdictions.slugPath, validTo: jurisdictions.validTo })
      .from(jurisdictions)
      .where(eq(jurisdictions.id, await placeId("bfs_municipality", "291")));
    expect(paths[0]!.slugPath).toBe("switzerland/zurich/bezirk-andelfingen/andelfingen");
    const [old] = await db
      .select({ slugPath: jurisdictions.slugPath })
      .from(jurisdictions)
      .where(eq(jurisdictions.id, await placeId("bfs_municipality", "30")));
    expect(old!.slugPath).toBe("switzerland/zurich/bezirk-andelfingen/andelfingen-30");
  });

  it("keeps Kloten current through its territory exchange, under its new version", async () => {
    const kloten = await placeId("bfs_municipality", "62");
    const [row] = await db
      .select({ validTo: jurisdictions.validTo })
      .from(jurisdictions)
      .where(eq(jurisdictions.id, kloten));
    expect(row!.validTo).toBeNull();
    const versions = await db
      .select({ value: jurisdictionIdentifiers.value })
      .from(jurisdictionIdentifiers)
      .where(
        and(
          eq(jurisdictionIdentifiers.jurisdictionId, kloten),
          eq(jurisdictionIdentifiers.scheme, "bfs_municipality_version"),
          isNull(jurisdictionIdentifiers.supersededAt),
        ),
      );
    expect(versions.map((v) => v.value)).toEqual(["16656"]);
  });

  it("records a commune's multiplier for each year, and leaves out a commune with two rates", async () => {
    const multipliers = async (commune: string) =>
      db
        .select({ validFrom: facts.validFrom, value: facts.valueNumeric, unit: facts.unit })
        .from(facts)
        .where(
          and(
            eq(facts.jurisdictionId, await placeId("bfs_municipality", commune)),
            eq(facts.metricKey, "tax.multiplier"),
            isNull(facts.supersededAt),
          ),
        )
        .orderBy(facts.validFrom);
    const zurich = await multipliers("261");
    expect(zurich.map((f) => f.validFrom)).toEqual(
      [2021, 2022, 2023, 2024, 2025, 2026].map((year) => `${year}-01-01`),
    );
    expect(zurich.every((f) => Number(f.value) === 1.19)).toBe(true);
    expect(await multipliers("21")).toEqual([]);
  });
});

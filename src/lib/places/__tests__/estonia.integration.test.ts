/**
 * The Estonia pack through the real importer into a real database: its
 * counties and municipalities from EHAK (data/places/estonia/administrative-units.json),
 * then its income tax (data/places/estonia/income-tax.json). Tallinn resolves
 * up its chain to Harju county and Estonia, and its tax is the Income Tax
 * Act's: 22 % of what is above 8,400 euros.
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
import { estoniaIncomeTax } from "@/lib/config/places/countries/estonia";
import { db } from "@/lib/db/client";
import { jurisdictionIdentifiers, jurisdictions } from "@/lib/db/places-schema";
import { evaluate } from "@/lib/tax-model";
import { evaluatorFacts, loadChain, loadFacts } from "../chain";
import { runImport, type ImportReport } from "../importer/run";
import type { SnapshotStore } from "../importer/snapshots";
import { searchPlaces } from "../search";
import { withTestland } from "./fixtures/testland/config";

const RUN = process.env.INTEGRATION === "1";
const ON = "2026-11-08";

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

const DATA = join(__dirname, "../../../../data/places/estonia");
/** In the order a first load imports them: the places, then their tax. */
const RETRIEVALS: [sourceKey: string, path: string][] = [
  ["ee-ehak-units", join(DATA, "administrative-units.json")],
  ["ee-income-tax", join(DATA, "income-tax.json")],
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

describe.skipIf(!RUN)("Estonia, imported", () => {
  it("imports the counties and municipalities, then the tax", async () => {
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

  it("holds fifteen counties and every municipality EHAK lists", async () => {
    const count = async (level: string) =>
      (
        await db
          .select({ id: jurisdictions.id })
          .from(jurisdictions)
          .where(and(eq(jurisdictions.countryPack, "estonia"), eq(jurisdictions.levelKey, level)))
      ).length;
    expect(await count("county")).toBe(15);
    expect(await count("municipality")).toBe(78);
  });

  it("resolves Tallinn up its chain to Harju county and Estonia", async () => {
    const chain = await loadChain(db, await placeId("ee_municipality", "0784"), ON);
    const ladder = chain
      .filter((p) => p.depth !== null)
      .sort((a, b) => a.depth! - b.depth!)
      .map((p) => [p.levelKey, p.names.find((n) => n.locale === "et")?.name]);
    expect(ladder).toEqual([
      ["municipality", "Tallinn"],
      ["county", "Harju maakond"],
      ["nation", "Eesti"],
    ]);
  });

  it("finds Tartu by its Estonian name", async () => {
    const found = await searchPlaces(db, config, "Tartu linn", ON, "en");
    expect(found.hits[0]).toMatchObject({ packName: "Estonia" });
  });

  it("taxes 22 % of what is above 8,400 euros, the same in Tallinn and Narva", async () => {
    for (const code of ["0784", "0511"]) {
      const chain = await loadChain(db, await placeId("ee_municipality", code), ON);
      const facts = evaluatorFacts(
        chain,
        await loadFacts(
          db,
          chain.map((p) => p.id),
          ON,
        ),
      );
      const at = (income: number) =>
        evaluate(estoniaIncomeTax, facts, {
          values: { taxable_income: income },
          variant: "single",
        });
      expect(at(40_000)).toMatchObject({ complete: true, currency: "EUR" });
      expect(at(40_000).total).toBeCloseTo(6_952, 2);
      expect(at(8_000).total).toBe(0);
    }
  });
});

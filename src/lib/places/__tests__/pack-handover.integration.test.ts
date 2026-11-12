/**
 * A country the world pack holds, taken over by a pack of its own: the place
 * moves (same id, so its figures stay; its old path redirects), what the new
 * pack restates under it moves too, the rest of what the world pack held
 * under it ends, and a world file not yet regenerated cannot take it back.
 *
 * Runs only with INTEGRATION=1 against a migrated database.
 */
import { and, eq, isNull } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { placesConfig } from "@/lib/config/places";
import { db } from "@/lib/db/client";
import {
  facts,
  jurisdictionIdentifiers,
  jurisdictionRelations,
  jurisdictions,
  placePaths,
} from "@/lib/db/places-schema";
import type { ImportBatch } from "../importer/batch";
import { runImport } from "../importer/run";
import type { SnapshotStore } from "../importer/snapshots";
import { encode } from "./fixtures/testland/batch";
import { withTestland } from "./fixtures/testland/config";

const RUN = process.env.INTEGRATION === "1";
const config = withTestland(placesConfig);
const snapshots: SnapshotStore = {
  put: async (sha) => `memory/${sha}`,
  get: async () => {
    throw new Error("not needed here");
  },
};

// A user-assigned code (XA–XZ, QM–QZ) no place holds yet, so no real country is touched and a
// rerun on one database starts from a country the world pack still holds.
const USER_ASSIGNED = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"]
  .map((l) => `X${l}`)
  .concat([..."MNOPQRSTUVWXYZ"].map((l) => `Q${l}`));
let QZ = "";
const nameOf = (en: string) => [
  { locale: "en", script: null, name: en, nameType: "self" as const },
];
const place = (scheme: string, value: string, levelKey: string, name: string) => ({
  ref: { scheme, value },
  levelKey,
  names: nameOf(name),
  identifiers: [],
  validFrom: null,
  validTo: null,
});
const partOf = (from: [string, string], to: [string, string]) => ({
  from: { scheme: from[0], value: from[1] },
  to: { scheme: to[0], value: to[1] },
  relation: "part_of" as const,
  validFrom: null,
  validTo: null,
});
const EARTH: [string, string] = ["world_root", "earth"];
const nationRef = (): [string, string] => ["iso_3166_1", QZ];
const sub = (n: string): [string, string] => ["iso_3166_2", `${QZ}-${n}`];

const worldBatch = (): ImportBatch =>
  ({
    pack: "world",
    jurisdictions: [
      place(...EARTH, "world", "The world"),
      place(...nationRef(), "nation", `Quuxland ${QZ}`),
      place(...sub("01"), "subdivision", `North ${QZ}`),
      place(...sub("02"), "subdivision", `South ${QZ}`),
      place(...sub("01A"), "subdivision_2", `Upper North ${QZ}`),
    ],
    relations: [
      partOf(nationRef(), EARTH),
      partOf(sub("01"), nationRef()),
      partOf(sub("02"), nationRef()),
      partOf(sub("01A"), sub("01")),
    ],
    facts: [],
    postcodes: [],
    areas: [],
    instruments: [],
  }) as unknown as ImportBatch;

const read = (sourceKey: string, batch: unknown) =>
  runImport(db, {
    config,
    sourceKey,
    retrieval: { bytes: encode(batch), url: null, retrievedAt: new Date() },
    snapshots,
    gitSha: null,
  });

async function idOf([scheme, value]: [string, string]): Promise<string> {
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
  return row!.id;
}
const rowOf = async (ref: [string, string]) =>
  (
    await db
      .select()
      .from(jurisdictions)
      .where(eq(jurisdictions.id, await idOf(ref)))
  )[0]!;

describe.runIf(RUN)("a country taken over by a pack of its own", () => {
  it("moves with its figures, its old path redirects, and the world cannot take it back", async () => {
    const held = new Set(
      (
        await db
          .select({ value: jurisdictionIdentifiers.value })
          .from(jurisdictionIdentifiers)
          .where(eq(jurisdictionIdentifiers.scheme, "iso_3166_1"))
      ).map((r) => r.value),
    );
    QZ = USER_ASSIGNED.find((code) => !held.has(code))!;
    expect(QZ).toBeDefined();
    const world = await read("testland-world", worldBatch());
    expect(world.problems).toEqual([]);
    const nationId = await idOf(nationRef());
    const worldPath = (await rowOf(nationRef())).slugPath!;
    // A figure the world pack's country holds.
    const figure = await read("testland-world", {
      pack: "world",
      jurisdictions: [],
      relations: [],
      facts: [
        {
          jurisdiction: { scheme: nationRef()[0], value: nationRef()[1] },
          metricKey: "economy.government.consumption",
          variant: null,
          validFrom: "2024-01-01",
          validTo: "2025-01-01",
          value: 0.2,
          quality: "normal",
          publisherFlag: null,
        },
      ],
      postcodes: [],
      areas: [],
      instruments: [],
    });
    expect(figure.problems).toEqual([]);

    // Quuxland's own register: the nation, and one province of the two the world held.
    const own = await read("quuxland-register", {
      pack: "quuxland",
      jurisdictions: [
        place(...nationRef(), "nation", `Quuxland ${QZ}`),
        place(...sub("01"), "province", `North ${QZ}`),
      ],
      relations: [partOf(sub("01"), nationRef())],
      facts: [],
      postcodes: [],
      areas: [],
      instruments: [],
    });
    expect(own.problems).toEqual([]);
    expect(own.status).toBe("applied");
    expect(own.counts).toMatchObject({ placesMoved: 2, placesEnded: 2, placesInserted: 0 });

    const nation = await rowOf(nationRef());
    expect(nation).toMatchObject({ id: nationId, countryPack: "quuxland" });
    // The pack's root ("quuxland"; on a database a rerun has used, with the code after it).
    expect(nation.slugPath).toMatch(/^quuxland/);
    expect(await rowOf(sub("01"))).toMatchObject({ countryPack: "quuxland", levelKey: "province" });
    expect((await rowOf(sub("02"))).validTo).not.toBeNull();
    expect((await rowOf(sub("01A"))).validTo).not.toBeNull();
    // Its figure stays: the place is the same row.
    expect(
      await db.select({ id: facts.id }).from(facts).where(eq(facts.jurisdictionId, nationId)),
    ).toHaveLength(1);
    // Its page is at its new path; the old one stays and redirects.
    const paths = await db
      .select({ path: placePaths.path, canonical: placePaths.canonical })
      .from(placePaths)
      .where(eq(placePaths.jurisdictionId, nationId));
    expect(paths).toEqual(
      expect.arrayContaining([
        { path: nation.slugPath, canonical: true },
        { path: worldPath, canonical: false },
      ]),
    );
    // No longer part of the world.
    const parents = await db
      .select({ to: jurisdictionRelations.toId })
      .from(jurisdictionRelations)
      .where(
        and(
          eq(jurisdictionRelations.fromId, nationId),
          isNull(jurisdictionRelations.supersededAt),
          isNull(jurisdictionRelations.validTo),
        ),
      );
    expect(parents).toEqual([]);

    // A subdivision file not yet regenerated states the provinces under the country alone (the
    // country itself is another source's): they are left where they are.
    const subdivisions = await read("testland-world", {
      ...worldBatch(),
      jurisdictions: worldBatch().jurisdictions.filter((j) => j.levelKey.startsWith("subdivision")),
      relations: worldBatch().relations.filter((r) => r.to.value !== "earth"),
    });
    expect(subdivisions.problems).toEqual([]);
    expect(await rowOf(sub("01"))).toMatchObject({ countryPack: "quuxland", levelKey: "province" });

    // A world file not yet regenerated still states the country: it is left where it is.
    const again = await read("testland-world", worldBatch());
    expect(again.problems).toEqual([]);
    expect(await rowOf(nationRef())).toMatchObject({ countryPack: "quuxland", levelKey: "nation" });
    expect(
      await db
        .select({ to: jurisdictionRelations.toId })
        .from(jurisdictionRelations)
        .where(
          and(
            eq(jurisdictionRelations.fromId, nationId),
            isNull(jurisdictionRelations.supersededAt),
            isNull(jurisdictionRelations.validTo),
          ),
        ),
    ).toEqual([]);
  });
});

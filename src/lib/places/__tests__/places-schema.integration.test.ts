/**
 * The Places tables against a real database: the rules the design puts in the
 * database itself (§4) hold there, whatever code writes to it — and the config
 * sync (§5.3) projects a contributed pack, is idempotent, and refuses to pull
 * a key out from under data.
 *
 * Runs only with INTEGRATION=1 against a migrated database (same harness as the
 * vote spine). Plain `pnpm test` skips it.
 */
import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { placesConfig } from "@/lib/config/places";
import { db } from "@/lib/db/client";
import { organizations } from "@/lib/db/schema";
import {
  facts,
  jurisdictionIdentifiers,
  jurisdictionRelations,
  jurisdictions,
  sources,
} from "@/lib/db/places-schema";
import { PlacesSyncRefused, syncPlacesConfig } from "../sync-config";
import { withTestland } from "./fixtures/testland/config";

const RUN = process.env.INTEGRATION === "1";
const testland = withTestland(placesConfig);
const tag = () => randomUUID().slice(0, 8);

/** The Postgres constraint name or message behind a failed query. */
async function refusal(query: PromiseLike<unknown>): Promise<string> {
  try {
    await query;
  } catch (error) {
    const cause = (error as { cause?: { constraint?: string; message?: string } }).cause;
    return cause?.constraint ?? cause?.message ?? String(error);
  }
  throw new Error("expected the database to refuse");
}

async function aSource() {
  const [row] = await db
    .insert(sources)
    .values({
      sourceKey: "testland-register",
      retrievedAt: new Date(),
      contentSha256: "0".repeat(64),
      snapshotKey: `test/${tag()}`,
      importerVersion: "test",
      licenceSpdx: "CC0-1.0",
    })
    .returning();
  return row!;
}

async function aStatePlace(levelKey: string) {
  const [row] = await db
    .insert(jurisdictions)
    .values({ origin: "state", countryPack: "testland", levelKey, slugPath: `testland/${tag()}` })
    .returning();
  return row!;
}

async function aFoundedPlace() {
  const [org] = await db
    .insert(organizations)
    .values({ slug: `founded-${tag()}`, name: "A founded place" })
    .returning();
  const [row] = await db
    .insert(jurisdictions)
    .values({ origin: "founded", organizationId: org!.id })
    .returning();
  return row!;
}

describe.runIf(RUN)("places:sync-config against the database", () => {
  it("projects a contributed pack, then has nothing left to do", async () => {
    await syncPlacesConfig(db, testland);
    const again = await syncPlacesConfig(db, testland);
    expect(again.applied).toBe(false);
    expect(again.plan).toEqual({ changes: [], refusals: [] });
    expect((await syncPlacesConfig(db, testland, { check: true })).plan.changes).toEqual([]);
  });

  it("refuses to drop a pack that places belong to", async () => {
    await syncPlacesConfig(db, testland);
    await aStatePlace("realm");
    await expect(syncPlacesConfig(db, placesConfig)).rejects.toBeInstanceOf(PlacesSyncRefused);
  });
});

describe.runIf(RUN)("what a place is, enforced by the database", () => {
  it("a state place has a slug path and no organization; a founded one the reverse", async () => {
    await syncPlacesConfig(db, testland);
    expect((await aStatePlace("shire")).origin).toBe("state");
    expect((await aFoundedPlace()).origin).toBe("founded");
    expect(
      await refusal(db.insert(jurisdictions).values({ origin: "state", countryPack: "testland" })),
    ).toBe("jurisdictions_origin_shape");
    expect(await refusal(db.insert(jurisdictions).values({ origin: "founded" }))).toBe(
      "jurisdictions_origin_shape",
    );
  });

  it("a level belongs to a pack, and must be one of that pack's levels", async () => {
    await syncPlacesConfig(db, testland);
    expect(
      await refusal(
        db
          .insert(jurisdictions)
          .values({ origin: "state", levelKey: "shire", slugPath: `x/${tag()}` }),
      ),
    ).toBe("jurisdictions_level_needs_pack");
    expect(await refusal(aStatePlace("county"))).toBe("jurisdictions_level_fkey");
  });

  it("a place's origin never changes", async () => {
    await syncPlacesConfig(db, testland);
    const place = await aStatePlace("parish");
    expect(
      await refusal(
        db.update(jurisdictions).set({ origin: "founded" }).where(eq(jurisdictions.id, place.id)),
      ),
    ).toMatch(/origin never changes/);
  });

  it("nothing is deleted", async () => {
    await syncPlacesConfig(db, testland);
    const place = await aStatePlace("parish");
    expect(await refusal(db.delete(jurisdictions).where(eq(jurisdictions.id, place.id)))).toMatch(
      /never deleted/,
    );
  });
});

describe.runIf(RUN)("identifiers: nobody impersonates a state", () => {
  it("refuses a reserved scheme on a founded place, allows an open one", async () => {
    await syncPlacesConfig(db, testland);
    const source = await aSource();
    const founded = await aFoundedPlace();
    const state = await aStatePlace("realm");
    const code = `T${Math.floor(Math.random() * 900 + 100)}-${tag()}`;
    expect(
      await refusal(
        db.insert(jurisdictionIdentifiers).values({
          jurisdictionId: founded.id,
          scheme: "testland_register",
          value: code,
          sourceId: source.id,
        }),
      ),
    ).toMatch(/reserved for state authorities/);
    await db.insert(jurisdictionIdentifiers).values([
      { jurisdictionId: state.id, scheme: "testland_register", value: code, sourceId: source.id },
      { jurisdictionId: founded.id, scheme: "testland_hamlet", value: tag(), sourceId: source.id },
    ]);
  });

  it("one holder per code at a time", async () => {
    await syncPlacesConfig(db, testland);
    const source = await aSource();
    const [a, b] = [await aStatePlace("parish"), await aStatePlace("parish")];
    const code = `T-${tag()}`;
    await db.insert(jurisdictionIdentifiers).values({
      jurisdictionId: a.id,
      scheme: "testland_register",
      value: code,
      sourceId: source.id,
    });
    expect(
      await refusal(
        db.insert(jurisdictionIdentifiers).values({
          jurisdictionId: b.id,
          scheme: "testland_register",
          value: code,
          sourceId: source.id,
        }),
      ),
    ).toBe("jurisdiction_identifiers_scheme_value_valid_from_key");
  });
});

describe.runIf(RUN)("relations: one current parent", () => {
  it("refuses a second current parent, allows it once the first has ended", async () => {
    await syncPlacesConfig(db, testland);
    const source = await aSource();
    const [shireA, shireB, parish] = [
      await aStatePlace("shire"),
      await aStatePlace("shire"),
      await aStatePlace("parish"),
    ];
    const partOf = (toId: string) => ({
      fromId: parish.id,
      toId,
      relation: "part_of" as const,
      sourceId: source.id,
      validFrom: "2020-01-01",
    });
    const [first] = await db.insert(jurisdictionRelations).values(partOf(shireA.id)).returning();
    expect(await refusal(db.insert(jurisdictionRelations).values(partOf(shireB.id)))).toBe(
      "jurisdiction_relations_one_current_parent",
    );
    await db
      .update(jurisdictionRelations)
      .set({ validTo: "2024-01-01" })
      .where(eq(jurisdictionRelations.id, first!.id));
    await db
      .insert(jurisdictionRelations)
      .values({ ...partOf(shireB.id), validFrom: "2024-01-01" });
  });

  it("refuses an unsourced relation, except what a founded place says of itself", async () => {
    await syncPlacesConfig(db, testland);
    const [founded, parish] = [await aFoundedPlace(), await aStatePlace("parish")];
    expect(
      await refusal(
        db
          .insert(jurisdictionRelations)
          .values({ fromId: parish.id, toId: founded.id, relation: "recognises" }),
      ),
    ).toBe("jurisdiction_relations_sourced");
    await db
      .insert(jurisdictionRelations)
      .values({ fromId: founded.id, toId: parish.id, relation: "located_in" });
  });
});

describe.runIf(RUN)("facts", () => {
  it("hold exactly one value, and a correction names its decision", async () => {
    await syncPlacesConfig(db, testland);
    const source = await aSource();
    const parish = await aStatePlace("parish");
    const fact = {
      jurisdictionId: parish.id,
      metricKey: "test.multiplier",
      validFrom: "2025-04-01",
      sourceId: source.id,
      method: "imported" as const,
    };
    expect(await refusal(db.insert(facts).values(fact))).toBe("facts_one_value");
    expect(
      await refusal(db.insert(facts).values({ ...fact, valueNumeric: "1.2", method: "corrected" })),
    ).toBe("facts_correction_names_its_decision");
    await db.insert(facts).values({ ...fact, valueNumeric: "1.2" });
    expect(await refusal(db.insert(facts).values({ ...fact, valueNumeric: "1.3" }))).toBe(
      "facts_one_current_per_key",
    );
  });
});

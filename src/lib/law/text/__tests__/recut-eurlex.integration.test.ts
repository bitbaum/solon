/**
 * Cutting the EU acts held again from the EUR-Lex pages they were read from,
 * against a real database: an act published before EUR-Lex marked anything,
 * stored whole, comes out in its articles; a version read from the Internet
 * Archive keeps that mark. Runs only with INTEGRATION=1.
 */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { EURLEX } from "@/lib/config/law";
import { db } from "@/lib/db/client";
import { legalActs, legalActVersions, legalProvisions } from "@/lib/db/law-schema";
import { sources } from "@/lib/db/places-schema";
import type { SnapshotStore } from "@/lib/places/importer/snapshots";
import { EURLEX_IMPORTER_VERSION } from "../import-eurlex";
import { recutEurLexText } from "../recut";

const RUN = process.env.INTEGRATION === "1";

const HTML = `<html><body><div id="TexteOnly"><p>THE COMMISSION OF THE EUROPEAN COMMUNITIES,</p><p>HAS ADOPTED THIS REGULATION:</p><p>Article 1</p><p>The amounts are fixed in the Annex.</p><p>Article 2</p><p>This Regulation shall enter into force on the day of its publication.</p><p>ANNEX</p><p>Amounts in ECU per tonne.</p></div></body></html>`;
const bytes = new TextEncoder().encode(HTML);
const snapshots: SnapshotStore = {
  async put(sha) {
    return `memory/${sha}`;
  },
  async get() {
    return bytes;
  },
};

async function heldWhole(importerVersion: string) {
  const [source] = await db
    .insert(sources)
    .values({
      sourceKey: EURLEX.key,
      retrievedAt: new Date(),
      url: "https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:31995R0903",
      contentSha256: randomUUID().replace(/-/g, "").padEnd(64, "0"),
      snapshotKey: "memory/test",
      importerVersion,
      licenceSpdx: EURLEX.licenceSpdx,
    })
    .returning({ id: sources.id });
  const actId = randomUUID();
  await db.insert(legalActs).values({
    id: actId,
    authority: EURLEX.authority,
    kind: "regulation",
    inForce: true,
    sourceId: source!.id,
  });
  const [version] = await db
    .insert(legalActVersions)
    .values({
      actId,
      lang: "en",
      inForceFrom: "1995-04-26",
      dateBasis: "publisher",
      status: EURLEX.textStatus,
      format: "html",
      sourceId: source!.id,
    })
    .returning({ id: legalActVersions.id });
  await db
    .insert(legalProvisions)
    .values({ versionId: version!.id, path: "text", heading: "", text: "whole", ord: 0 });
  return { sourceId: source!.id, versionId: version!.id };
}

describe.skipIf(!RUN)("recutEurLexText", () => {
  it("cuts an older act held whole into its preamble, articles and annex, once", async () => {
    const held = await heldWhole("law-text-eurlex-1");
    const first = await recutEurLexText(db, { snapshots });
    expect(first.improved).toBeGreaterThanOrEqual(1);
    const rows = await db
      .select({ path: legalProvisions.path })
      .from(legalProvisions)
      .where(eq(legalProvisions.versionId, held.versionId))
      .orderBy(legalProvisions.ord);
    expect(rows.map((r) => r.path)).toEqual(["pbl_1", "art_1", "art_2", "anx_1"]);
    const [src] = await db.select().from(sources).where(eq(sources.id, held.sourceId));
    expect(src!.importerVersion).toBe(EURLEX_IMPORTER_VERSION);
    expect((await recutEurLexText(db, { snapshots })).examined).toBe(0);
  });

  it("keeps the mark of a version read from the Internet Archive", async () => {
    const held = await heldWhole("law-text-eurlex-1+archive");
    await recutEurLexText(db, { snapshots });
    const [src] = await db.select().from(sources).where(eq(sources.id, held.sourceId));
    expect(src!.importerVersion).toBe(`${EURLEX_IMPORTER_VERSION}+archive`);
  });
});

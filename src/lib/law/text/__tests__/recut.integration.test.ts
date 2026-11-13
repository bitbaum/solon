/**
 * Cutting held cantonal acts again from their snapshots, against a real
 * database. Runs only with INTEGRATION=1.
 */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { CANTONAL_DOCUMENTS } from "@/lib/config/law";
import { db } from "@/lib/db/client";
import { legalActs, legalActVersions, legalProvisions } from "@/lib/db/law-schema";
import { sources } from "@/lib/db/places-schema";
import type { SnapshotStore } from "@/lib/places/importer/snapshots";
import { CANTONAL_IMPORTER_VERSION } from "../import-cantonal";
import { recutCantonalText } from "../recut";

const RUN = process.env.INTEGRATION === "1";

// As Neuchâtel prints it: "Article premier", notes glued to the numbers, paragraphs glued to the text.
const HTML = `<html><body><p>arrête:</p><p>Article premier2) Le département est compétent.</p><p>Art. 23) Le service informatique est l'exploitant.</p><p>Art. 3 1La commission est nommée.</p></body></html>`;
const bytes = new TextEncoder().encode(HTML);
const snapshots: SnapshotStore = {
  async put(sha) {
    return `memory/${sha}`;
  },
  async get() {
    return bytes;
  },
};

describe.skipIf(!RUN)("recutCantonalText", () => {
  it("cuts an act held whole into its articles, once, from its own snapshot", async () => {
    const [source] = await db
      .insert(sources)
      .values({
        sourceKey: CANTONAL_DOCUMENTS.key,
        retrievedAt: new Date(),
        url: "https://www.lexfind.ch/tol/1/de",
        contentSha256: "a".repeat(64),
        snapshotKey: "memory/test",
        importerVersion: "law-text-cantonal-1",
        licenceSpdx: CANTONAL_DOCUMENTS.licenceSpdx,
      })
      .returning({ id: sources.id });
    const actId = randomUUID();
    await db.insert(legalActs).values({
      id: actId,
      authority: "ne",
      kind: "ordinance",
      inForce: true,
      sourceId: source!.id,
    });
    const [version] = await db
      .insert(legalActVersions)
      .values({
        actId,
        lang: "de",
        inForceFrom: "2026-10-23",
        dateBasis: "retrieved",
        status: "consolidated",
        format: "html",
        sourceId: source!.id,
      })
      .returning({ id: legalActVersions.id });
    await db
      .insert(legalProvisions)
      .values({ versionId: version!.id, path: "text", heading: "", text: "whole", ord: 0 });

    const first = await recutCantonalText(db, { snapshots, authority: "ne" });
    expect(first.improved).toBeGreaterThanOrEqual(1);
    const rows = await db
      .select({ path: legalProvisions.path, text: legalProvisions.text })
      .from(legalProvisions)
      .where(eq(legalProvisions.versionId, version!.id))
      .orderBy(legalProvisions.ord);
    expect(rows.map((r) => r.path)).toEqual(["art_1", "art_2", "art_3"]);
    expect(rows[0]!.text).toBe("Le département est compétent.");
    const [src] = await db.select().from(sources).where(eq(sources.id, source!.id));
    expect(src!.importerVersion).toBe(CANTONAL_IMPORTER_VERSION);

    const again = await recutCantonalText(db, { snapshots, authority: "ne" });
    expect(again.examined).toBe(0);
  });

  it("keeps the mark of a text read by OCR, and leaves it alone once it carries the current version", async () => {
    const [source] = await db
      .insert(sources)
      .values({
        sourceKey: CANTONAL_DOCUMENTS.key,
        retrievedAt: new Date(),
        url: "https://www.lexfind.ch/tol/2/de",
        contentSha256: "c".repeat(64),
        snapshotKey: "memory/test-ocr",
        importerVersion: "law-text-cantonal-0+ocr",
        licenceSpdx: CANTONAL_DOCUMENTS.licenceSpdx,
      })
      .returning({ id: sources.id });
    const actId = randomUUID();
    await db.insert(legalActs).values({
      id: actId,
      authority: "ne",
      kind: "ordinance",
      inForce: true,
      sourceId: source!.id,
    });
    const [version] = await db
      .insert(legalActVersions)
      .values({
        actId,
        lang: "de",
        inForceFrom: "2026-10-24",
        dateBasis: "retrieved",
        status: "consolidated",
        format: "html",
        sourceId: source!.id,
      })
      .returning({ id: legalActVersions.id });
    await db
      .insert(legalProvisions)
      .values({ versionId: version!.id, path: "text", heading: "", text: "whole", ord: 0 });

    await recutCantonalText(db, { snapshots, authority: "ne" });
    const [src] = await db.select().from(sources).where(eq(sources.id, source!.id));
    expect(src!.importerVersion).toBe(`${CANTONAL_IMPORTER_VERSION}+ocr`);
    const again = await recutCantonalText(db, { snapshots, authority: "ne" });
    expect(again.examined).toBe(0);
  });
});

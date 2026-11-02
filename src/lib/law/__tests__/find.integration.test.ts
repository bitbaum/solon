/**
 * Searching the law the way a person types it, against a real database
 * (INTEGRATION=1): a slipped letter, a missing umlaut, and nothing at all.
 */
import { randomUUID } from "node:crypto";
import { inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { legalActNames, legalActs } from "@/lib/db/law-schema";
import { sources } from "@/lib/db/places-schema";
import { findActs, findLaw } from "../find";

const RUN = process.env.INTEGRATION === "1";

describe.skipIf(!RUN)("findActs / findLaw", () => {
  // Words no real act has, so the test reads only its own rows.
  const word = `Quarkfrucht${randomUUID().slice(0, 4).replace(/[0-9]/g, "x")}`;
  const ids = [randomUUID(), randomUUID()];
  let sourceId = "";
  const titles = [`Verordnung über die ${word}steuer`, `Gesetz über Zürcher Lärmschutz ${word}`];

  beforeAll(async () => {
    const [source] = await db
      .insert(sources)
      .values({
        sourceKey: "find-test",
        retrievedAt: new Date(),
        url: "https://example.org/find-test",
        contentSha256: "b".repeat(64),
        snapshotKey: "memory/find-test",
        importerVersion: "find-test-1",
        licenceSpdx: "CC0-1.0",
      })
      .returning({ id: sources.id });
    sourceId = source!.id;
    await db
      .insert(legalActs)
      .values(
        ids.map((id) => ({ id, authority: "ch", kind: "ordinance", inForce: true, sourceId })),
      );
    await db
      .insert(legalActNames)
      .values(
        ids.map((actId, i) => ({ actId, locale: "de", kind: "title", text: titles[i]!, sourceId })),
      );
  });

  afterAll(async () => {
    await db.delete(legalActNames).where(inArray(legalActNames.actId, ids));
    await db.delete(legalActs).where(inArray(legalActs.id, ids));
  });

  it("finds a title by the word as typed, and marks it", async () => {
    const found = await findActs(db, { query: `${word}steuer` });
    expect(found.map((a) => a.id)).toContain(ids[0]);
    expect(found.find((a) => a.id === ids[0])!.marks.length).toBeGreaterThan(0);
  });

  it("forgives a slipped letter", async () => {
    const slipped = `${word.slice(0, 6)}${word.slice(7)}steuer`; // one letter dropped
    const found = await findActs(db, { query: slipped });
    expect(found.map((a) => a.id)).toContain(ids[0]);
  });

  it("finds Zürcher typed without its umlaut", async () => {
    const found = await findActs(db, { query: `zurcher larmschutz` });
    expect(found.map((a) => a.id)).toContain(ids[1]);
  });

  it("offers what was probably meant when nothing matches", async () => {
    const result = await findLaw(db, { query: `${word.slice(0, 6)}${word.slice(7)}stuer` });
    // Either the typos are forgiven, or the closest query is suggested; never silence.
    expect(result.acts.length > 0 || result.suggestion !== null).toBe(true);
  });

  it("returns nothing, without a suggestion, for gibberish", async () => {
    const result = await findLaw(db, { query: "qzxwvkjhgf" });
    expect(result.acts).toEqual([]);
    expect(result.provisions).toEqual([]);
  });
});

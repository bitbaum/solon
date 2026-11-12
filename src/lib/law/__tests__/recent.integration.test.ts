/**
 * Recent changes list an act once, in the reader's language, however many
 * languages Solon holds it in. Runs only with INTEGRATION=1.
 */
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { CANTONAL_DOCUMENTS } from "@/lib/config/law";
import { db } from "@/lib/db/client";
import { legalActNames, legalActs, legalActVersions } from "@/lib/db/law-schema";
import { sources } from "@/lib/db/places-schema";
import { recentChanges } from "../recent";

const RUN = process.env.INTEGRATION === "1";

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

describe.skipIf(!RUN)("recentChanges", () => {
  it("lists an act held in two languages once, by its latest text, titled in the reader's language", async () => {
    const [source] = await db
      .insert(sources)
      .values({
        sourceKey: CANTONAL_DOCUMENTS.key,
        retrievedAt: new Date(),
        url: "https://example.org/act",
        contentSha256: "b".repeat(64),
        snapshotKey: "memory/test",
        importerVersion: "test",
        licenceSpdx: CANTONAL_DOCUMENTS.licenceSpdx,
      })
      .returning({ id: sources.id });
    const actId = randomUUID();
    const tag = actId.slice(0, 8);
    await db.insert(legalActs).values({
      id: actId,
      authority: "ne",
      kind: "ordinance",
      inForce: true,
      sourceId: source!.id,
    });
    for (const [lang, from] of [
      ["de", daysAgo(10)],
      ["fr", daysAgo(5)],
    ] as const) {
      await db.insert(legalActVersions).values({
        actId,
        lang,
        inForceFrom: from,
        dateBasis: "publisher",
        status: "consolidated",
        format: "html",
        sourceId: source!.id,
      });
    }
    await db.insert(legalActNames).values([
      { actId, locale: "de", kind: "title", text: `Verordnung ${tag}`, sourceId: source!.id },
      { actId, locale: "fr", kind: "title", text: `Arrêté ${tag}`, sourceId: source!.id },
    ]);

    const ours = async (locale: string) =>
      (await recentChanges(db, ["ne"], daysAgo(0), locale, 1000)).changes.filter(
        (c) => c.actId === actId,
      );
    expect(await ours("fr")).toEqual([
      expect.objectContaining({ title: `Arrêté ${tag}`, inForceFrom: daysAgo(5) }),
    ]);
    expect((await ours("de")).map((c) => c.title)).toEqual([`Verordnung ${tag}`]);
    // A language it is not held in: one row all the same, in one of its own.
    expect(await ours("it")).toHaveLength(1);
  });
});

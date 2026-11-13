/**
 * The translation cache against a real database (INTEGRATION=1): a passage is
 * translated once for every reader, and words the publisher changes are
 * translated again because they hash differently.
 */
import { randomUUID } from "node:crypto";
import { inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { textTranslations } from "@/lib/db/law-schema";
import { cachedTranslations, textHash, translateMissing, type Ask } from "../translate";

const RUN = process.env.INTEGRATION === "1";

describe.skipIf(!RUN)("translateMissing", () => {
  const tag = randomUUID().slice(0, 8);
  const passages = [`Статья 1 ${tag}`, `Статья 2 ${tag}`];
  let asked = 0;
  const ask: Ask = async (messages) => {
    asked++;
    const items = JSON.parse(String(messages[1]!.content)) as string[];
    return {
      text: JSON.stringify(items.map((p) => p.replace("Статья", "Article"))),
      id: "test/model",
    };
  };

  afterAll(async () => {
    await db
      .delete(textTranslations)
      .where(
        inArray(textTranslations.sourceSha256, [...passages, `Статья 3 ${tag}`].map(textHash)),
      );
  });

  it("stops at the first batch nobody answers, and says so once", async () => {
    // 2026-11-13: with the free pools spent, every batch walked every model.
    const many = Array.from(
      { length: 40 },
      (_, i) => `${"Длинная статья ".repeat(120)}${i} ${tag}`,
    );
    let calls = 0;
    let told = 0;
    const result = await translateMissing(
      db,
      many,
      "ru",
      "en",
      async () => {
        calls++;
        throw new Error("every link refused");
      },
      { onUnanswered: () => told++ },
    );
    expect(calls).toBe(1);
    expect(told).toBe(1);
    expect(result).toEqual({ kept: 0, failed: 40 });
  });

  it("translates what it does not hold, keeps it, and asks nothing the second time", async () => {
    expect(await translateMissing(db, passages, "ru", "en", ask)).toEqual({ kept: 2, failed: 0 });
    const held = await cachedTranslations(db, passages, "en");
    expect(held.get(textHash(passages[0]!))).toBe(`Article 1 ${tag}`);
    const before = asked;
    expect(await translateMissing(db, passages, "ru", "en", ask)).toEqual({ kept: 0, failed: 0 });
    expect(asked).toBe(before);
  });

  it("translates changed words afresh, and keeps nothing a failed answer gave", async () => {
    const failing: Ask = async () => ({ text: "no", id: "test/model" });
    expect(await translateMissing(db, [`Статья 3 ${tag}`], "ru", "en", failing)).toEqual({
      kept: 0,
      failed: 1,
    });
    expect((await cachedTranslations(db, [`Статья 3 ${tag}`], "en")).size).toBe(0);
  });
});

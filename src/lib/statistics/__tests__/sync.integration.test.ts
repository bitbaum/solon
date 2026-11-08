/**
 * The statistics record against a real database (INTEGRATION=1): the curated
 * list is written once, a change is a new row, a removal is a retraction, and
 * the database refuses to change or delete any row.
 */
import { randomUUID } from "node:crypto";
import { eq, like } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { statisticRecords } from "@/lib/db/statistics-schema";
import { curatedRecordSchema, type CuratedRecord } from "../records";
import { currentRecords } from "../read";
import { syncStatisticRecords } from "../sync";

const RUN = process.env.INTEGRATION === "1";

describe.skipIf(!RUN)("syncStatisticRecords", () => {
  const prefix = `law_link:test-${randomUUID().slice(0, 8)}`;
  const link = (key: string, why: string): CuratedRecord =>
    curatedRecordSchema.parse({
      key: `${prefix}:${key}`,
      kind: "law_link",
      metric: "tax.income.top_rate",
      body: {
        place: null,
        act: { authority: "ch", scheme: "systematic_number", value: "642.11" },
        provision: "art_36",
        why: { en: why },
        evidence: [{ publisher: "Test", url: "https://example.org/a", read: "2026-11-08" }],
      },
    });
  const ours = async () =>
    db
      .select()
      .from(statisticRecords)
      .where(like(statisticRecords.recordKey, `${prefix}%`))
      .orderBy(statisticRecords.recordedAt);

  it("asserts once, changes by a new row, retracts what config dropped", async () => {
    const a = link("a", "first");
    const b = link("b", "second");
    const first = await syncStatisticRecords(db, [a, b], { gitSha: "t1", within: prefix });
    expect(first.asserted).toEqual([a.key, b.key]);

    const again = await syncStatisticRecords(db, [a, b], { gitSha: "t2", within: prefix });
    expect(again.asserted).toEqual([]);
    expect(again.unchanged).toBeGreaterThanOrEqual(2);

    const changed = link("a", "first, reworded");
    await new Promise((r) => setTimeout(r, 5));
    const third = await syncStatisticRecords(db, [changed], { gitSha: "t3", within: prefix });
    expect(third.asserted).toEqual([changed.key]);
    expect(third.retracted).toContain(b.key);

    const rows = await ours();
    expect(rows.map((r) => [r.recordKey.slice(prefix.length + 1), r.state])).toEqual([
      ["a", "asserted"],
      ["b", "asserted"],
      ["a", "asserted"],
      ["b", "retracted"],
    ]);
    const current = (await currentRecords(db, { metricKeys: ["tax.income.top_rate"] })).filter(
      (r) => r.recordKey.startsWith(prefix),
    );
    expect(current.map((r) => r.recordKey)).toEqual([changed.key]);
    expect((current[0]!.body as { why: { en: string } }).why.en).toBe("first, reworded");
  });

  it("is refused any change or deletion by the database", async () => {
    const [row] = await ours();
    await expect(
      db
        .update(statisticRecords)
        .set({ state: "retracted" })
        .where(eq(statisticRecords.id, row!.id)),
    ).rejects.toThrow();
    await expect(
      db.delete(statisticRecords).where(eq(statisticRecords.id, row!.id)),
    ).rejects.toThrow();
  });
});

describe.skipIf(!RUN)("saved views as evidence", () => {
  it("attaches to a proposal the saved views its text links, and only those that exist", async () => {
    const { saveView, attachCitedViews, evidenceOf } = await import("../views");
    const { proposals, organizations, members } = await import("@/lib/db/schema");
    const sha = await saveView(
      db,
      {
        version: 1,
        metric: "tax.income.top_rate",
        places: [randomUUID().slice(0, 6).toUpperCase()],
        from: null,
        to: null,
        axis: null,
      },
      null,
    );
    const [org] = await db.select().from(organizations).limit(1);
    const [member] = await db
      .insert(members)
      .values({
        organizationId: org!.id,
        displayName: "Evidence tester",
        memberType: "HUMAN",
        keyCustody: "SELF",
        bitcoinAddress: `bc1qtest${randomUUID().replaceAll("-", "").slice(0, 30)}`,
      })
      .returning();
    const [proposal] = await db
      .insert(proposals)
      .values({
        organizationId: org!.id,
        category: "OPERATIONS",
        title: "Evidence test",
        body: "x",
        proposerMemberId: member!.id,
        proposerSignature: "sig",
        status: "DRAFT",
      })
      .returning();
    const text = `Evidence: /statistics/view/${sha} and /statistics/view/${"f".repeat(64)}`;
    expect(await attachCitedViews(db, proposal!.id, text, member!.id)).toEqual([sha]);
    expect(await attachCitedViews(db, proposal!.id, text, member!.id)).toEqual([sha]);
    expect((await evidenceOf(db, proposal!.id)).map((e) => e.sha256)).toEqual([sha]);
  });
});

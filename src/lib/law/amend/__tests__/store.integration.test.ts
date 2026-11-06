/**
 * The amendment engine against a real database: file, revise, fork, support
 * and withdraw, signed and unsigned; the law changing underneath; the chain
 * verified end to end; and the database refusing to change a row.
 *
 * Runs only with INTEGRATION=1 against a migrated database.
 */
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { generateKeyPair, signMessage } from "@/lib/bitcoin/message";
import { db } from "@/lib/db/client";
import { lawAmendmentSupports } from "@/lib/db/amendments-schema";
import { legalActVersions, legalActs, legalProvisions } from "@/lib/db/law-schema";
import { sources } from "@/lib/db/places-schema";
import { provisionHash, type Change } from "../changes";
import { amendmentMessage, revisionHash, verifyChain } from "../hash";
import {
  AmendmentError,
  FILINGS_PER_HOUR,
  fileAmendment,
  listAmendments,
  loadAmendment,
  readLog,
  recordSupport,
  reviseAmendment,
} from "../store";

const RUN = process.env.INTEGRATION === "1";

const DOG_TAX = [
  { path: "art_1", heading: "Art. 1 Purpose", text: "This act governs dogs." },
  { path: "art_2", heading: "Art. 2 Tax", text: "The tax on each dog is 100 francs a year." },
  { path: "art_3", heading: "Art. 3 Exemptions", text: "Guide dogs pay no tax." },
];

/** One act with one version in force, as an importer would leave it. */
async function anAct(provisions = DOG_TAX, from = "2026-01-01") {
  const [source] = await db
    .insert(sources)
    .values({
      sourceKey: "test",
      retrievedAt: new Date(),
      contentSha256: "a".repeat(64),
      snapshotKey: "memory/test",
      importerVersion: "test",
      licenceSpdx: "CC0-1.0",
    })
    .returning();
  const [act] = await db
    .insert(legalActs)
    .values({ authority: "gl", kind: "statute", inForce: true, sourceId: source!.id })
    .returning();
  const version = await aVersion(act!.id, source!.id, provisions, from);
  return { actId: act!.id, versionId: version, sourceId: source!.id };
}

async function aVersion(actId: string, sourceId: string, provisions: typeof DOG_TAX, from: string) {
  const [version] = await db
    .insert(legalActVersions)
    .values({
      actId,
      lang: "de",
      inForceFrom: from,
      status: "consolidated",
      format: "html",
      sourceId,
    })
    .returning();
  await db
    .insert(legalProvisions)
    .values(provisions.map((p, ord) => ({ versionId: version!.id, ...p, ord })));
  return version!.id;
}

const lowerTheTax = (): Change[] => [
  {
    op: "replace",
    path: "art_2",
    baseHash: provisionHash(DOG_TAX[1]!),
    text: "The tax on each dog is 50 francs a year.",
  },
];

const alice = { via: "account" as const, actorId: `alice-${randomUUID()}` };
const bob = { via: "account" as const, actorId: `bob-${randomUUID()}` };

describe.skipIf(!RUN)("the amendment engine", () => {
  it("files, revises, is supported and withdrawn, and shows its redline", async () => {
    const { actId } = await anAct();
    const id = randomUUID();
    const filed = await fileAmendment(db, {
      id,
      actor: alice,
      actId,
      lang: "de",
      title: "Halve the dog tax",
      rationale: "The tax costs more to collect than it raises.",
      changes: lowerTheTax(),
    });
    expect(filed.revision).toBe(1);

    await recordSupport(db, { actor: bob, amendmentId: id, revision: 1, kind: "support" });
    const count = await recordSupport(db, {
      actor: alice,
      amendmentId: id,
      revision: 1,
      kind: "support",
    });
    expect(count.total).toBe(2);

    // A new revision: support does not move to words its supporters did not see.
    const revised = await reviseAmendment(db, {
      amendmentId: id,
      actor: alice,
      lang: "de",
      title: "Halve the dog tax, and exempt herding dogs",
      rationale: "As before.",
      changes: [
        ...lowerTheTax(),
        {
          op: "replace",
          path: "art_3",
          baseHash: provisionHash(DOG_TAX[2]!),
          text: "Guide dogs and herding dogs pay no tax.",
        },
      ],
    });
    expect(revised.revision).toBe(2);
    await expect(
      reviseAmendment(db, {
        amendmentId: id,
        actor: bob,
        lang: "de",
        title: "Mine now",
        rationale: "",
        changes: lowerTheTax(),
      }),
    ).rejects.toMatchObject({ status: 403 });

    await recordSupport(db, { actor: bob, amendmentId: id, revision: 1, kind: "withdraw" });

    const view = await loadAmendment(db, id);
    expect(view!.revisions.map((r) => [r.revision, r.support.total])).toEqual([
      [1, 1],
      [2, 0],
    ]);
    expect(view!.standing).toEqual({ state: "current" });
    const tax = view!.amended.find((p) => p.status === "replaced" && p.path === "art_2");
    expect(tax?.redline?.filter((p) => p.kind !== "same").map((p) => p.text.trim())).toEqual([
      "100",
      "50",
    ]);

    const listed = await listAmendments(db, { actId });
    expect(listed.map((a) => [a.title, a.revision])).toEqual([
      ["Halve the dog tax, and exempt herding dogs", 2],
    ]);
  });

  it("refuses changes that do not fit the text in force, and says which", async () => {
    const { actId } = await anAct();
    const error = await fileAmendment(db, {
      id: randomUUID(),
      actor: alice,
      actId,
      lang: "de",
      title: "Written against old text",
      rationale: "",
      changes: [
        { op: "repeal", path: "art_2", baseHash: provisionHash({ text: "an older wording" }) },
      ],
    }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AmendmentError);
    expect((error as AmendmentError).status).toBe(409);
    expect((error as AmendmentError).problems).toEqual([
      { change: 0, kind: "stale_base", path: "art_2" },
    ]);
  });

  it("is outdated once the publisher's new version changes what it amends", async () => {
    const { actId, sourceId, versionId } = await anAct();
    const id = randomUUID();
    await fileAmendment(db, {
      id,
      actor: alice,
      actId,
      lang: "de",
      title: "Halve it",
      rationale: "",
      changes: lowerTheTax(),
    });
    // The publisher issues a new version; the old one is closed the day before.
    await db
      .update(legalActVersions)
      .set({ inForceTo: "2026-06-30" })
      .where(eq(legalActVersions.id, versionId));
    await aVersion(
      actId,
      sourceId,
      DOG_TAX.map((p) =>
        p.path === "art_2" ? { ...p, text: "The tax on each dog is 120 francs a year." } : p,
      ),
      "2026-07-01",
    );
    const view = await loadAmendment(db, id);
    expect(view!.standing).toEqual({
      state: "outdated",
      problems: [{ change: 0, kind: "stale_base", path: "art_2" }],
    });
  });

  it("takes a signed filing and a signed support, and refuses a signature over other words", async () => {
    const { actId } = await anAct();
    const keys = generateKeyPair();
    const id = randomUUID();
    const content = {
      authority: "gl",
      act: actId,
      baseVersion: (
        await db.select().from(legalActVersions).where(eq(legalActVersions.actId, actId))
      )[0]!.id,
      lang: "de",
      title: "Halve the dog tax",
      rationale: "",
      changes: lowerTheTax(),
    };
    const contentHash = revisionHash(content);
    const sign = (act: "file" | "support", revision = 1) =>
      signMessage(
        amendmentMessage({ act, amendmentId: id, revision, contentHash, address: keys.address }),
        keys.privateKeyHex,
      );

    await expect(
      fileAmendment(db, {
        id,
        actor: { via: "key", address: keys.address, signature: sign("support") },
        actId,
        lang: "de",
        title: content.title,
        rationale: "",
        changes: content.changes,
      }),
    ).rejects.toMatchObject({ status: 401 });

    const filed = await fileAmendment(db, {
      id,
      actor: { via: "key", address: keys.address, signature: sign("file") },
      actId,
      lang: "de",
      title: content.title,
      rationale: "",
      changes: content.changes,
    });
    expect(filed.contentHash).toBe(contentHash);
    const count = await recordSupport(db, {
      actor: { via: "key", address: keys.address, signature: sign("support") },
      amendmentId: id,
      revision: 1,
      kind: "support",
    });
    expect(count).toEqual({ total: 1, signed: 1, account: 0 });
  });

  it("forks: anyone may start from another's revision, and the lineage is kept", async () => {
    const { actId } = await anAct();
    const original = randomUUID();
    const first = await fileAmendment(db, {
      id: original,
      actor: alice,
      actId,
      lang: "de",
      title: "Halve it",
      rationale: "",
      changes: lowerTheTax(),
    });
    const fork = randomUUID();
    await fileAmendment(db, {
      id: fork,
      actor: bob,
      actId,
      lang: "de",
      title: "Abolish it",
      rationale: "",
      changes: [{ op: "repeal", path: "art_2", baseHash: provisionHash(DOG_TAX[1]!) }],
      forkOf: first.revisionId,
    });
    expect((await loadAmendment(db, fork))!.forkedFromRevisionId).toBe(first.revisionId);
  });

  it("refuses support that changes nothing, and an author filing past the hourly limit", async () => {
    const { actId } = await anAct();
    const id = randomUUID();
    const carol = { via: "account" as const, actorId: `carol-${randomUUID()}` };
    await fileAmendment(db, {
      id,
      actor: carol,
      actId,
      lang: "de",
      title: "Halve it",
      rationale: "",
      changes: lowerTheTax(),
    });
    await expect(
      recordSupport(db, { actor: bob, amendmentId: id, revision: 1, kind: "withdraw" }),
    ).rejects.toMatchObject({ status: 409 });
    await recordSupport(db, { actor: bob, amendmentId: id, revision: 1, kind: "support" });
    await expect(
      recordSupport(db, { actor: bob, amendmentId: id, revision: 1, kind: "support" }),
    ).rejects.toMatchObject({ status: 409 });

    for (let i = 1; i < FILINGS_PER_HOUR; i++) {
      await fileAmendment(db, {
        id: randomUUID(),
        actor: carol,
        actId,
        lang: "de",
        title: `Halve it ${i}`,
        rationale: "",
        changes: lowerTheTax(),
      });
    }
    await expect(
      fileAmendment(db, {
        id: randomUUID(),
        actor: carol,
        actId,
        lang: "de",
        title: "One too many",
        rationale: "",
        changes: lowerTheTax(),
      }),
    ).rejects.toMatchObject({ status: 429 });
  });

  it("keeps one unbroken chain, and the database refuses to change or remove a row", async () => {
    const log = await readLog(db, 0, 1000);
    expect(log.length).toBeGreaterThan(0);
    expect(verifyChain(log)).toMatchObject({ ok: true });

    // Drizzle wraps the database's refusal; the trigger's own words are on the cause.
    const refusal = (p: Promise<unknown>) =>
      p.then(
        () => "accepted",
        (e: { cause?: { message?: string }; message: string }) => e.cause?.message ?? e.message,
      );
    const [anySupport] = await db.select().from(lawAmendmentSupports).limit(1);
    expect(
      await refusal(
        db
          .update(lawAmendmentSupports)
          .set({ kind: "withdraw" })
          .where(eq(lawAmendmentSupports.id, anySupport!.id)),
      ),
    ).toMatch(/never changed or deleted/);
    expect(
      await refusal(db.execute(sql`DELETE FROM law_amendment_events WHERE seq = ${log[0]!.seq}`)),
    ).toMatch(/never changed or deleted/);
  });
});

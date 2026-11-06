/**
 * The amendment API through its route handlers, as a client would call it:
 * a signed filing and support, the answers for a bad body, a bad signature and
 * text that no longer fits, the public read, and the chain.
 *
 * Runs only with INTEGRATION=1 against a migrated database.
 */
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { generateKeyPair, signMessage } from "@/lib/bitcoin/message";
import { db } from "@/lib/db/client";
import { legalActVersions, legalActs, legalProvisions } from "@/lib/db/law-schema";
import { sources } from "@/lib/db/places-schema";
import { GET as list, POST as file } from "../../../../app/api/v1/law/amendments/route";
import { GET as one } from "../../../../app/api/v1/law/amendments/[id]/route";
import { POST as support } from "../../../../app/api/v1/law/amendments/[id]/support/route";
import { GET as log } from "../../../../app/api/v1/law/amendments/log/route";
import { provisionHash } from "../changes";
import { amendmentMessage, revisionHash, verifyChain } from "../hash";

const RUN = process.env.INTEGRATION === "1";
const ORIGIN = "http://localhost:3000";

const post = (body: unknown) =>
  new Request(`${ORIGIN}/api/v1/law/amendments`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

async function anAct() {
  const [source] = await db
    .insert(sources)
    .values({
      sourceKey: "test",
      retrievedAt: new Date(),
      contentSha256: "b".repeat(64),
      snapshotKey: "memory/test",
      importerVersion: "test",
      licenceSpdx: "CC0-1.0",
    })
    .returning();
  const [act] = await db
    .insert(legalActs)
    .values({ authority: "ch", kind: "statute", inForce: true, sourceId: source!.id })
    .returning();
  const [version] = await db
    .insert(legalActVersions)
    .values({
      actId: act!.id,
      lang: "de",
      inForceFrom: "2026-01-01",
      status: "consolidated",
      format: "html",
      sourceId: source!.id,
    })
    .returning();
  await db.insert(legalProvisions).values([
    {
      versionId: version!.id,
      path: "art_1",
      heading: "Art. 1",
      text: "Every dog is taxed.",
      ord: 0,
    },
  ]);
  return { actId: act!.id, versionId: version!.id };
}

describe.skipIf(!RUN)("the amendment API", () => {
  it("files and supports with signatures, and anyone can read it and check the chain", async () => {
    const { actId, versionId } = await anAct();
    const keys = generateKeyPair();
    const id = randomUUID();
    const changes = [
      {
        op: "replace",
        path: "art_1",
        baseHash: provisionHash({ text: "Every dog is taxed." }),
        text: "No dog is taxed.",
      },
    ];
    const contentHash = revisionHash({
      authority: "ch",
      act: actId,
      baseVersion: versionId,
      lang: "de",
      title: "Untax dogs",
      rationale: "",
      changes: changes as never,
    });
    const sign = (act: "file" | "support") =>
      signMessage(
        amendmentMessage({ act, amendmentId: id, revision: 1, contentHash, address: keys.address }),
        keys.privateKeyHex,
      );

    const filed = await file(
      post({
        id,
        act: actId,
        lang: "de",
        title: "Untax dogs",
        changes,
        address: keys.address,
        signature: sign("file"),
      }),
    );
    expect(filed.status).toBe(201);
    expect((await filed.json()).contentHash).toBe(contentHash);

    const supported = await support(
      new Request(`${ORIGIN}/api/v1/law/amendments/${id}/support`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ revision: 1, address: keys.address, signature: sign("support") }),
      }),
      { params: Promise.resolve({ id }) },
    );
    expect(await supported.json()).toEqual({ support: { total: 1, signed: 1, account: 0 } });

    const read = await (
      await one(new Request(`${ORIGIN}/x`), { params: Promise.resolve({ id }) })
    ).json();
    expect(read.amendment.standing).toEqual({ state: "current" });
    expect(read.amendment.routes.map((r: { key: string }) => r.key)).toEqual(["ch-petition"]);

    const listed = await (
      await list(new Request(`${ORIGIN}/api/v1/law/amendments?act=${actId}`))
    ).json();
    expect(listed.amendments.map((a: { id: string }) => a.id)).toEqual([id]);

    const chain = await (
      await log(new Request(`${ORIGIN}/api/v1/law/amendments/log?after=0&limit=1000`))
    ).json();
    expect(verifyChain(chain.events)).toMatchObject({ ok: true });
  });

  it("answers a bad body 400, a bad signature 401, text that no longer fits 409, an unknown authority 400", async () => {
    const { actId } = await anAct();
    const keys = generateKeyPair();
    expect((await file(post({ id: "not-a-uuid" }))).status).toBe(400);

    const id = randomUUID();
    const badSig = await file(
      post({
        id,
        act: actId,
        lang: "de",
        title: "x",
        changes: [
          { op: "repeal", path: "art_1", baseHash: provisionHash({ text: "Every dog is taxed." }) },
        ],
        address: keys.address,
        signature: signMessage("something else", keys.privateKeyHex),
      }),
    );
    expect(badSig.status).toBe(401);

    const stale = await file(
      post({
        id: randomUUID(),
        act: actId,
        lang: "de",
        title: "x",
        changes: [{ op: "repeal", path: "art_1", baseHash: "c".repeat(64) }],
        address: keys.address,
        signature: "x".repeat(88),
      }),
    );
    expect(stale.status).toBe(409);
    expect((await stale.json()).problems).toEqual([
      { change: 0, kind: "stale_base", path: "art_1" },
    ]);

    expect(
      (await list(new Request(`${ORIGIN}/api/v1/law/amendments?authority=nowhere`))).status,
    ).toBe(400);
  });
});

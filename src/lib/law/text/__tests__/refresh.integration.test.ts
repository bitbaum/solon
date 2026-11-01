/**
 * Reading held documents again, and the change feed that reports it, against
 * a real database. Runs only with INTEGRATION=1.
 */
import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { CANTONAL_DOCUMENTS } from "@/lib/config/law";
import { db } from "@/lib/db/client";
import { legalActs, legalActVersions, legalProvisions } from "@/lib/db/law-schema";
import { sources } from "@/lib/db/places-schema";
import { sha256Hex, type SnapshotStore } from "@/lib/places/importer/snapshots";
import { loadLawChanges } from "../../register/changes";
import { refreshText } from "../refresh";

const RUN = process.env.INTEGRATION === "1";
const snapshots: SnapshotStore = {
  put: async (sha) => `memory/${sha}`,
  get: async () => new Uint8Array(),
};
const html = (body: string) =>
  new TextEncoder().encode(
    `<html><body><p>Art. 1 Zweck</p><p>${body}</p><p>Art. 2 Ende.</p></body></html>`,
  );

describe.skipIf(!RUN)("refreshText", () => {
  it("leaves a document that has not changed, and makes a changed one the version in force", async () => {
    const url = `https://www.lexfind.ch/tol/${Date.now()}/de`;
    const before = html("Dieses Gesetz regelt die Steuern.");
    const [source] = await db
      .insert(sources)
      .values({
        sourceKey: CANTONAL_DOCUMENTS.key,
        retrievedAt: new Date("2020-01-01"),
        url,
        contentSha256: sha256Hex(before),
        snapshotKey: "memory/x",
        importerVersion: "law-text-cantonal-2",
        licenceSpdx: CANTONAL_DOCUMENTS.licenceSpdx,
      })
      .returning({ id: sources.id });
    const actId = randomUUID();
    await db
      .insert(legalActs)
      .values({ id: actId, authority: "zg", kind: "statute", inForce: true, sourceId: source!.id });
    const [old] = await db
      .insert(legalActVersions)
      .values({
        actId,
        lang: "de",
        inForceFrom: "2020-01-01",
        dateBasis: "retrieved",
        status: "consolidated",
        format: "html",
        sourceId: source!.id,
      })
      .returning({ id: legalActVersions.id });
    await db
      .insert(legalProvisions)
      .values({ versionId: old!.id, path: "art_1", heading: "Art. 1", text: "x", ord: 0 });

    let served = before;
    const fetchImpl = (async () =>
      new Response(served, { status: 200 })) as unknown as typeof fetch;
    const options = {
      snapshots,
      today: "2026-11-01",
      limit: 1,
      pauseMs: 0,
      fetchImpl,
      sourceKeys: [CANTONAL_DOCUMENTS.key],
    };

    const same = await refreshText(db, options);
    expect(same).toMatchObject({ checked: 1, unchanged: 1, changed: 0 });

    served = html("Dieses Gesetz regelt die Steuern und die Gebühren.");
    // The just-read source is now the newest; only this act's row is old enough to come first again.
    await db
      .update(sources)
      .set({ retrievedAt: new Date("2019-01-01") })
      .where(eq(sources.id, source!.id));
    const changed = await refreshText(db, options);
    expect(changed).toMatchObject({ checked: 1, changed: 1 });

    const open = await db
      .select({ id: legalActVersions.id, from: legalActVersions.inForceFrom })
      .from(legalActVersions)
      .where(and(eq(legalActVersions.actId, actId), isNull(legalActVersions.inForceTo)));
    expect(open).toHaveLength(1);
    expect(String(open[0]!.from)).toBe("2026-11-01");

    const changes = await loadLawChanges(db, { since: "2000-01-01", authorities: ["zg"] });
    expect(changes.find((c) => c.actId === actId && c.kind === "amended")).toMatchObject({
      inForceFrom: "2026-11-01",
      dateBasis: "retrieved",
    });
  });
});

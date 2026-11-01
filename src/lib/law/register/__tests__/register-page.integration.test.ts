/**
 * An act first listed at the wrong page address (Schellenberg's links were read
 * without the page's <base href>) is corrected the next time the register lists
 * it: the old address is superseded, the new one is the act's page.
 *
 * Runs only with INTEGRATION=1 against a migrated database.
 */
import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { legalActIdentifiers } from "@/lib/db/law-schema";
import type { SnapshotStore } from "@/lib/places/importer/snapshots";
import { importRegister, type ActRow } from "../import";

const RUN = process.env.INTEGRATION === "1";
const snapshots: SnapshotStore = {
  put: async (sha) => `memory/${sha}`,
  get: async () => new Uint8Array(),
};

describe.skipIf(!RUN)("an act's page address", () => {
  it("follows the register when the publisher's address was first read wrong", async () => {
    const ref = `test-page:${randomUUID()}`;
    const row = (page: string): ActRow => ({
      authority: "gl",
      kind: "communal_act",
      inForce: true,
      title: "Reglement Test",
      locale: "de",
      identity: { scheme: "publisher_ref", value: ref },
      systematicNumber: "test.pdf",
      more: [{ scheme: "official_url", value: page }],
    });
    const list = (page: string) =>
      importRegister(db, {
        register: { key: "test-page", licenceSpdx: "CC0-1.0", identityScheme: "publisher_ref" },
        read: () => ({ rows: [row(page)], skipped: [] }),
        bytes: new TextEncoder().encode(page),
        url: "test",
        retrievedAt: new Date(),
        snapshots,
      });
    const pageOf = async () => {
      const [act] = await db
        .select({ actId: legalActIdentifiers.actId })
        .from(legalActIdentifiers)
        .where(
          and(eq(legalActIdentifiers.scheme, "publisher_ref"), eq(legalActIdentifiers.value, ref)),
        );
      const rows = await db
        .select({ value: legalActIdentifiers.value })
        .from(legalActIdentifiers)
        .where(
          and(
            eq(legalActIdentifiers.actId, act!.actId),
            eq(legalActIdentifiers.scheme, "official_url"),
            isNull(legalActIdentifiers.supersededAt),
          ),
        );
      return rows.map((r) => r.value);
    };

    await list("https://commune.example/service/files/a.pdf");
    expect(await pageOf()).toEqual(["https://commune.example/service/files/a.pdf"]);

    await list("https://commune.example/files/a.pdf");
    expect(await pageOf()).toEqual(["https://commune.example/files/a.pdf"]);

    // Listed again unchanged: nothing new.
    await list("https://commune.example/files/a.pdf");
    expect(await pageOf()).toEqual(["https://commune.example/files/a.pdf"]);
  });
});

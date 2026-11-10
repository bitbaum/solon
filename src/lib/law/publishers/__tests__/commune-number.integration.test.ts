/**
 * A commune's act number through the real importer and store: the listing states none (a download id is not
 * a number), the document prints one ("Akte Nr.: 01.01.03"), and the number read from the document survives
 * the next run of the listing, while a number the listing itself stated is still the listing's to change.
 *
 * Runs only with INTEGRATION=1 against a migrated database.
 */
import { randomInt } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { legalActIdentifiers } from "@/lib/db/law-schema";
import type { SnapshotStore } from "@/lib/places/importer/snapshots";
import { importRegister, type ActRow } from "../../register/import";
import { storeVersion } from "../../text/store";

const RUN = process.env.INTEGRATION === "1";
const snapshots: SnapshotStore = {
  put: async (sha) => `memory/${sha}`,
  get: async () => new Uint8Array(),
};

const key = `t${900_000_000 + randomInt(1, 50_000_000)}`;
const register = {
  key: `${key}-register`,
  licenceSpdx: "LicenseRef-li-official-act",
  identityScheme: "publisher_ref" as const,
};

const row = (ref: string, number: string | null): ActRow => ({
  authority: "li7001",
  kind: "communal_act",
  inForce: true,
  title: `Reglement ${key} ${ref}`,
  locale: "de",
  identity: { scheme: "publisher_ref", value: `${key}:${ref}` },
  systematicNumber: number,
  more: [{ scheme: "official_url", value: `https://www.vaduz.li/download_file/${ref}/394?${key}` }],
});

const list = (rows: ActRow[]) =>
  importRegister(db, {
    register,
    read: () => ({ rows, skipped: [] }),
    bytes: new TextEncoder().encode(JSON.stringify(rows)),
    url: "test",
    retrievedAt: new Date(),
    snapshots,
  });

const actOf = async (ref: string) => {
  const [r] = await db
    .select({ actId: legalActIdentifiers.actId })
    .from(legalActIdentifiers)
    .where(
      and(
        eq(legalActIdentifiers.scheme, "publisher_ref"),
        eq(legalActIdentifiers.value, `${key}:${ref}`),
        isNull(legalActIdentifiers.supersededAt),
      ),
    );
  return r!.actId;
};

const numbers = async (actId: string) =>
  (
    await db
      .select({ value: legalActIdentifiers.value })
      .from(legalActIdentifiers)
      .where(
        and(
          eq(legalActIdentifiers.actId, actId),
          eq(legalActIdentifiers.scheme, "systematic_number"),
          isNull(legalActIdentifiers.supersededAt),
        ),
      )
  ).map((n) => n.value);

const read = (actId: string, number: string | null, day: string) =>
  storeVersion(
    db,
    snapshots,
    {
      actId,
      lang: "de",
      inForceFrom: day,
      dateBasis: "retrieved",
      status: "authentic",
      format: "pdf",
      bytes: new TextEncoder().encode(`pdf ${day} ${number}`),
      url: `https://www.vaduz.li/download_file/x/394?${key}`,
      provisions: [{ path: "art_1", heading: "Art. 1", text: "Text." }],
      number,
      source: { key, licenceSpdx: "LicenseRef-li-official-act", importerVersion: "test" },
    },
    false,
  );

describe.skipIf(!RUN)("a commune's act number", () => {
  it("is the number the document prints, not the id the listing was read with", async () => {
    // Before: the listing stated the download id as the number (what production held).
    await list([row("571", "571")]);
    const actId = await actOf("571");
    expect(await numbers(actId)).toEqual(["571"]);
    // Now: the listing states none; the id goes.
    await list([row("571", null)]);
    expect(await numbers(actId)).toEqual([]);
    // The document prints one.
    await read(actId, "01.01.03", "2026-11-10");
    expect(await numbers(actId)).toEqual(["01.01.03"]);
  });

  it("stays when the listing is read again and states none", async () => {
    const actId = await actOf("571");
    await list([row("571", null)]);
    expect(await numbers(actId)).toEqual(["01.01.03"]);
  });

  it("follows the document when a later reading prints a different number", async () => {
    const actId = await actOf("571");
    await read(actId, "01.01.04", "2026-11-11");
    expect(await numbers(actId)).toEqual(["01.01.04"]);
    await read(actId, null, "2026-11-12");
    expect(await numbers(actId)).toEqual(["01.01.04"]);
  });

  it("leaves a number the listing stated, and still lets the listing change it", async () => {
    await list([row("600", "ABC-1")]);
    const actId = await actOf("600");
    await read(actId, "99.99.99", "2026-11-10");
    expect(await numbers(actId)).toEqual(["ABC-1"]);
    await list([row("600", "ABC-2")]);
    expect(await numbers(actId)).toEqual(["ABC-2"]);
  });
});

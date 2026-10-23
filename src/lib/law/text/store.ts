/**
 * Stores one consolidated text of an act (design §3, L1): the bytes under
 * their sha256, a `sources` row citing them, the version, its provisions and,
 * when the publisher gives one, an identifier for the act. Shared by every
 * reader of law text, so they all close the previous version the same way.
 */
import { and, eq, isNull, sql } from "drizzle-orm";
import type { ActTextFormat, ActTextStatus, ActVersionDateBasis } from "@/lib/config/law";
import type { Database } from "@/lib/db/client";
import { legalActIdentifiers, legalActVersions, legalProvisions } from "@/lib/db/law-schema";
import { sources } from "@/lib/db/places-schema";
import { sha256Hex, type SnapshotStore } from "@/lib/places/importer/snapshots";
import type { Provision } from "./fedlex";

const CHUNK = 500;

export interface VersionToStore {
  actId: string;
  lang: string;
  /** First day the text applies; see `dateBasis` for how that is known. */
  inForceFrom: string;
  dateBasis: ActVersionDateBasis;
  status: ActTextStatus;
  format: ActTextFormat;
  /** The publisher's page, as fetched. */
  bytes: Uint8Array;
  url: string;
  provisions: readonly Provision[];
  /** Which publisher, under which licence, by which version of the reader. */
  source: { key: string; licenceSpdx: string; importerVersion: string };
  /** An identifier the publisher gives the act, added when the act has none of that scheme. */
  identifier?: { scheme: string; value: string };
}

export const dayBefore = (iso: string): string => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

/** Keeps the bytes and writes the rows, closing the version this one replaces. A dry run writes nothing. */
export async function storeVersion(
  db: Database,
  snapshots: SnapshotStore,
  version: VersionToStore,
  dryRun: boolean,
): Promise<void> {
  if (dryRun) return;
  const sha = sha256Hex(version.bytes);
  const snapshotKey = await snapshots.put(sha, version.bytes);
  await db.transaction(async (tx) => {
    const [source] = await tx
      .insert(sources)
      .values({
        sourceKey: version.source.key,
        retrievedAt: new Date(),
        url: version.url,
        contentSha256: sha,
        snapshotKey,
        importerVersion: version.source.importerVersion,
        licenceSpdx: version.source.licenceSpdx,
      })
      .returning({ id: sources.id });
    // The version this one replaces ends the day before it begins. A reading dated only by the
    // day it was read, replaced by one with the publisher's own date, would end before it began:
    // its range is empty, it is never served, and the row stays as the record of what was read.
    await tx
      .update(legalActVersions)
      .set({
        inForceTo: sql`GREATEST(${dayBefore(version.inForceFrom)}::date, ${legalActVersions.inForceFrom} - 1)`,
      })
      .where(
        and(
          eq(legalActVersions.actId, version.actId),
          eq(legalActVersions.lang, version.lang),
          isNull(legalActVersions.inForceTo),
        ),
      );
    const [row] = await tx
      .insert(legalActVersions)
      .values({
        actId: version.actId,
        lang: version.lang,
        inForceFrom: version.inForceFrom,
        dateBasis: version.dateBasis,
        status: version.status,
        format: version.format,
        sourceId: source!.id,
      })
      .returning({ id: legalActVersions.id });
    for (let i = 0; i < version.provisions.length; i += CHUNK) {
      await tx.insert(legalProvisions).values(
        version.provisions.slice(i, i + CHUNK).map((p, j) => ({
          versionId: row!.id,
          path: p.path,
          heading: p.heading,
          text: p.text,
          ord: i + j,
        })),
      );
    }
    if (version.identifier) {
      const known = await tx
        .select({ id: legalActIdentifiers.id })
        .from(legalActIdentifiers)
        .where(
          and(
            eq(legalActIdentifiers.actId, version.actId),
            eq(legalActIdentifiers.scheme, version.identifier.scheme),
            isNull(legalActIdentifiers.supersededAt),
          ),
        );
      if (known.length === 0) {
        await tx.insert(legalActIdentifiers).values({
          actId: version.actId,
          scheme: version.identifier.scheme,
          value: version.identifier.value,
          sourceId: source!.id,
        });
      }
    }
  });
}

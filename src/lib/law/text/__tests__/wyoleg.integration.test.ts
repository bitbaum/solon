/**
 * Wyoming's statutes through the real importer into a real database, against
 * a stand-in for wyoleg.gov: the title registered and its sections stored, a
 * re-read of the same file storing nothing, a changed file becoming a new
 * version that closes the old one, and a file that is not a PDF reported.
 *
 * Runs only with INTEGRATION=1 against a migrated database.
 */
import { randomInt } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { legalActIdentifiers, legalActVersions, legalProvisions } from "@/lib/db/law-schema";
import type { SnapshotStore } from "@/lib/places/importer/snapshots";
import { importWyoleg } from "../import-wyoleg";
import { tinyPdf } from "./tiny-pdf";

const RUN = process.env.INTEGRATION === "1";

/** A title number no real title has, new on every run, so a rerun never meets what an earlier one stored. */
const T = String(randomInt(1000, 9_000_000));
const TITLES = [[T, `Title ${T} Sureties`]] as const;

const snapshots: SnapshotStore = {
  async put(sha) {
    return `memory/${sha}`;
  },
  async get() {
    throw new Error("not needed here");
  },
};

/** A stand-in for wyoleg.gov that serves the test title as these lines. */
const serving =
  (lines: string[] | "not a pdf"): typeof fetch =>
  async (input) => {
    const url = String(input);
    if (!url.endsWith(`/Title${T}.pdf`)) return new Response("", { status: 404 });
    const body =
      lines === "not a pdf"
        ? new TextEncoder().encode("<html>maintenance</html>".repeat(80))
        : tinyPdf(lines);
    return new Response(new Blob([body as BlobPart]), { status: 200 });
  };

const TITLE_38 = [
  `TITLE ${T} - SURETIES`,
  "CHAPTER 1 - GENERAL PROVISIONS",
  `${T}-1-101. Bonds to state.`,
  "All bonds shall run to the state.",
  `${T}-1-102. Release of surety.`,
  "A surety may be released.",
];

async function sectionsHeld() {
  const [act] = await db
    .select({ actId: legalActIdentifiers.actId })
    .from(legalActIdentifiers)
    .where(
      and(
        eq(legalActIdentifiers.scheme, "publisher_ref"),
        eq(legalActIdentifiers.value, `wyoleg:${T}`),
      ),
    );
  const versions = await db
    .select()
    .from(legalActVersions)
    .where(eq(legalActVersions.actId, act!.actId))
    .orderBy(asc(legalActVersions.inForceFrom));
  const current = versions.find((v) => v.inForceTo === null)!;
  const provisions = await db
    .select({ path: legalProvisions.path, text: legalProvisions.text })
    .from(legalProvisions)
    .where(eq(legalProvisions.versionId, current.id))
    .orderBy(asc(legalProvisions.ord));
  return { versions, provisions };
}

describe.skipIf(!RUN)("Wyoming statutes import", () => {
  it("registers a title, stores its sections, and reads it again only when the file changed", async () => {
    const first = await importWyoleg(db, {
      snapshots,
      titles: TITLES,
      today: "2031-01-10",
      fetchImpl: serving(TITLE_38),
      pauseMs: 0,
    });
    expect(first).toMatchObject({ stored: 1, provisions: 2, failures: [] });
    const held = await sectionsHeld();
    expect(held.provisions).toEqual([
      { path: `sec_${T}-1-101`, text: "All bonds shall run to the state." },
      { path: `sec_${T}-1-102`, text: "A surety may be released." },
    ]);
    expect(held.versions.at(-1)).toMatchObject({
      dateBasis: "retrieved",
      format: "pdf",
      lang: "en",
    });

    // Held, and not asked to read again: nothing is fetched.
    const rerun = await importWyoleg(db, {
      snapshots,
      titles: TITLES,
      fetchImpl: () => Promise.reject(new Error("must not fetch")),
      pauseMs: 0,
    });
    expect(rerun).toMatchObject({ alreadyHeld: 1, stored: 0, failures: [] });

    // Read again, the same file: nothing new.
    const same = await importWyoleg(db, {
      snapshots,
      titles: TITLES,
      again: true,
      today: "2031-02-10",
      fetchImpl: serving(TITLE_38),
      pauseMs: 0,
    });
    expect(same).toMatchObject({ unchanged: 1, stored: 0 });

    // Read again, a changed file: a new version, and the old one ends the day before.
    const changed = await importWyoleg(db, {
      snapshots,
      titles: TITLES,
      again: true,
      today: "2031-03-10",
      fetchImpl: serving([...TITLE_38.slice(0, 5), "A surety may be released on notice."]),
      pauseMs: 0,
    });
    expect(changed).toMatchObject({ stored: 1, failures: [] });
    const after = await sectionsHeld();
    expect(after.provisions.at(-1)!.text).toBe("A surety may be released on notice.");
    expect(after.versions.map((v) => [v.inForceFrom, v.inForceTo])).toEqual([
      ["2031-01-10", "2031-03-09"],
      ["2031-03-10", null],
    ]);
  });

  it("reports a file that is not a PDF, and stores nothing for it", async () => {
    const report = await importWyoleg(db, {
      snapshots,
      titles: TITLES,
      again: true,
      today: "2031-04-10",
      fetchImpl: serving("not a pdf"),
      pauseMs: 0,
    });
    expect(report.stored).toBe(0);
    expect(report.failures).toEqual([{ title: T, reason: expect.stringMatching(/not a PDF/) }]);
  });
});

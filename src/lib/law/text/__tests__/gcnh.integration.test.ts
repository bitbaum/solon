/**
 * New Hampshire's statutes through the real importer into a real database,
 * against a stand-in for gc.nh.gov: the chapter registered and its sections
 * stored, a rerun fetching nothing, a re-read of the same page storing
 * nothing, a changed page becoming a new version that closes the old one, a
 * chapter repealed whole marked out of force, and a firewall's refusal read
 * around through the Internet Archive's copy under the former address.
 *
 * Runs only with INTEGRATION=1 against a migrated database.
 */
import { randomInt } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { and, asc, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import {
  legalActIdentifiers,
  legalActVersions,
  legalActs,
  legalProvisions,
} from "@/lib/db/law-schema";
import { sources } from "@/lib/db/places-schema";
import type { SnapshotStore } from "@/lib/places/importer/snapshots";
import { importGcnh } from "../import-gcnh";

const RUN = process.env.INTEGRATION === "1";

/** A chapter number no real chapter has, new on every run, so a rerun never meets what an earlier one stored. */
const C = String(randomInt(1000, 9_000_000));
const R = String(randomInt(9_000_001, 9_999_999));

const snapshots: SnapshotStore = {
  async put(sha) {
    return `memory/${sha}`;
  },
  async get() {
    throw new Error("not needed here");
  },
};

const NHTOC = `<html><body><ul><li><a href="NHTOC/NHTOC-III.htm">TITLE III: TOWNS, CITIES, VILLAGE DISTRICTS, AND UNINCORPORATED PLACES</a></li></ul></body></html>`;
const NHTOC_III = `<html><body><ul><li><a href="NHTOC-III-${C}.htm">CHAPTER ${C}: TIME FOR HOLDING TOWN MEETINGS AND WARNING THEREOF</a></li><li><a href="NHTOC-III-${R}.htm">CHAPTER ${R}: MOTOR VEHICLE EMISSIONS INSPECTION</a></li></ul></body></html>`;

/** The General Court's chapter 39, renumbered as the test chapter. */
const chapter39 = (lastWords = "occasion therefor.") =>
  readFileSync(join(__dirname, "fixtures", "gcnh-39-mrg.fixture.html"), "utf8")
    .replaceAll("39:", `${C}:`)
    .replaceAll("CHAPTER 39", `CHAPTER ${C}`)
    .replace("occasion therefor.  In no event", `${lastWords}  In no event`);
const repealed = readFileSync(
  join(__dirname, "fixtures", "gcnh-268-mrg.fixture.html"),
  "utf8",
).replaceAll("268", R);

const BLOCKED = `<html><head><title>Web Page Blocked</title></head><body><h1>Web Page Blocked!</h1></body></html>`;
const STAMP = "20250601120000";

/** A stand-in for the site: the tables, the test chapters, and anything else not found. */
const serving =
  (page39: string, options: { blocked?: boolean } = {}): typeof fetch =>
  async (input) => {
    const url = String(input);
    const html = (body: string) =>
      new Response(body, { status: 200, headers: { "content-type": "text/html" } });
    if (url.startsWith("https://web.archive.org/cdx/")) {
      // The archive holds the chapter under the former address only.
      const holds = url.includes(encodeURIComponent("www.gencourt.state.nh.us"));
      return Response.json(holds ? [["timestamp"], [STAMP]] : [["timestamp"]]);
    }
    if (url.startsWith("https://archive.org/wayback/available")) {
      return Response.json({ archived_snapshots: {} });
    }
    if (
      url ===
      `https://web.archive.org/web/${STAMP}id_/https://www.gencourt.state.nh.us/rsa/html/III/${C}/${C}-mrg.htm`
    ) {
      return html(page39);
    }
    const path = url.replace(
      /^https:\/\/(?:gc\.nh\.gov|www\.gencourt\.state\.nh\.us)\/rsa\/html\//,
      "",
    );
    if (path === "nhtoc.htm") return html(NHTOC);
    if (path === "NHTOC/NHTOC-III.htm") return html(NHTOC_III);
    if (path === `III/${C}/${C}-mrg.htm`) return html(options.blocked ? BLOCKED : page39);
    if (path === `III/${R}/${R}-mrg.htm`) return html(repealed);
    return new Response("", { status: 404 });
  };

const run = (fetchImpl: typeof fetch, more: Partial<Parameters<typeof importGcnh>[1]> = {}) =>
  importGcnh(db, { snapshots, fetchImpl, pauseMs: 0, retryWaits: [], ...more });

async function held(chapter: string) {
  const [act] = await db
    .select({ actId: legalActIdentifiers.actId, inForce: legalActs.inForce })
    .from(legalActIdentifiers)
    .innerJoin(legalActs, eq(legalActs.id, legalActIdentifiers.actId))
    .where(
      and(
        eq(legalActIdentifiers.scheme, "publisher_ref"),
        eq(legalActIdentifiers.value, `gcnh:${chapter}`),
      ),
    );
  const versions = await db
    .select({
      id: legalActVersions.id,
      inForceFrom: legalActVersions.inForceFrom,
      inForceTo: legalActVersions.inForceTo,
      format: legalActVersions.format,
      dateBasis: legalActVersions.dateBasis,
      url: sources.url,
      importerVersion: sources.importerVersion,
    })
    .from(legalActVersions)
    .innerJoin(sources, eq(sources.id, legalActVersions.sourceId))
    .where(eq(legalActVersions.actId, act!.actId))
    .orderBy(asc(legalActVersions.inForceFrom));
  const current = versions.find((v) => v.inForceTo === null)!;
  const provisions = await db
    .select({ path: legalProvisions.path, text: legalProvisions.text })
    .from(legalProvisions)
    .where(eq(legalProvisions.versionId, current.id))
    .orderBy(asc(legalProvisions.ord));
  return { inForce: act!.inForce, versions, current, provisions };
}

describe.skipIf(!RUN)("New Hampshire statutes import", () => {
  it("registers chapters, stores their sections, and reads one again only when its page changed", async () => {
    const first = await run(serving(chapter39()), { today: "2031-01-10" });
    expect(first).toMatchObject({
      titles: 1,
      chapters: 2,
      stored: 2,
      repealedChapters: 1,
      fromArchive: 0,
      failures: [],
    });
    const chapter = await held(C);
    expect(chapter.inForce).toBe(true);
    expect(chapter.provisions.map((p) => p.path)).toEqual([
      `sec_${C}-1`,
      `sec_${C}-1-a`,
      `sec_${C}-1-b`,
      `sec_${C}-3`,
    ]);
    expect(chapter.current).toMatchObject({
      format: "html",
      dateBasis: "retrieved",
      inForceFrom: "2031-01-10",
      url: `https://gc.nh.gov/rsa/html/III/${C}/${C}-mrg.htm`,
      importerVersion: "law-text-gcnh-1",
    });
    // The chapter repealed whole is out of force, its one provision saying so.
    const gone = await held(R);
    expect(gone.inForce).toBe(false);
    expect(gone.provisions).toEqual([
      { path: `ch_${R}`, text: expect.stringMatching(/^Entire Chapter was repealed/) },
    ]);

    // Held, and not asked to read again: only the tables are fetched, and the repeal stands.
    const asked: string[] = [];
    const rerun = await run(async (input, init) => {
      asked.push(String(input));
      return serving(chapter39())(input, init);
    });
    expect(rerun).toMatchObject({ alreadyHeld: 2, stored: 0, failures: [] });
    expect(asked.filter((u) => u.endsWith("-mrg.htm"))).toEqual([]);
    expect((await held(R)).inForce).toBe(false);

    // Read again, the same page: nothing new.
    const same = await run(serving(chapter39()), {
      again: true,
      chapters: [C],
      today: "2031-02-10",
    });
    expect(same).toMatchObject({ unchanged: 1, stored: 0 });

    // Read again, a changed page: a new version, and the old one ends the day before.
    const changed = await run(serving(chapter39("occasion for it.")), {
      again: true,
      chapters: [C],
      today: "2031-03-10",
    });
    expect(changed).toMatchObject({ stored: 1, failures: [] });
    const after = await held(C);
    expect(after.provisions[0]!.text).toMatch(/occasion for it\./);
    expect(after.versions.map((v) => [v.inForceFrom, v.inForceTo])).toEqual([
      ["2031-01-10", "2031-03-09"],
      ["2031-03-10", null],
    ]);
  });

  it("reads a chapter the site's firewall refuses from the archive's copy under the former address", async () => {
    const report = await run(serving(chapter39("occasion, archived."), { blocked: true }), {
      again: true,
      chapters: [C],
      today: "2031-04-10",
    });
    expect(report).toMatchObject({ stored: 1, fromArchive: 1, failures: [] });
    const chapter = await held(C);
    expect(chapter.provisions[0]!.text).toMatch(/occasion, archived\./);
    expect(chapter.current).toMatchObject({
      // Dated by the capture, and the copy's address is the source.
      inForceFrom: "2025-06-01",
      url: `https://web.archive.org/web/${STAMP}id_/https://www.gencourt.state.nh.us/rsa/html/III/${C}/${C}-mrg.htm`,
      importerVersion: "law-text-gcnh-1+archive",
    });
    // The act keeps the official address.
    const [act] = await db
      .select({ actId: legalActIdentifiers.actId })
      .from(legalActIdentifiers)
      .where(eq(legalActIdentifiers.value, `gcnh:${C}`));
    const official = await db
      .select({ value: legalActIdentifiers.value })
      .from(legalActIdentifiers)
      .where(
        and(
          eq(legalActIdentifiers.actId, act!.actId),
          eq(legalActIdentifiers.scheme, "official_url"),
        ),
      );
    expect(official.map((o) => o.value)).toEqual([
      `https://gc.nh.gov/rsa/html/III/${C}/${C}-mrg.htm`,
    ]);
  });
});

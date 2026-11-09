/**
 * The United Kingdom's law through the real importer into a real database,
 * against a stand-in for legislation.gov.uk: a type's year listed from its feed
 * over two pages, an act and an instrument read in their current versions and
 * dated by the publisher; a rerun that reads nothing; a feed that says an act
 * changed, with a newer version that closes the one before it and an older or
 * equal one that changes nothing; an act whose every provision is repealed,
 * marked out of force and kept so by the next register run; a page that is not
 * CLML reported; a refusal answered from the Internet Archive's copy, which the
 * version names.
 *
 * Runs only with INTEGRATION=1 against a migrated database.
 */
import { randomInt } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import {
  legalActIdentifiers,
  legalActNames,
  legalActVersions,
  legalActs,
  legalProvisions,
} from "@/lib/db/law-schema";
import { sources } from "@/lib/db/places-schema";
import type { SnapshotStore } from "@/lib/places/importer/snapshots";
import { importUkLeg } from "../import-ukleg";

const RUN = process.env.INTEGRATION === "1";

const snapshots: SnapshotStore = {
  async put(sha) {
    return `memory/${sha}`;
  },
  async get() {
    throw new Error("not needed here");
  },
};

/** A year no real item has, and numbers new on every run. */
const YEAR = 2099;
const N = randomInt(1000, 9000);
const ACT = `ukpga/${YEAR}/${N}`;
const SI = `uksi/${YEAR}/${N + 1}`;
const GONE = `ukpga/${YEAR}/${N + 2}`;
const BAD = `ukpga/${YEAR}/${N + 3}`;
const REFUSED = `ukpga/${YEAR}/${N + 4}`;

interface Listed {
  path: string;
  title: string;
  updated: string;
}

const entry = (a: Listed) =>
  `<entry><id>http://www.legislation.gov.uk/id/${a.path}</id><title>${a.title}</title><updated>${a.updated}T10:00:00Z</updated></entry>`;

/** A feed page; `next` makes it a page with another to follow. */
const feedPage = (items: Listed[], next: boolean) =>
  `<feed xmlns="http://www.w3.org/2005/Atom" xmlns:leg="http://www.legislation.gov.uk/namespaces/legislation"><title>x</title>${
    next ? `<link rel="next" href="x"/>` : ""
  }<leg:morePages>${next ? 1 : 0}</leg:morePages>${items.map(entry).join("")}</feed>`;

const clml = (
  start: string,
  sections: { id: string; text: string; status?: string }[],
  extra = "",
) =>
  `<?xml version="1.0"?><Legislation xmlns="http://www.legislation.gov.uk/namespaces/legislation" RestrictStartDate="${start}"><Primary>${extra}<Body>${sections
    .map(
      (s, i) =>
        `<P1group><Title>Heading ${i + 1}</Title><P1 id="${s.id}"${
          s.status ? ` Status="${s.status}"` : ""
        }><Pnumber>${i + 1}</Pnumber><P1para><Text>${s.text}</Text></P1para></P1></P1group>`,
    )
    .join("")}</Body></Primary></Legislation>`;

/** legislation.gov.uk: each type and year's feed by page, each item's XML by address, and the archive. */
function publisher(
  feeds: Record<string, string[]>,
  xml: Record<string, string | number>,
  archive: Record<string, string> = {},
): { fetch: typeof fetch; asked: string[] } {
  const asked: string[] = [];
  return {
    asked,
    fetch: async (input) => {
      const url = String(input);
      if (url.startsWith("https://web.archive.org/cdx/")) {
        const original = new URL(url).searchParams.get("url")!;
        const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
        return Response.json(archive[original] ? [["timestamp"], [stamp]] : [["timestamp"]]);
      }
      const copy = /^https:\/\/web\.archive\.org\/web\/\d{14}id_\/(.+)$/.exec(url);
      if (copy)
        return new Response(archive[copy[1]!] ?? "", { status: archive[copy[1]!] ? 200 : 404 });
      if (url.startsWith("https://archive.org/wayback/") || url.includes("/save/")) {
        return Response.json({}, { status: 404 });
      }
      asked.push(url);
      const list =
        /^https:\/\/www\.legislation\.gov\.uk\/([a-z]+)\/(\d+)\/data\.feed\?page=(\d+)$/.exec(url);
      if (list) {
        const page = feeds[`${list[1]}/${list[2]}`]?.[Number(list[3]) - 1];
        return page
          ? new Response(page, { headers: { "content-type": "application/atom+xml" } })
          : new Response("", { status: 404 });
      }
      const item = /^https:\/\/www\.legislation\.gov\.uk\/(.+)\/data\.xml$/.exec(url);
      const answer = item ? xml[item[1]!] : undefined;
      if (typeof answer === "number") return new Response("", { status: answer });
      if (!answer) return new Response("", { status: 404 });
      return new Response(answer, { headers: { "content-type": "application/xml" } });
    },
  };
}

async function held(path: string) {
  const [act] = await db
    .select({ actId: legalActIdentifiers.actId, kind: legalActs.kind, inForce: legalActs.inForce })
    .from(legalActIdentifiers)
    .innerJoin(legalActs, eq(legalActs.id, legalActIdentifiers.actId))
    .where(and(eq(legalActIdentifiers.scheme, "uk_leg_id"), eq(legalActIdentifiers.value, path)));
  if (!act) return null;
  const [name] = await db
    .select({ text: legalActNames.text, locale: legalActNames.locale })
    .from(legalActNames)
    .where(eq(legalActNames.actId, act.actId));
  const versions = await db
    .select({
      id: legalActVersions.id,
      inForceFrom: legalActVersions.inForceFrom,
      inForceTo: legalActVersions.inForceTo,
      dateBasis: legalActVersions.dateBasis,
      format: legalActVersions.format,
      lang: legalActVersions.lang,
      url: sources.url,
      licence: sources.licenceSpdx,
    })
    .from(legalActVersions)
    .innerJoin(sources, eq(sources.id, legalActVersions.sourceId))
    .where(eq(legalActVersions.actId, act.actId))
    .orderBy(asc(legalActVersions.inForceFrom));
  const current = versions.find((v) => v.inForceTo === null);
  const provisions = current
    ? await db
        .select({
          path: legalProvisions.path,
          heading: legalProvisions.heading,
          text: legalProvisions.text,
        })
        .from(legalProvisions)
        .where(eq(legalProvisions.versionId, current.id))
        .orderBy(asc(legalProvisions.ord))
    : [];
  return { ...act, name, versions, provisions };
}

const base = { snapshots, today: "2099-12-31", years: [YEAR], pauseMs: 0, archiveRetryMs: [] };

describe.skipIf(!RUN)("UK law import", () => {
  const act: Listed = { path: ACT, title: `Testing Act ${YEAR}`, updated: `2020-03-01` };
  const si: Listed = {
    path: SI,
    title: `The Testing Regulations ${YEAR}`,
    updated: `2020-03-02`,
  };
  const gone: Listed = { path: GONE, title: `Repealed Act ${YEAR}`, updated: `2020-03-03` };
  const bad: Listed = { path: BAD, title: `Missing Act ${YEAR}`, updated: `2020-03-04` };
  const feeds = {
    // The acts over two pages, the instrument in its own type's feed.
    [`ukpga/${YEAR}`]: [feedPage([act, gone], true), feedPage([bad], false)],
    [`uksi/${YEAR}`]: [feedPage([si], false)],
  };

  it("lists a year over its pages, reads each act's current text dated by the publisher, and reruns for free", async () => {
    const stand = publisher(feeds, {
      [ACT]: clml(`${YEAR}-06-01`, [
        { id: "section-1", text: "This Act applies." },
        { id: "section-2", text: "Gone words.", status: "Repealed" },
      ]),
      [SI]: clml(`${YEAR}-02-12`, [{ id: "regulation-1", text: "These Regulations apply." }]),
      [GONE]: clml(`${YEAR}-01-01`, [{ id: "section-1", text: "…", status: "Repealed" }]),
      [BAD]: "<html><body>The page you requested could not be found.</body></html>",
    });
    const first = await importUkLeg(db, { ...base, fetchImpl: stand.fetch });
    expect(first).toMatchObject({
      acts: 4,
      stored: 2,
      outOfForce: 1,
      omittedProvisions: 1,
      provisions: 2,
      dateBasis: { "restrict-start": 2 },
    });
    expect(first.failures).toEqual([
      expect.objectContaining({ act: BAD, reason: expect.stringMatching(/^not CLML: /) }),
    ]);

    const a = await held(ACT);
    expect(a!.kind).toBe("statute");
    expect(a!.inForce).toBe(true);
    expect(a!.name).toEqual({ text: `Testing Act ${YEAR}`, locale: "en" });
    expect(a!.provisions).toEqual([
      { path: "section-1", heading: "1 Heading 1", text: "This Act applies." },
    ]);
    expect(a!.versions).toMatchObject([
      {
        inForceFrom: `${YEAR}-06-01`,
        inForceTo: null,
        dateBasis: "publisher",
        format: "xml",
        lang: "en",
        url: `https://www.legislation.gov.uk/${ACT}/data.xml`,
        licence: "OGL-UK-3.0",
      },
    ]);
    expect((await held(SI))!.kind).toBe("regulation");
    // An act whose every provision is repealed is out of force and holds no text.
    const g = await held(GONE);
    expect(g!.inForce).toBe(false);
    expect(g!.versions).toEqual([]);

    const again = publisher(feeds, {});
    const rerun = await importUkLeg(db, { ...base, fetchImpl: again.fetch });
    // Held ones are not read again; the one that is out of force stays so; the failed one is tried again.
    expect(rerun).toMatchObject({ alreadyHeld: 2, stored: 0, outOfForce: 0 });
    expect(again.asked.filter((u) => u.endsWith("/data.xml"))).toEqual([
      `https://www.legislation.gov.uk/${BAD}/data.xml`,
    ]);
    expect((await held(GONE))!.inForce).toBe(false);
  });

  it("reads again an act the feed says changed: a newer version closes the one before it, the same day changes nothing", async () => {
    const changed = { ...act, updated: `${YEAR}-09-01` };
    const newer = publisher(
      { [`ukpga/${YEAR}`]: [feedPage([changed], false)] },
      {
        [ACT]: clml(`${YEAR}-08-15`, [{ id: "section-1", text: "This Act applies, as amended." }]),
      },
    );
    const report = await importUkLeg(db, { ...base, types: ["ukpga"], fetchImpl: newer.fetch });
    expect(report).toMatchObject({ stored: 1, failures: [] });
    const a = await held(ACT);
    expect(a!.provisions[0]!.text).toBe("This Act applies, as amended.");
    expect(a!.versions.map((v) => [v.inForceFrom, v.inForceTo])).toEqual([
      [`${YEAR}-06-01`, `${YEAR}-08-14`],
      [`${YEAR}-08-15`, null],
    ]);

    // The feed says it changed again, but the version it serves is the one held.
    const same = publisher(
      { [`ukpga/${YEAR}`]: [feedPage([{ ...act, updated: `${YEAR}-12-01` }], false)] },
      { [ACT]: clml(`${YEAR}-08-15`, [{ id: "section-1", text: "Same day." }]) },
    );
    const quiet = await importUkLeg(db, { ...base, types: ["ukpga"], fetchImpl: same.fetch });
    expect(quiet).toMatchObject({ stored: 0, alreadyHeld: 1, failures: [] });
    expect((await held(ACT))!.versions).toHaveLength(2);
  });

  it("reads a text legislation.gov.uk refuses from the Internet Archive's copy, and the version names the copy", async () => {
    const refused: Listed = {
      path: REFUSED,
      title: `Refused Act ${YEAR}`,
      updated: `${YEAR}-04-01`,
    };
    const at = `https://www.legislation.gov.uk/${REFUSED}/data.xml`;
    const stand = publisher(
      { [`ukpga/${YEAR}`]: [feedPage([refused], false)] },
      { [REFUSED]: 403 },
      { [at]: clml(`${YEAR}-05-01`, [{ id: "section-1", text: "Read from the copy." }]) },
    );
    const report = await importUkLeg(db, { ...base, types: ["ukpga"], fetchImpl: stand.fetch });
    expect(report).toMatchObject({ stored: 1, fromArchive: 1, failures: [] });
    const r = await held(REFUSED);
    expect(r!.provisions[0]!.text).toBe("Read from the copy.");
    expect(r!.versions[0]!.url).toMatch(
      /^https:\/\/web\.archive\.org\/web\/\d{14}id_\/https:\/\/www\.legislation\.gov\.uk/,
    );
  });

  it("stops after 20 refusals in a row instead of asking on", async () => {
    const many: Listed[] = Array.from({ length: 25 }, (_, i) => ({
      path: `ukpga/${YEAR - 1}/${N + i}`,
      title: `Refused ${i}`,
      updated: `${YEAR - 1}-01-01`,
    }));
    const stand = publisher(
      { [`ukpga/${YEAR - 1}`]: [feedPage(many, false)] },
      Object.fromEntries(many.map((m) => [m.path, 429])),
    );
    const report = await importUkLeg(db, {
      ...base,
      years: [YEAR - 1],
      types: ["ukpga"],
      dryRun: true,
      fetchImpl: stand.fetch,
    });
    expect(report.failures).toHaveLength(20);
    expect(report.stoppedBecause).toMatch(/Internet Archive|429/);
    expect(report.remaining).toBe(5);
  });
});

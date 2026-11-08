/**
 * Germany's federal law through the real importer into a real database,
 * against a stand-in for Gesetze im Internet: the table of contents and each
 * act's zip. A first read dated by the day it was read; a rerun that fetches
 * nothing; a re-read whose text is unchanged (the XML's build date moved) that
 * stores nothing; a changed text that becomes a new version and closes the one
 * before it; a page that is not a zip reported; a refusal answered from the
 * Internet Archive's copy, which the version names.
 *
 * The stand-in's XML is a hand-written approximation of the portal's (see
 * gii.test.ts); only the live dry run checks the real files.
 *
 * Runs only with INTEGRATION=1 against a migrated database.
 */
import { randomInt } from "node:crypto";
import { zipSync } from "fflate";
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
import { importGii } from "../import-gii";
import { recutGiiText } from "../recut";

const RUN = process.env.INTEGRATION === "1";

const snapshots: SnapshotStore = {
  async put(sha) {
    return `memory/${sha}`;
  },
  async get() {
    return new TextEncoder().encode(xml("Recut", "Die Wörter bleiben."));
  },
};

/** Abbreviations no real act has, new on every run. */
const N = randomInt(1000, 9000);
const STATUTE = `testgesetz${N}`;
const ORDINANCE = `testverordnung${N}`;
const REFUSED = `testverweigert${N}`;
const BROKEN = `testkaputt${N}`;

const toc = (items: { abbr: string; title: string }[]) =>
  `<?xml version="1.0" encoding="UTF-8"?><items>${items
    .map(
      (i) =>
        `<item><title>${i.title}</title><link>http://www.gesetze-im-internet.de/${i.abbr}/xml.zip</link></item>`,
    )
    .join("")}</items>`;

const xml = (title: string, text: string, build = "20261101120000") =>
  `<?xml version="1.0" encoding="UTF-8"?><dokumente builddate="${build}"><norm builddate="${build}"><metadaten><jurabk>T</jurabk><langue>${title}</langue></metadaten><textdaten><text format="XML"/></textdaten></norm><norm builddate="${build}"><metadaten><jurabk>T</jurabk><enbez>§ 1</enbez><titel format="parat">Zweck</titel></metadaten><textdaten><text format="XML"><Content><P>${text}</P></Content></text></textdaten></norm><norm builddate="${build}"><metadaten><jurabk>T</jurabk><enbez>Anlage 1</enbez></metadaten><textdaten><text format="XML"><Content><P>Anlagentext</P></Content></text></textdaten></norm></dokumente>`;

const zipOf = (content: string) => zipSync({ "BJNR0000.xml": new TextEncoder().encode(content) });

type Answer = Uint8Array | string | number;

/** The portal: its table of contents and each act's zip, by abbreviation; the archive's copies. */
function portal(
  items: { abbr: string; title: string }[],
  zips: Record<string, Answer>,
  archive: Record<string, Uint8Array> = {},
  asked: string[] = [],
): typeof fetch {
  return async (input) => {
    const url = String(input);
    asked.push(url);
    if (url === "https://www.gesetze-im-internet.de/gii-toc.xml") {
      return new Response(toc(items), { headers: { "content-type": "application/xml" } });
    }
    if (url.startsWith("https://web.archive.org/cdx/")) {
      const original = new URL(url).searchParams.get("url")!;
      const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
      return Response.json(archive[original] ? [["timestamp"], [stamp]] : [["timestamp"]]);
    }
    const copy = /^https:\/\/web\.archive\.org\/web\/\d{14}id_\/(.+)$/.exec(url);
    if (copy) {
      const bytes = archive[copy[1]!];
      return new Response(bytes ? Buffer.from(bytes) : "", { status: bytes ? 200 : 404 });
    }
    if (url.startsWith("https://archive.org/wayback/") || url.includes("/save/")) {
      return Response.json({}, { status: 404 });
    }
    const m = /gesetze-im-internet\.de\/([^/]+)\/xml\.zip$/.exec(url);
    const answer = m ? zips[m[1]!] : undefined;
    if (typeof answer === "number") return new Response("", { status: answer });
    if (answer === undefined) return new Response("", { status: 404 });
    return new Response(Buffer.from(answer), { headers: { "content-type": "application/zip" } });
  };
}

async function held(abbr: string) {
  const [act] = await db
    .select({ actId: legalActIdentifiers.actId, kind: legalActs.kind, inForce: legalActs.inForce })
    .from(legalActIdentifiers)
    .innerJoin(legalActs, eq(legalActs.id, legalActIdentifiers.actId))
    .where(and(eq(legalActIdentifiers.scheme, "gii_abbr"), eq(legalActIdentifiers.value, abbr)));
  if (!act) return null;
  const [name] = await db
    .select({ text: legalActNames.text, locale: legalActNames.locale })
    .from(legalActNames)
    .where(eq(legalActNames.actId, act.actId));
  const links = await db
    .select({ scheme: legalActIdentifiers.scheme, value: legalActIdentifiers.value })
    .from(legalActIdentifiers)
    .where(eq(legalActIdentifiers.actId, act.actId));
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
  return { ...act, name, links, versions, provisions };
}

describe.skipIf(!RUN)("German federal law import", () => {
  const items = [
    { abbr: STATUTE, title: "Gesetz über das Testen" },
    { abbr: ORDINANCE, title: "Verordnung zur Durchführung des Testgesetzes" },
  ];
  const first = { [STATUTE]: zipOf(xml("Gesetz über das Testen", "Erster Text.")) };
  const both = { ...first, [ORDINANCE]: zipOf(xml("Verordnung", "Verordnungstext.")) };

  it("reads the register and each act's text, dated by the day read, and a rerun fetches nothing", async () => {
    const report = await importGii(db, {
      snapshots,
      today: "2099-01-01",
      only: [STATUTE, ORDINANCE],
      fetchImpl: portal(items, both),
      pauseMs: 0,
      archiveRetryMs: [],
    });
    expect(report).toMatchObject({
      stored: 2,
      firstVersions: 2,
      unchanged: 0,
      provisions: 4,
      failures: [],
    });
    expect(report.kinds).toMatchObject({ statute: 1, ordinance: 1 });

    const act = await held(STATUTE);
    expect(act!.kind).toBe("statute");
    expect(act!.inForce).toBe(true);
    expect(act!.name).toEqual({ text: "Gesetz über das Testen", locale: "de" });
    expect(act!.links).toEqual(
      expect.arrayContaining([
        { scheme: "gii_abbr", value: STATUTE },
        {
          scheme: "official_url",
          value: `https://www.gesetze-im-internet.de/${STATUTE}/index.html`,
        },
      ]),
    );
    expect(act!.provisions).toEqual([
      { path: "par_1", heading: "§ 1 Zweck", text: "Erster Text." },
      { path: "anlage_1", heading: "Anlage 1", text: "Anlagentext" },
    ]);
    expect(act!.versions).toMatchObject([
      {
        inForceFrom: "2099-01-01",
        inForceTo: null,
        dateBasis: "retrieved",
        format: "xml",
        lang: "de",
        url: `https://www.gesetze-im-internet.de/${STATUTE}/xml.zip`,
        licence: "LicenseRef-de-official-work",
      },
    ]);
    expect((await held(ORDINANCE))!.kind).toBe("ordinance");

    const asked: string[] = [];
    const rerun = await importGii(db, {
      snapshots,
      today: "2099-01-01",
      only: [STATUTE, ORDINANCE],
      fetchImpl: portal(items, {}, {}, asked),
      pauseMs: 0,
      archiveRetryMs: [],
    });
    expect(rerun).toMatchObject({ alreadyHeld: 2, stored: 0, unchanged: 0, failures: [] });
    // Only the table of contents: no act was asked for again.
    expect(asked).toEqual(["https://www.gesetze-im-internet.de/gii-toc.xml"]);
  });

  it("reads an act again on request, and stores nothing when its text is the text held", async () => {
    const report = await importGii(db, {
      snapshots,
      today: "2099-01-08",
      only: [STATUTE],
      again: true,
      // The portal rebuilt the file (a new build date); the words are the same.
      fetchImpl: portal(items, {
        [STATUTE]: zipOf(xml("Gesetz über das Testen", "Erster Text.", "20261108000000")),
      }),
      pauseMs: 0,
      archiveRetryMs: [],
    });
    expect(report).toMatchObject({ unchanged: 1, stored: 0, failures: [] });
    expect((await held(STATUTE))!.versions).toHaveLength(1);
  });

  it("stores a changed text as a new version and closes the one before it", async () => {
    const report = await importGii(db, {
      snapshots,
      today: "2099-01-15",
      only: [STATUTE],
      again: true,
      fetchImpl: portal(items, {
        [STATUTE]: zipOf(xml("Gesetz über das Testen", "Geänderter Text.")),
      }),
      pauseMs: 0,
      archiveRetryMs: [],
    });
    expect(report).toMatchObject({ stored: 1, firstVersions: 0, unchanged: 0, failures: [] });
    const act = await held(STATUTE);
    expect(act!.provisions[0]!.text).toBe("Geänderter Text.");
    expect(act!.versions.map((v) => [v.inForceFrom, v.inForceTo])).toEqual([
      ["2099-01-01", "2099-01-14"],
      ["2099-01-15", null],
    ]);
  });

  it("reports a page that is not a zip and an archive of no XML, and goes on", async () => {
    const listed = [
      { abbr: BROKEN, title: "Gesetz über Kaputtes" },
      { abbr: `${BROKEN}b`, title: "Gesetz über Leeres" },
    ];
    const report = await importGii(db, {
      snapshots,
      today: "2099-02-01",
      only: [BROKEN, `${BROKEN}b`],
      fetchImpl: portal(listed, {
        [BROKEN]: "<html><body>Wartungsarbeiten</body></html>",
        [`${BROKEN}b`]: zipSync({ "bild.gif": new Uint8Array([1]) }),
      }),
      pauseMs: 0,
      archiveRetryMs: [],
    });
    expect(report.stored).toBe(0);
    expect(report.failures.map((f) => f.act).sort()).toEqual([BROKEN, `${BROKEN}b`].sort());
    expect(report.failures.find((f) => f.act === BROKEN)!.reason).toMatch(
      /^not an act's zip \(began: <html>/,
    );
    expect(report.failures.find((f) => f.act === `${BROKEN}b`)!.reason).toBe("no XML in the zip");
  });

  it("reads a text the portal refuses from the Internet Archive's copy, and the version names the copy", async () => {
    const listed = [{ abbr: REFUSED, title: "Gesetz über Verweigerungen" }];
    const at = `https://www.gesetze-im-internet.de/${REFUSED}/xml.zip`;
    const report = await importGii(db, {
      snapshots,
      today: "2099-03-01",
      only: [REFUSED],
      fetchImpl: portal(
        listed,
        { [REFUSED]: 403 },
        { [at]: zipOf(xml("Gesetz über Verweigerungen", "Aus der Kopie.")) },
      ),
      pauseMs: 0,
      archiveRetryMs: [],
    });
    expect(report).toMatchObject({ stored: 1, fromArchive: 1, failures: [] });
    const act = await held(REFUSED);
    expect(act!.provisions[0]!.text).toBe("Aus der Kopie.");
    expect(act!.versions[0]!.url).toMatch(
      /^https:\/\/web\.archive\.org\/web\/\d{14}id_\/https:\/\/www\.gesetze-im-internet\.de/,
    );
  });

  it("cuts the acts held again from their snapshots, adding structure only", async () => {
    const report = await recutGiiText(db, { snapshots });
    // The reader's version is current for everything stored above, so there is nothing to recut.
    expect(report.failures).toEqual([]);
    expect(report.improved).toBe(0);
  });
});

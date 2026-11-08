/**
 * Austria's federal law through the real importer into a real database, against a
 * stand-in for the RIS: the OGD API's register (a page of the acts' own documents) and
 * its question for the day a text began, and the whole-act pages. An act dated by the
 * publisher; a rerun that reads nothing; a text the RIS changed, read again and stored as
 * a newer version that closes the one before; a change that carries no new day, reported
 * and not stored twice; a page that is not an act reported; a refusal answered from the
 * Internet Archive's copy, which the version names; a dry run that stores nothing.
 *
 * The stand-in speaks the shapes the handbook and the captured documents show; the live
 * RIS has not answered the sandbox this was written in, so a dry run on the server is the
 * test of the stand-in itself.
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
import { importRis } from "../import-ris";

const RUN = process.env.INTEGRATION === "1";

const snapshots: SnapshotStore = {
  async put(sha) {
    return `memory/${sha}`;
  },
  async get() {
    throw new Error("not needed here");
  },
};

const TODAY = "2026-11-08";
/** Gesetzesnummern no real act has (the RIS's are eight digits starting 1), new on every run. */
const N = randomInt(90_000_000, 99_000_000);
const LAW = String(N);
const ORDINANCE = String(N + 1);
const REFUSED = String(N + 2);
const BROKEN = String(N + 3);

interface Listed {
  ges: string;
  title: string;
  typ: string;
  /** The day the RIS last changed the act's document. */
  changed: string;
}

const norm = (a: Listed) => ({
  Data: {
    Metadaten: {
      Technisch: { ID: `NOR${a.ges}`, Applikation: "BrKons" },
      Allgemein: { Geaendert: a.changed },
      Bundesrecht: {
        Kurztitel: a.title,
        Titel: `${a.title} (Langtitel)<br/>StF: BGBl. I Nr. 1/2020`,
        BrKons: {
          Typ: a.typ,
          Dokumenttyp: "Norm",
          ArtikelParagraphAnlage: "§ 0",
          Inkrafttretensdatum: "2020-01-01",
          Gesetzesnummer: a.ges,
          GesamteRechtsvorschriftUrl: `https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=${a.ges}`,
        },
      },
    },
  },
});

const section = (day: string) => ({
  Data: {
    Metadaten: { Bundesrecht: { BrKons: { Dokumenttyp: "Paragraph", Inkrafttretensdatum: day } } },
  },
});

const text = (word: string) =>
  `<html><body><div class="document"><div class="documentContent"><h2 class="onlyScreenreader">
    § 1
  </h2><div id="a_TextContainer_1" class="p embeddedContent"><h3>Text</h3><div><div class="contentBlock"><h4 class="UeberschrPara">Zweck</h4><div class="Abs"><span class="Absatzzahl">(1)</span><span class="sr-only">Absatz eins,</span><span>${word}</span></div></div></div></div></div></div></body></html>`;

/** The RIS: the register's page, the day a text began, and each act's page by Gesetzesnummer. */
function publisher(
  listed: Listed[],
  /** The latest day a section of each act took effect; none means the API names none. */
  days: Record<string, string | undefined>,
  pages: Record<string, string | number>,
  archive: Record<string, string> = {},
): typeof fetch {
  return async (input) => {
    const url = String(input);
    if (url.startsWith("https://data.bka.gv.at/")) {
      const q = new URL(url).searchParams;
      const ges = q.get("Gesetzesnummer");
      const docs = ges ? (days[ges] ? [section(days[ges]!)] : []) : listed.map((a) => norm(a));
      return Response.json({
        OgdSearchResult: {
          OgdDocumentResults: {
            Hits: { "#text": String(docs.length) },
            OgdDocumentReference: docs,
          },
        },
      });
    }
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
    const m = /Gesetzesnummer=(\d+)$/.exec(url);
    const answer = m ? pages[m[1]!] : undefined;
    if (typeof answer === "number") return new Response("", { status: answer });
    if (!answer) return new Response("", { status: 404 });
    return new Response(answer, { headers: { "content-type": "text/html" } });
  };
}

async function held(number: string) {
  const [act] = await db
    .select({ actId: legalActIdentifiers.actId, kind: legalActs.kind })
    .from(legalActIdentifiers)
    .innerJoin(legalActs, eq(legalActs.id, legalActIdentifiers.actId))
    .where(
      and(
        eq(legalActIdentifiers.scheme, "at_gesetzesnummer"),
        eq(legalActIdentifiers.value, number),
      ),
    );
  if (!act) return null;
  const [name] = await db
    .select({ text: legalActNames.text, locale: legalActNames.locale })
    .from(legalActNames)
    .where(eq(legalActNames.actId, act.actId));
  const identifiers = await db
    .select({ scheme: legalActIdentifiers.scheme, value: legalActIdentifiers.value })
    .from(legalActIdentifiers)
    .where(eq(legalActIdentifiers.actId, act.actId));
  const versions = await db
    .select({
      id: legalActVersions.id,
      inForceFrom: legalActVersions.inForceFrom,
      inForceTo: legalActVersions.inForceTo,
      dateBasis: legalActVersions.dateBasis,
      status: legalActVersions.status,
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
    : [];
  return { kind: act.kind, name, identifiers, versions, provisions };
}

const options = (fetchImpl: typeof fetch, extra: object = {}) => ({
  snapshots,
  today: TODAY,
  fetchImpl,
  pauseMs: 0,
  archiveRetryMs: [] as number[],
  ...extra,
});

describe.skipIf(!RUN)("Austrian federal law import", () => {
  const acts: Listed[] = [
    { ges: LAW, title: `Testgesetz ${N}`, typ: "BG", changed: "2020-06-01" },
    { ges: ORDINANCE, title: `Testverordnung ${N}`, typ: "V", changed: "2020-06-01" },
  ];

  it("reads the acts in force, each dated by the publisher, cut into its sections, and reruns for free", async () => {
    const first = await importRis(
      db,
      options(
        publisher(
          acts,
          { [LAW]: "2025-10-01", [ORDINANCE]: "2020-02-01" },
          {
            [LAW]: text("Dieses Gesetz regelt einen Test."),
            [ORDINANCE]: text("Diese Verordnung regelt einen Test."),
          },
        ),
      ),
    );
    expect(first).toMatchObject({
      acts: 2,
      stored: 2,
      provisions: 2,
      datedByReading: 0,
      failures: [],
      typeCounts: { BG: 1, V: 1 },
    });

    const law = await held(LAW);
    expect(law!.kind).toBe("statute");
    expect(law!.name).toEqual({ text: `Testgesetz ${N}`, locale: "de" });
    expect(law!.identifiers).toEqual(
      expect.arrayContaining([
        { scheme: "at_gesetzesnummer", value: LAW },
        { scheme: "at_nor", value: `NOR${LAW}` },
        {
          scheme: "official_url",
          value: `https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=${LAW}`,
        },
      ]),
    );
    expect(law!.provisions).toEqual([
      { path: "§ 1", heading: "§ 1 Zweck", text: "Zweck\n(1) Dieses Gesetz regelt einen Test." },
    ]);
    expect(law!.versions).toMatchObject([
      {
        inForceFrom: "2025-10-01",
        inForceTo: null,
        dateBasis: "publisher",
        status: "consolidated",
        lang: "de",
        url: `https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=${LAW}`,
        licence: "CC-BY-4.0",
      },
    ]);
    expect((await held(ORDINANCE))!.kind).toBe("ordinance");

    // Read after the RIS last changed them: nothing to read.
    const rerun = await importRis(
      db,
      options(publisher(acts, { [LAW]: "2025-10-01", [ORDINANCE]: "2020-02-01" }, {})),
    );
    expect(rerun).toMatchObject({ alreadyHeld: 2, stored: 0, failures: [] });
  });

  it("reads a text the RIS changed again, and closes the version before it; a change with no new day is not stored twice", async () => {
    const changed = acts.map((a) => ({ ...a, changed: "2999-01-01" }));
    const report = await importRis(
      db,
      options(
        publisher(
          changed,
          { [LAW]: "2026-01-01", [ORDINANCE]: "2020-02-01" },
          {
            [LAW]: text("Dieses Gesetz regelt einen Test, geändert."),
            [ORDINANCE]: text("Unverändert."),
          },
        ),
      ),
    );
    expect(report).toMatchObject({ stored: 1, unchanged: 1, failures: [] });
    const law = await held(LAW);
    expect(law!.provisions[0]!.text).toBe("Zweck\n(1) Dieses Gesetz regelt einen Test, geändert.");
    expect(law!.versions.map((v) => [v.inForceFrom, v.inForceTo])).toEqual([
      ["2025-10-01", "2025-12-31"],
      ["2026-01-01", null],
    ]);
    expect((await held(ORDINANCE))!.versions).toHaveLength(1);
  });

  it("reports a page that is not an act, dates a reading by the day it was made when the API names none, and stores it", async () => {
    const listed: Listed[] = [
      { ges: BROKEN, title: `Kaputt ${N}`, typ: "BG", changed: "2020-01-01" },
      { ges: String(N + 4), title: `Ohne Tag ${N}`, typ: "K", changed: "2020-01-01" },
    ];
    const report = await importRis(
      db,
      options(
        publisher(
          listed,
          { [BROKEN]: "2020-01-01" },
          {
            [BROKEN]: "<html><body><h1>Fehler</h1><p>Seite nicht gefunden.</p></body></html>",
            [String(N + 4)]: text("Eine Kundmachung."),
          },
        ),
      ),
    );
    expect(report.failures).toEqual([{ act: BROKEN, reason: "not an act's page" }]);
    expect(report).toMatchObject({ stored: 1, datedByReading: 1 });
    const read = await held(String(N + 4));
    expect(read!.kind).toBe("notice");
    expect(read!.versions[0]).toMatchObject({ inForceFrom: TODAY, dateBasis: "retrieved" });
  });

  it("reads a text the RIS refuses from the Internet Archive's copy, and the version names the copy", async () => {
    const listed: Listed[] = [
      { ges: REFUSED, title: `Verweigert ${N}`, typ: "BG", changed: "2020-01-01" },
    ];
    const at = `https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=${REFUSED}`;
    const report = await importRis(
      db,
      options(
        publisher(
          listed,
          { [REFUSED]: "2021-05-01" },
          { [REFUSED]: 403 },
          { [at]: text("Aus der Kopie.") },
        ),
      ),
    );
    expect(report).toMatchObject({ stored: 1, fromArchive: 1, failures: [] });
    const act = await held(REFUSED);
    expect(act!.provisions[0]!.text).toContain("Aus der Kopie.");
    expect(act!.versions[0]!.url).toMatch(
      /^https:\/\/web\.archive\.org\/web\/\d{14}id_\/https:\/\/www\.ris\.bka\.gv\.at/,
    );
  });

  it("a dry run reads and cuts the texts of acts it has not stored, and stores nothing", async () => {
    const ges = String(N + 5);
    const listed: Listed[] = [{ ges, title: `Probe ${N}`, typ: "BG", changed: "2020-01-01" }];
    const report = await importRis(
      db,
      options(publisher(listed, { [ges]: "2022-02-02" }, { [ges]: text("Nur gelesen.") }), {
        dryRun: true,
        limit: 5,
      }),
    );
    expect(report).toMatchObject({
      status: "dry_run",
      acts: 1,
      stored: 1,
      provisions: 1,
      failures: [],
    });
    expect(await held(ges)).toBeNull();
  });
});

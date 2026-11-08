/**
 * The European Union's law through the real importer into a real database,
 * against a stand-in for Cellar and EUR-Lex: the register read a year at a
 * time, an amended act read in its latest consolidated version and an act
 * never amended as published, each dated by the day the publisher states; a
 * rerun that fetches nothing; a newer consolidated version that closes the
 * one before it; a page that is not an act reported; a refusal answered from
 * the Internet Archive's copy, which the version names.
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
import { importEurLex } from "../import-eurlex";

const RUN = process.env.INTEGRATION === "1";

const snapshots: SnapshotStore = {
  async put(sha) {
    return `memory/${sha}`;
  },
  async get() {
    throw new Error("not needed here");
  },
};

/** A CELEX year no real act has, and numbers new on every run. */
const YEAR = 2099;
const N = randomInt(1000, 9000);
const celex = (type: "R" | "L", n: number) => `3${YEAR}${type}${String(n).padStart(4, "0")}`;
const REG = celex("R", N);
const DIR = celex("L", N + 1);
const REFUSED = celex("R", N + 2);
const UNSERVED = celex("L", N + 3);

interface Listed {
  celex: string;
  title: string;
  force: string;
}

const page = (article: string) =>
  `<html><body><div id="document1"><div class="eli-subdivision" id="art_1"><p class="oj-ti-art">Article 1</p><div class="eli-title" id="art_1.tit_1"><p class="oj-sti-art">Subject matter</p></div><p class="oj-normal">${article}</p></div></div></body></html>`;

const literal = (value: string) => ({ type: "literal", value });

/** Cellar and EUR-Lex: the register's two questions, and each text's page by CELEX number. */
function publisher(
  listed: Listed[],
  consolidated: string[],
  pages: Record<string, string | number>,
  archive: Record<string, string> = {},
): typeof fetch {
  return async (input, init) => {
    const url = String(input);
    if (url.startsWith("https://publications.europa.eu/")) {
      const query = new URLSearchParams(String(init?.body)).get("query")!;
      const bindings = query.includes("in-force")
        ? listed.map((a) => ({
            celex: literal(a.celex),
            title: literal(a.title),
            force: literal(a.force),
          }))
        : consolidated.map((c) => ({ celex: literal(c) }));
      return Response.json({ head: { vars: [] }, results: { bindings } });
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
    const m = /CELEX:([0-9A-Z-]+)$/.exec(url);
    const answer = m ? pages[m[1]!] : undefined;
    if (typeof answer === "number") return new Response("", { status: answer });
    if (!answer) return new Response("", { status: 404 });
    return new Response(answer, { headers: { "content-type": "text/html" } });
  };
}

async function held(value: string) {
  const [act] = await db
    .select({ actId: legalActIdentifiers.actId, kind: legalActs.kind })
    .from(legalActIdentifiers)
    .innerJoin(legalActs, eq(legalActs.id, legalActIdentifiers.actId))
    .where(and(eq(legalActIdentifiers.scheme, "celex"), eq(legalActIdentifiers.value, value)));
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
  return { kind: act.kind, name, versions, provisions };
}

describe.skipIf(!RUN)("EU law import", () => {
  const acts: Listed[] = [
    { celex: REG, title: `Regulation (EU) ${YEAR}/${N} on testing`, force: `${YEAR}-02-01` },
    { celex: DIR, title: `Directive (EU) ${YEAR}/${N + 1} on testing`, force: `${YEAR}-03-01` },
  ];
  const v1 = `0${REG.slice(1)}-${YEAR}0601`;

  it("reads the acts in force, the amended one in its consolidated version, each dated by the publisher, and reruns for free", async () => {
    const first = await importEurLex(db, {
      snapshots,
      today: `${YEAR}-12-31`,
      years: [YEAR],
      fetchImpl: publisher(acts, [v1, `0${REG.slice(1)}-${YEAR + 1}0101`], {
        [v1]: page("This Regulation lays down rules, as amended."),
        [DIR]: page("This Directive lays down rules."),
      }),
      pauseMs: 0,
      archiveRetryMs: [],
    });
    expect(first).toMatchObject({
      acts: 2,
      stored: 2,
      consolidated: 1,
      provisions: 2,
      failures: [],
    });

    const reg = await held(REG);
    expect(reg!.kind).toBe("regulation");
    expect(reg!.name).toEqual({ text: `Regulation (EU) ${YEAR}/${N} on testing`, locale: "en" });
    expect(reg!.provisions).toEqual([
      {
        path: "art_1",
        heading: "Article 1 Subject matter",
        text: "This Regulation lays down rules, as amended.",
      },
    ]);
    // The consolidated version that has begun, by the day its CELEX number names; not the one still to come.
    expect(reg!.versions).toMatchObject([
      {
        inForceFrom: `${YEAR}-06-01`,
        inForceTo: null,
        dateBasis: "publisher",
        lang: "en",
        url: `https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:${v1}`,
        licence: "LicenseRef-eu-reuse-2011-833",
      },
    ]);
    const dir = await held(DIR);
    expect(dir!.kind).toBe("directive");
    expect(dir!.versions.map((v) => v.inForceFrom)).toEqual([`${YEAR}-03-01`]);

    const rerun = await importEurLex(db, {
      snapshots,
      today: `${YEAR}-12-31`,
      years: [YEAR],
      fetchImpl: publisher(acts, [v1], {}),
      pauseMs: 0,
      archiveRetryMs: [],
    });
    expect(rerun).toMatchObject({ alreadyHeld: 2, stored: 0, failures: [] });
  });

  it("stores a newer consolidated version and closes the one before it; reports a page that is not an act", async () => {
    const v2 = `0${REG.slice(1)}-${YEAR + 1}0101`;
    const dir2 = `0${DIR.slice(1)}-${YEAR + 1}0101`;
    const report = await importEurLex(db, {
      snapshots,
      today: `${YEAR + 1}-02-01`,
      years: [YEAR],
      fetchImpl: publisher(acts, [v1, v2, dir2], {
        [v2]: page("This Regulation lays down rules, amended again."),
        [dir2]: "<html><body><p>The requested document does not exist.</p></body></html>",
      }),
      pauseMs: 0,
      archiveRetryMs: [],
    });
    expect(report.stored).toBe(1);
    expect(report.failures).toEqual([{ act: DIR, reason: "not an act's page" }]);
    const reg = await held(REG);
    expect(reg!.provisions[0]!.text).toBe("This Regulation lays down rules, amended again.");
    expect(reg!.versions.map((v) => [v.inForceFrom, v.inForceTo])).toEqual([
      [`${YEAR}-06-01`, `${YEAR}-12-31`],
      [`${YEAR + 1}-01-01`, null],
    ]);
  });

  it("reads a text EUR-Lex refuses from the Internet Archive's copy, and the version names the copy", async () => {
    const listed: Listed[] = [
      {
        celex: REFUSED,
        title: `Regulation (EU) ${YEAR}/${N + 2} on refusals`,
        force: `${YEAR}-04-01`,
      },
    ];
    const at = `https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:${REFUSED}`;
    const report = await importEurLex(db, {
      snapshots,
      today: `${YEAR}-12-31`,
      years: [YEAR],
      fetchImpl: publisher(listed, [], { [REFUSED]: 403 }, { [at]: page("Read from the copy.") }),
      pauseMs: 0,
      archiveRetryMs: [],
    });
    expect(report).toMatchObject({ stored: 1, fromArchive: 1, failures: [] });
    const act = await held(REFUSED);
    expect(act!.provisions[0]!.text).toBe("Read from the copy.");
    expect(act!.versions[0]!.url).toMatch(
      /^https:\/\/web\.archive\.org\/web\/\d{14}id_\/https:\/\/eur-lex/,
    );
  });

  it("reads the act as published when EUR-Lex serves no page for its consolidated version", async () => {
    // As 02016L0681-20160504: listed, dated the act's own first day, answering 404.
    const listed: Listed[] = [
      { celex: UNSERVED, title: `Directive (EU) ${YEAR}/${N + 3} on gaps`, force: `${YEAR}-05-24` },
    ];
    const unserved = `0${UNSERVED.slice(1)}-${YEAR}0504`;
    const report = await importEurLex(db, {
      snapshots,
      today: `${YEAR}-12-31`,
      years: [YEAR],
      fetchImpl: publisher(listed, [unserved], {
        [unserved]: 404,
        [UNSERVED]: page("Read as published."),
      }),
      pauseMs: 0,
      archiveRetryMs: [],
    });
    expect(report).toMatchObject({ stored: 1, consolidated: 0, failures: [] });
    const act = await held(UNSERVED);
    expect(act!.provisions[0]!.text).toBe("Read as published.");
    expect(act!.versions[0]!.inForceFrom).toBe(`${YEAR}-05-24`);
  });
});

/**
 * Estonia's law through the real importer into a real database, against a
 * stand-in for Riigi Teataja: the register read page by page (local
 * regulations left out), each act's text stored with the publisher's date, a
 * rerun that fetches nothing, a newer version that closes the old one, and an
 * answer that is not the gazette's XML reported.
 *
 * Runs only with INTEGRATION=1 against a migrated database.
 */
import { randomInt } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { legalActIdentifiers, legalActVersions, legalProvisions } from "@/lib/db/law-schema";
import type { SnapshotStore } from "@/lib/places/importer/snapshots";
import { importRiigiTeataja } from "../import-riigiteataja";

const RUN = process.env.INTEGRATION === "1";

const snapshots: SnapshotStore = {
  async put(sha) {
    return `memory/${sha}`;
  },
  async get() {
    throw new Error("not needed here");
  },
};

/** Group ids no real act has, new on every run. */
const G = randomInt(900_000_000, 999_000_000);

interface Listed {
  id: number;
  groupId: number;
  title: string;
  from: string;
  local?: boolean;
}

const xmlOf = (from: string, text: string) =>
  `<?xml version='1.0' encoding='UTF-8'?><oigusakt xmlns="Juurakt"><metaandmed><kehtivus><kehtivuseAlgus>${from}+02:00</kehtivuseAlgus></kehtivus></metaandmed>
<paragrahv id="para1"><paragrahvNr>1</paragrahvNr><kuvatavNr><![CDATA[§ 1. ]]></kuvatavNr><paragrahvPealkiri>Reguleerimisala</paragrahvPealkiri>
<loige id="para1lg1"><kuvatavNr><![CDATA[(1)]]></kuvatavNr><sisuTekst><tavatekst>${text}</tavatekst></sisuTekst></loige></paragrahv></oigusakt>`;

/** A stand-in for Riigi Teataja: the register in pages of two, and each act's XML. */
function gazette(listed: Listed[], texts: Record<number, string | "not xml">): typeof fetch {
  return async (input, init) => {
    const url = String(input);
    if (url.endsWith("/otsing/tervik-tekst")) {
      const offset = JSON.parse(String(init?.body)).general.searchAfter as number;
      const page = listed.slice(offset, offset + 2).map((a) => ({
        id: a.id,
        groupId: a.groupId,
        title: a.title,
        abbreviation: null,
        reportType: "seadus",
        reportIssuer: "Riigikogu",
        reportDateStart: `${a.from}T00:00:00+02:00`,
        localGovernment: a.local ?? false,
      }));
      return Response.json({ kehtivad: listed.length, results: page });
    }
    const m = /\/akt\/(\d+)\/blob-xml$/.exec(url);
    const text = m ? texts[Number(m[1])] : undefined;
    if (!text) return new Response("", { status: 404 });
    const listedAct = listed.find((a) => a.id === Number(m![1]))!;
    return new Response(
      text === "not xml" ? "<html>hooldustööd</html>" : xmlOf(listedAct.from, text),
    );
  };
}

async function heldText(groupId: number) {
  const [act] = await db
    .select({ actId: legalActIdentifiers.actId })
    .from(legalActIdentifiers)
    .where(
      and(
        eq(legalActIdentifiers.scheme, "publisher_ref"),
        eq(legalActIdentifiers.value, `riigiteataja:${groupId}`),
      ),
    );
  if (!act) return null;
  const versions = await db
    .select()
    .from(legalActVersions)
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
  return { versions, provisions };
}

describe.skipIf(!RUN)("Estonian law import", () => {
  const acts: Listed[] = [
    { id: G + 1, groupId: G + 101, title: "Tulumaksuseadus", from: "2026-10-01" },
    { id: G + 2, groupId: G + 102, title: "Riigilõivuseadus", from: "2026-01-01" },
    {
      id: G + 3,
      groupId: G + 103,
      title: "Tallinna linna määrus",
      from: "2026-01-01",
      local: true,
    },
  ];

  it("reads the national acts in force, stores each text with the publisher's date, and reruns for free", async () => {
    const first = await importRiigiTeataja(db, {
      snapshots,
      today: "2031-01-01",
      fetchImpl: gazette(acts, {
        [G + 1]: "Tulumaksu määr on 22%.",
        [G + 2]: "Riigilõivu tasutakse.",
      }),
      pauseMs: 0,
    });
    expect(first).toMatchObject({ acts: 2, stored: 2, provisions: 2, failures: [] });
    expect(await heldText(G + 103)).toBeNull();
    const tax = await heldText(G + 101);
    expect(tax!.provisions).toEqual([
      { path: "para1", heading: "§ 1. Reguleerimisala", text: "(1) Tulumaksu määr on 22%." },
    ]);
    expect(tax!.versions.at(-1)).toMatchObject({
      inForceFrom: "2026-10-01",
      dateBasis: "publisher",
      format: "xml",
      lang: "et",
    });

    const rerun = await importRiigiTeataja(db, {
      snapshots,
      today: "2031-01-01",
      fetchImpl: gazette(acts, {}),
      pauseMs: 0,
    });
    expect(rerun).toMatchObject({ alreadyHeld: 2, stored: 0, failures: [] });
  });

  it("stores a newer version and closes the one before it; reports an answer that is not the XML", async () => {
    const newer: Listed[] = [
      { id: G + 11, groupId: G + 101, title: "Tulumaksuseadus", from: "2027-01-01" },
      { id: G + 12, groupId: G + 102, title: "Riigilõivuseadus", from: "2027-01-01" },
    ];
    const report = await importRiigiTeataja(db, {
      snapshots,
      today: "2031-02-01",
      fetchImpl: gazette(newer, { [G + 11]: "Tulumaksu määr on 24%.", [G + 12]: "not xml" }),
      pauseMs: 0,
    });
    expect(report.stored).toBe(1);
    expect(report.failures).toEqual([{ act: String(G + 12), reason: "not the gazette's XML" }]);
    const tax = await heldText(G + 101);
    expect(tax!.provisions[0]!.text).toBe("(1) Tulumaksu määr on 24%.");
    expect(tax!.versions.map((v) => [v.inForceFrom, v.inForceTo])).toEqual([
      ["2026-10-01", "2026-12-31"],
      ["2027-01-01", null],
    ]);
  });

  it("stops after twenty refusals in a row instead of asking thousands more times, and says why", async () => {
    const many: Listed[] = Array.from({ length: 30 }, (_, i) => ({
      id: G + 200 + i,
      groupId: G + 300 + i,
      title: `Seadus ${i}`,
      from: "2026-01-01",
    }));
    const refusing: typeof fetch = async (input, init) => {
      if (String(input).endsWith("/otsing/tervik-tekst")) return gazette(many, {})(input, init);
      return new Response("", { status: 403 });
    };
    const report = await importRiigiTeataja(db, {
      snapshots,
      today: "2031-03-01",
      fetchImpl: refusing,
      pauseMs: 0,
    });
    expect(report.failures).toHaveLength(20);
    expect(report.stoppedBecause).toBe("the act answered 403");
    expect(report.failureReasons).toEqual({ "the act answered N": 20 });
  });
});

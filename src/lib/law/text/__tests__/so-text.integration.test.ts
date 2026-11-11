/**
 * South Ossetia's texts through the real importer into a real database,
 * against stand-ins built from the pages read on 2026-11-10: a decree of the
 * President dated by its closing lines and numbered from them, a rerun that
 * fetches nothing, a dry run that writes nothing, and a law of the Parliament
 * dated by its own field and numbered from its header.
 *
 * Runs only with INTEGRATION=1 against a migrated database.
 */
import { randomInt } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { and, asc, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { legalActIdentifiers, legalActVersions, legalProvisions } from "@/lib/db/law-schema";
import type { SnapshotStore } from "@/lib/places/importer/snapshots";
import { registerParliament, registerPresident } from "../import-so-registers";
import { importSoText } from "../import-so-text";

const RUN = process.env.INTEGRATION === "1";
const snapshots: SnapshotStore = {
  async put(sha) {
    return `memory/${sha}`;
  },
  async get() {
    throw new Error("not needed here");
  },
};
const fixture = (name: string) => readFileSync(join(__dirname, "fixtures", name), "utf8");
const N = randomInt(700_000_000, 799_000_000);

const row = (id: number, title: string) =>
  `<div class="views-row"><div class="views-field views-field-title"><h3 class="field-content"><a href="/node/${id}">${title}</a></h3></div></div>`;

/** The Parliament: one law (a real page), one page that is no act. */
const parliament: typeof fetch = async (input) => {
  const url = String(input);
  if (url.includes("taxonomy/term/2?page=0")) {
    return new Response(
      `<div class="view-content">${row(N + 1, "Закон РЮО «О местном самоуправлении»")}${row(N + 2, "Закон РЮО «Пустая страница»")}${row(N + 3, "Налоговый кодекс Республики Южная Осетия. Часть вторая")}</div>`,
    );
  }
  if (url.includes("taxonomy/term/")) return new Response("<div></div>");
  if (url.endsWith(`/node/${N + 1}`))
    return new Response(fixture("parliamentrso-node-5546.fixture.html"));
  if (url.endsWith(`/node/${N + 2}`)) return new Response("<html>maintenance</html>");
  // A code printed as a page that links its Word files: the Tax Code's real page.
  if (url.endsWith(`/node/${N + 3}`))
    return new Response(fixture("parliamentrso-node-5469.fixture.html"));
  if (url.endsWith("nalogovyy_kodeks_respubliki_yuzhnaya_osetiya_ch.2_ispr_parl_0.doc"))
    return new Response(readFileSync(join(__dirname, "fixtures", "so-code-cut.doc")));
  if (url.endsWith("perechen_nalogovyy_kodeks_respubliki_yuzhnaya_osetiya.doc"))
    return new Response("the contents, never to be read as the code", { status: 500 });
  return new Response("", { status: 404 });
};

/** The same code's page as it was before its link was there: only the words, a stub. */
const stubbed: typeof fetch = async (input) =>
  String(input).endsWith(`/node/${N + 3}`)
    ? new Response(
        fixture("parliamentrso-node-5469.fixture.html").replace(/<a href="[^"]+\.doc">/g, "<a>"),
      )
    : parliament(input);

const decree = fixture("presidentruo-post-89961.fixture.json");
const president: typeof fetch = async (input) => {
  const url = String(input);
  if (url.includes("categories=7") && url.includes("page=1")) {
    return Response.json(
      [
        {
          id: N + 11,
          date: "2026-11-06T18:33:10",
          link: `https://presidentruo.org/ukaz-${N + 11}/`,
          title: { rendered: "Указ" },
        },
      ],
      { headers: { "x-wp-totalpages": "1" } },
    );
  }
  if (url.includes("categories="))
    return Response.json([], { headers: { "x-wp-totalpages": "1" } });
  if (url.includes(`/posts/${N + 11}?`)) return new Response(decree);
  return new Response("", { status: 404 });
};

async function versionsOf(identity: string) {
  const [act] = await db
    .select({ actId: legalActIdentifiers.actId })
    .from(legalActIdentifiers)
    .where(
      and(eq(legalActIdentifiers.scheme, "publisher_ref"), eq(legalActIdentifiers.value, identity)),
    );
  if (!act) return [];
  return db
    .select({
      id: legalActVersions.id,
      from: legalActVersions.inForceFrom,
      basis: legalActVersions.dateBasis,
      format: legalActVersions.format,
    })
    .from(legalActVersions)
    .where(eq(legalActVersions.actId, act.actId))
    .orderBy(asc(legalActVersions.inForceFrom));
}

describe.skipIf(!RUN)("South Ossetia's texts (real database)", () => {
  it("stores a law of the Parliament under its own date and header number, and reports a page that is no act", async () => {
    await registerParliament(db, { snapshots, pauseMs: 0, fetchImpl: parliament, term: "2" });
    const report = await importSoText(db, "parliamentrso", {
      snapshots,
      pauseMs: 0,
      fetchImpl: parliament,
      ids: [String(N + 1), String(N + 2)],
    });
    const failed = report.failures.filter((f) => f.act === String(N + 2));
    expect(failed).toHaveLength(1);
    expect(failed[0]!.reason).toMatch(/not an act page/);
    const versions = await versionsOf(`parliamentrso:${N + 1}`);
    expect(versions).toHaveLength(1);
    expect(versions[0]).toMatchObject({ basis: "publisher", format: "html" });
    expect(String(versions[0]!.from)).toBe("2004-02-18");
    const provisions = await db
      .select({ path: legalProvisions.path })
      .from(legalProvisions)
      .where(eq(legalProvisions.versionId, versions[0]!.id))
      .orderBy(asc(legalProvisions.ord));
    expect(provisions.map((p) => p.path)).toEqual(["preamble", "ch_i", "art_1", "art_2", "art_3"]);
    const [number] = await db
      .select({ value: legalActIdentifiers.value })
      .from(legalActIdentifiers)
      .innerJoin(legalActVersions, eq(legalActVersions.actId, legalActIdentifiers.actId))
      .where(
        and(eq(legalActIdentifiers.scheme, "act_number"), eq(legalActVersions.id, versions[0]!.id)),
      );
    expect(number?.value).toBe("2004/44");
  });

  it("reads a code from the Word file its page links as the text, not the page or its contents", async () => {
    // Held first as the page alone (its link not yet there): a stub of a few words.
    await importSoText(db, "parliamentrso", {
      snapshots,
      pauseMs: 0,
      fetchImpl: stubbed,
      ids: [String(N + 3)],
    });
    expect((await versionsOf(`parliamentrso:${N + 3}`)).map((v) => v.format)).toEqual(["html"]);
    // Held acts are not read again, unless asked for the stubs.
    const skipped = await importSoText(db, "parliamentrso", {
      snapshots,
      pauseMs: 0,
      fetchImpl: parliament,
      ids: [String(N + 3)],
    });
    expect(skipped.stored).toBe(0);
    const report = await importSoText(db, "parliamentrso", {
      snapshots,
      pauseMs: 0,
      fetchImpl: parliament,
      ids: [String(N + 3)],
      stubs: true,
    });
    expect(report.failures).toEqual([]);
    expect(report.fromDocuments).toBe(1);
    const versions = await versionsOf(`parliamentrso:${N + 3}`);
    const served = versions.find((v) => v.format === "doc")!;
    const provisions = await db
      .select({ path: legalProvisions.path, text: legalProvisions.text })
      .from(legalProvisions)
      .where(eq(legalProvisions.versionId, served.id))
      .orderBy(asc(legalProvisions.ord));
    expect(provisions.map((p) => p.path)).toEqual(expect.arrayContaining(["art_1", "art_2"]));
    expect(provisions.find((p) => p.path === "art_2")?.text).toContain("12 процентов");
  });

  const mine = { snapshots, pauseMs: 0, fetchImpl: president, ids: [String(N + 11)] };

  it("dates a decree by the day it is signed, numbers it from its closing lines, and cuts it whole", async () => {
    await registerPresident(db, { snapshots, pauseMs: 0, fetchImpl: president });
    const report = await importSoText(db, "presidentruo", mine);
    expect(report.failures).toEqual([]);
    expect(report.stored).toBe(1);
    const versions = await versionsOf(`presidentruo:${N + 11}`);
    expect(versions).toHaveLength(1);
    expect(String(versions[0]!.from)).toBe("2026-11-06");
    expect(versions[0]).toMatchObject({ basis: "publisher", format: "json" });
    const provisions = await db
      .select({ path: legalProvisions.path })
      .from(legalProvisions)
      .where(eq(legalProvisions.versionId, versions[0]!.id));
    expect(provisions.map((p) => p.path)).toEqual(["text"]);
    const [number] = await db
      .select({ value: legalActIdentifiers.value })
      .from(legalActIdentifiers)
      .innerJoin(legalActVersions, eq(legalActVersions.actId, legalActIdentifiers.actId))
      .where(
        and(eq(legalActIdentifiers.scheme, "act_number"), eq(legalActVersions.id, versions[0]!.id)),
      );
    expect(number?.value).toBe("2026/494");
  });

  it("fetches nothing again for an act it holds", async () => {
    const again = await importSoText(db, "presidentruo", mine);
    expect(again.stored).toBe(0);
    expect(again.alreadyHeld).toBe(1);
  });

  it("writes nothing on a dry run", async () => {
    const before = await versionsOf(`presidentruo:${N + 11}`);
    const report = await importSoText(db, "presidentruo", { ...mine, dryRun: true });
    expect(report.status).toBe("dry_run");
    expect(await versionsOf(`presidentruo:${N + 11}`)).toEqual(before);
  });
});

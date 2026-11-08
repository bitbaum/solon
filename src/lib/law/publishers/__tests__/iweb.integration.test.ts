/**
 * A commune on the i-web CMS, loaded end to end against a real database: the
 * collection's table becomes acts of the commune, each act's current and earlier
 * version are stored with the days its pages state, the earlier one closed the
 * day before the current began, and the act page's view reads the current one
 * back. Runs only with INTEGRATION=1.
 */
import { and, asc, eq, isNull } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { legalActIdentifiers, legalActVersions } from "@/lib/db/law-schema";
import { sources } from "@/lib/db/places-schema";
import type { SnapshotStore } from "@/lib/places/importer/snapshots";
import { tinyPdf } from "../../text/__tests__/tiny-pdf";
import { loadActView } from "../../view";
import { iweb } from "../iweb";
import { loadPublisher } from "../load";

const RUN = process.env.INTEGRATION === "1";
const snapshots: SnapshotStore = {
  put: async (sha) => `memory/${sha}`,
  get: async () => new Uint8Array(),
};

const entities = (rows: unknown[]) =>
  JSON.stringify({ emptyColumns: [], data: rows })
    .replace(/\//g, "\\/")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

describe.skipIf(!RUN)("an i-web collection", () => {
  it("stores each act's versions with the days its pages state", async () => {
    const run = Date.now();
    const origin = "https://www.thun.ch";
    const list = `${origin}/reglemente-${run}`;
    const current = `${origin}/reglemente-${run}/sammlung/1`;
    const earlier = `${origin}/_rtr/information_${run}`;
    const adapter = iweb(
      {
        key: `thun-test-${run}`,
        authority: "bfs942",
        name: "Stadt Thun",
        homepage: `${origin}/`,
        licenceSpdx: "LicenseRef-ch-official-act",
        locale: "de",
        pages: [list],
      },
      0,
    );
    const words = (year: number) =>
      tinyPdf([
        "Art. 1 Geltungsbereich",
        `Dieses Reglement gilt fuer alle Maerkte auf dem Gebiet der Stadt (${run}, ${year}).`,
        "Der Gemeinderat bezeichnet die Marktplaetze und die Markttage.",
        "Art. 2 Bewilligung",
        "Wer einen Marktstand betreiben will, braucht eine Bewilligung der Gewerbepolizei.",
        "Die Bewilligung wird fuer ein Jahr erteilt und kann erneuert werden.",
      ]);
    const pages: Record<string, string | Uint8Array> = {
      [list]: `<table id="icmsTable-rechtssammlungList" data-entities="${entities([
        {
          title: `<a href="/reglemente-${run}/sammlung/1">Marktreglement der Stadt Thun (MR)</a>`,
          _nummer: `930.1-${run}`,
        },
      ])}"></table>`,
      [current]: `<dl class="row"><dt>Nummer</dt><dd>930.1</dd><dt>Inkrafttreten</dt><dd>1. Januar 2006</dd>
        <dt>Vorgängerversion</dt><dd><a href="/_rtr/information_${run}">MR 1990</a></dd></dl>
        <table><tr><td><a href="/_doc/${run}2">Marktreglement</a></td></tr></table>`,
      [earlier]: `<dl class="row"><dt>Inkrafttreten</dt><dd>1. März 1990</dd></dl>
        <table><tr><td><a href="/_doc/${run}1">Marktreglement 1990</a></td></tr></table>`,
      [`${origin}/_doc/${run}1`]: `<a href="/_rtr/dokument_${run}1">Weiter</a>`,
      [`${origin}/_rtr/dokument_${run}1`]: words(1990),
      [`${origin}/_doc/${run}2`]: words(2006),
    };
    const fetchImpl = (async (input: string | URL) => {
      const body = pages[String(input)];
      if (body === undefined) return new Response("not here", { status: 404 });
      return typeof body === "string"
        ? new Response(body, { headers: { "content-type": "text/html" } })
        : new Response(body.slice().buffer, { headers: { "content-type": "application/pdf" } });
    }) as unknown as typeof fetch;

    const report = await loadPublisher(db, adapter, {
      snapshots,
      today: "2026-11-08",
      history: true,
      pauseMs: 0,
      fetchImpl,
    });
    // Acts an earlier run left under the same commune are read again and are not served here.
    expect(report.failures.filter((f) => f.page.includes(String(run)))).toEqual([]);
    expect(report.versionsStored).toBe(2);

    const [identity] = await db
      .select({ actId: legalActIdentifiers.actId })
      .from(legalActIdentifiers)
      .where(
        and(
          eq(legalActIdentifiers.scheme, "official_url"),
          eq(legalActIdentifiers.value, current),
          isNull(legalActIdentifiers.supersededAt),
        ),
      );
    expect(identity).toBeDefined();
    const stored = await db
      .select({
        from: legalActVersions.inForceFrom,
        to: legalActVersions.inForceTo,
        basis: legalActVersions.dateBasis,
        url: sources.url,
      })
      .from(legalActVersions)
      .innerJoin(sources, eq(sources.id, legalActVersions.sourceId))
      .where(eq(legalActVersions.actId, identity!.actId))
      .orderBy(asc(legalActVersions.inForceFrom));
    expect(
      stored.map((v) => [String(v.from), v.to === null ? null : String(v.to), v.basis, v.url]),
    ).toEqual([
      ["1990-03-01", "2005-12-31", "publisher", `${origin}/_rtr/dokument_${run}1`],
      ["2006-01-01", null, "publisher", `${origin}/_doc/${run}2`],
    ]);

    const view = await loadActView(db, { id: identity!.actId, lang: "de", page: 1 });
    expect(view?.officialUrl).toBe(current);
    expect(view?.provisions.length).toBeGreaterThan(0);
  });
});

/**
 * A commune whose site refuses Solon's reader, loaded end to end against a real
 * database: the act keeps the publisher's address as its identity, the version
 * records the Internet Archive's copy as its source, and the act page's view
 * reads it back. Runs only with INTEGRATION=1.
 */
import { and, eq, isNull } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { legalActIdentifiers, legalActVersions } from "@/lib/db/law-schema";
import { sources } from "@/lib/db/places-schema";
import type { SnapshotStore } from "@/lib/places/importer/snapshots";
import { archiveCopyOf } from "../../archive-copy";
import { tinyPdf } from "../../text/__tests__/tiny-pdf";
import { loadActView } from "../../view";
import { linkedDocuments } from "../linked-documents";
import { loadPublisher } from "../load";

const RUN = process.env.INTEGRATION === "1";
const snapshots: SnapshotStore = {
  put: async (sha) => `memory/${sha}`,
  get: async () => new Uint8Array(),
};
const STAMP = "20250314101500";
const BOT_CHECK = "<html><head><title>Bot Verification</title></head><body></body></html>";

describe.skipIf(!RUN)("a refusing publisher, read from the archive", () => {
  it("stores the copy under the publisher's act, with the copy's address and capture day", async () => {
    const run = Date.now();
    const page = `https://www.triesenberg.li/reglemente-${run}/`;
    const pdf = `https://www.triesenberg.li/wp-content/uploads/Wasserreglement-${run}.pdf`;
    const adapter = linkedDocuments({
      key: `triesenberg-test-${run}`,
      authority: "li7004",
      name: "Gemeinde Triesenberg",
      homepage: "https://www.triesenberg.li/",
      licenceSpdx: "LicenseRef-li-official-act",
      pages: [page],
      link: /\/wp-content\/uploads\/([^/?#]+\.pdf)(?:[?#]|$)/i,
      include: /reglement/i,
      exclude: /antrag/i,
    });
    const listing = `<html><body><a href="/wp-content/uploads/Wasserreglement-${run}.pdf">Wasserreglement</a></body></html>`;
    // Enough words for a text layer (pdf-provisions.ts reads fewer than 200 letters by OCR).
    const document = tinyPdf([
      "Art. 1 Zweck",
      `Dieses Reglement regelt die Wasserversorgung der Gemeinde ${run}.`,
      "Die Gemeinde versorgt das Gemeindegebiet mit Trinkwasser und Loeschwasser.",
      "Art. 2 Anschluss",
      "Jedes Gebaeude mit Wasserbedarf ist an das oeffentliche Netz anzuschliessen.",
      "Die Kosten des Anschlusses traegt die Eigentuemerin oder der Eigentuemer.",
    ]);
    const fetchImpl = (async (input: string | URL) => {
      const url = String(input);
      if (url === page || url === pdf) return new Response(BOT_CHECK, { status: 200 });
      if (url.startsWith("https://archive.org/wayback/available?")) {
        const original = new URL(url).searchParams.get("url");
        return Response.json({
          archived_snapshots: {
            closest: { available: true, status: "200", timestamp: STAMP, url: original },
          },
        });
      }
      if (url === `https://web.archive.org/web/${STAMP}id_/${page}`) return new Response(listing);
      if (url === `https://web.archive.org/web/${STAMP}id_/${pdf}`)
        return new Response(document.slice().buffer, {
          headers: { "content-type": "application/pdf" },
        });
      return new Response("not here", { status: 404 });
    }) as unknown as typeof fetch;

    const report = await loadPublisher(db, adapter, {
      snapshots,
      today: "2026-11-08",
      pauseMs: 0,
      fetchImpl,
    });
    expect(report.failures).toEqual([]);
    expect(report.listedFrom).toBe(`https://web.archive.org/web/${STAMP}id_/${page}`);

    const [identity] = await db
      .select({ actId: legalActIdentifiers.actId })
      .from(legalActIdentifiers)
      .where(
        and(
          eq(legalActIdentifiers.scheme, "official_url"),
          eq(legalActIdentifiers.value, pdf),
          isNull(legalActIdentifiers.supersededAt),
        ),
      );
    expect(identity).toBeDefined();
    const [stored] = await db
      .select({ url: sources.url, importer: sources.importerVersion })
      .from(legalActVersions)
      .innerJoin(sources, eq(sources.id, legalActVersions.sourceId))
      .where(eq(legalActVersions.actId, identity!.actId));
    expect(stored).toEqual({
      url: `https://web.archive.org/web/${STAMP}id_/${pdf}`,
      importer: "law-text-publisher-2+archive",
    });

    const view = await loadActView(db, { id: identity!.actId, lang: "de", page: 1 });
    expect(view?.officialUrl).toBe(pdf);
    expect(archiveCopyOf(view?.version?.sourceUrl)).toMatchObject({
      original: pdf,
      capturedOn: "2025-03-14",
    });
    expect(view?.provisions.length).toBeGreaterThan(0);
  });
});

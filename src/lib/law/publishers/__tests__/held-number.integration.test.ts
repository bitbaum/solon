/**
 * A commune's act already held, its document unchanged: the next load still records the number the
 * document prints ("Akte Nr.: 01.01.03"), without a new version. Runs only with INTEGRATION=1.
 *
 * loadPublisher reads every act held under its authority, so this spec has an authority of its own
 * (li7010) that no other spec writes to.
 */
import { and, eq, isNull } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { legalActIdentifiers, legalActVersions } from "@/lib/db/law-schema";
import type { SnapshotStore } from "@/lib/places/importer/snapshots";
import { tinyPdf } from "../../text/__tests__/tiny-pdf";
import { LI_AKTE_NUMBER, linkedDocuments } from "../linked-documents";
import { loadPublisher } from "../load";

const RUN = process.env.INTEGRATION === "1";
const snapshots: SnapshotStore = {
  put: async (sha) => `memory/${sha}`,
  get: async () => new Uint8Array(),
};

describe.skipIf(!RUN)("a held act whose document prints a number", () => {
  it("gets the number on the next load, and no second version", async () => {
    const run = Date.now();
    const page = `https://www.vaduz.li/reglemente-${run}/`;
    const file = `https://www.vaduz.li/download_file/view/${run}`;
    const config = {
      key: `vaduz-test-${run}`,
      authority: "li7010",
      name: "Gemeinde Vaduz",
      homepage: "https://www.vaduz.li/",
      licenceSpdx: "LicenseRef-li-official-act",
      pages: [page],
      link: /\/download_file\/view\/(\d+)/i,
      include: /reglement/i,
      exclude: /antrag/i,
    };
    const pdf = tinyPdf([
      "Wasserreglement der Gemeinde",
      "Akte Nr.: 01.01.03",
      "Art. 1 Zweck",
      `Dieses Reglement regelt die Wasserversorgung der Gemeinde ${run}.`,
      "Die Gemeinde versorgt das Gemeindegebiet mit Trinkwasser und Loeschwasser.",
      "Art. 2 Anschluss",
      "Jedes Gebaeude mit Wasserbedarf ist an das oeffentliche Netz anzuschliessen.",
      "Die Kosten des Anschlusses traegt die Eigentuemerin oder der Eigentuemer.",
    ]);
    const fetchImpl = (async (input: string | URL) => {
      const url = String(input);
      if (url === page)
        return new Response(`<html><body><a href="${file}">Wasserreglement</a></body></html>`);
      if (url === file)
        return new Response(pdf.slice().buffer, { headers: { "content-type": "application/pdf" } });
      return new Response("not here", { status: 404 });
    }) as unknown as typeof fetch;
    const options = {
      snapshots,
      today: new Date().toISOString().slice(0, 10),
      pauseMs: 0,
      fetchImpl,
    };
    const numbersOf = async (actId: string) =>
      (
        await db
          .select({ value: legalActIdentifiers.value })
          .from(legalActIdentifiers)
          .where(
            and(
              eq(legalActIdentifiers.actId, actId),
              eq(legalActIdentifiers.scheme, "systematic_number"),
              isNull(legalActIdentifiers.supersededAt),
            ),
          )
      ).map((r) => r.value);

    // Before: read by an adapter that does not ask the document for a number (what production held).
    await loadPublisher(db, linkedDocuments(config), options);
    const [identity] = await db
      .select({ actId: legalActIdentifiers.actId })
      .from(legalActIdentifiers)
      .where(
        and(eq(legalActIdentifiers.scheme, "official_url"), eq(legalActIdentifiers.value, file)),
      );
    const actId = identity!.actId;
    expect(await numbersOf(actId)).toEqual([]);

    // Now: asked for it; the document is the same bytes.
    const report = await loadPublisher(
      db,
      linkedDocuments({ ...config, documentNumber: LI_AKTE_NUMBER }),
      options,
    );
    expect(report.failures).toEqual([]);
    expect(report.versionsStored).toBe(0);
    expect(await numbersOf(actId)).toEqual(["01.01.03"]);
    expect(
      await db
        .select({ id: legalActVersions.id })
        .from(legalActVersions)
        .where(eq(legalActVersions.actId, actId)),
    ).toHaveLength(1);

    // And again: nothing changes.
    await loadPublisher(
      db,
      linkedDocuments({ ...config, documentNumber: LI_AKTE_NUMBER }),
      options,
    );
    expect(await numbersOf(actId)).toEqual(["01.01.03"]);
  });
});

/**
 * A commune's LexWork collection through the real importer into a real database:
 * every dated version is stored oldest first, the old one ends the day before the
 * new one begins, and a second run stores nothing. Runs only with INTEGRATION=1.
 */
import { and, eq, isNull } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { legalActVersions, legalActs, legalProvisions } from "@/lib/db/law-schema";
import type { SnapshotStore } from "@/lib/places/importer/snapshots";
import { importLexwork } from "../import-lexwork";

const RUN = process.env.INTEGRATION === "1";
const HOST = "baar.tlex.ch";
const snapshots: SnapshotStore = {
  put: async (sha) => `memory/${sha}`,
  get: async () => new Uint8Array(),
};

const tree = (text: string) => ({
  document: {
    content: {
      type: "title",
      children: [
        {
          uid: "t-0--a-1",
          type: "article",
          number: { de: "Art. 1" },
          text: { de: "Zweck" },
          children: [{ type: "paragraph", html_content: { de: `<p>${text}</p>` }, children: [] }],
        },
      ],
    },
  },
});
const act = (selected: number, text: string) => ({
  text_of_law: {
    systematic_number: "9.9-1",
    title: "Testreglement",
    canonical_link: `https://${HOST}/app/de/texts_of_law/9.9-1`,
    abrogated: false,
    current_version: { id: 20, version_dates_str: "Aktuelle Version in Kraft seit: 01.03.2025" },
    old_versions: [
      { id: 10, version_dates_str: "Version in Kraft von: 01.01.2020 bis: 28.02.2025" },
    ],
    future_versions: [],
    selected_version: { id: selected, json_content: tree(text) },
  },
});

const served: Record<string, unknown> = {
  [`https://${HOST}/api/de/texts_of_law/lightweight_index`]: {
    "1": [{ id: 1, systematic_number: "9.9-1", title: "Testreglement", abrogated: false }],
  },
  [`https://${HOST}/api/de/texts_of_law/9.9-1/show_as_json`]: act(20, "Neuer Text."),
  [`https://${HOST}/api/de/texts_of_law/9.9-1/versions/10/show_as_json`]: act(10, "Alter Text."),
};
const fetchImpl = (async (url: string | URL) => {
  const body = served[String(url)];
  return body ? new Response(JSON.stringify(body)) : new Response("", { status: 404 });
}) as unknown as typeof fetch;

describe.skipIf(!RUN)("importLexwork", () => {
  it("stores each dated version, the old ending the day before the new, and nothing on a second run", async () => {
    const options = { snapshots, today: "2026-11-01", host: HOST, pauseMs: 0, fetchImpl };
    const first = await importLexwork(db, options);
    expect(first).toMatchObject({ versionsStored: 2, failures: [] });

    const [row] = await db
      .select({ id: legalActs.id })
      .from(legalActs)
      .where(eq(legalActs.authority, "bfs1701"));
    const versions = await db
      .select()
      .from(legalActVersions)
      .where(eq(legalActVersions.actId, row!.id));
    const byFrom = Object.fromEntries(versions.map((v) => [String(v.inForceFrom), v]));
    expect(Object.keys(byFrom).sort()).toEqual(["2020-01-01", "2025-03-01"]);
    expect(String(byFrom["2020-01-01"]!.inForceTo)).toBe("2025-02-28");
    expect(byFrom["2025-03-01"]!.inForceTo).toBeNull();
    expect(byFrom["2025-03-01"]!.dateBasis).toBe("publisher");

    const open = await db
      .select({ text: legalProvisions.text })
      .from(legalProvisions)
      .innerJoin(legalActVersions, eq(legalActVersions.id, legalProvisions.versionId))
      .where(and(eq(legalActVersions.actId, row!.id), isNull(legalActVersions.inForceTo)));
    expect(open.map((p) => p.text)).toEqual(["Neuer Text."]);

    const second = await importLexwork(db, options);
    expect(second.versionsStored).toBe(0);
  });
});

describe.skipIf(!RUN)("importLexwork with a blank old version", () => {
  it("reports the blank version and still stores the current one", async () => {
    const blankOld = act(10, "");
    blankOld.text_of_law.selected_version.json_content = {
      document: { content: { type: "title", children: [] } },
    } as never;
    const host = "cham.tlex.ch";
    const answers: Record<string, unknown> = {
      [`https://${host}/api/de/texts_of_law/lightweight_index`]: {
        "1": [{ id: 1, systematic_number: "9.9-1", title: "Testreglement", abrogated: false }],
      },
      [`https://${host}/api/de/texts_of_law/9.9-1/show_as_json`]: act(20, "Aktueller Text."),
      [`https://${host}/api/de/texts_of_law/9.9-1/versions/10/show_as_json`]: blankOld,
    };
    const impl = (async (url: string | URL) => {
      const body = answers[String(url)];
      return body ? new Response(JSON.stringify(body)) : new Response("", { status: 404 });
    }) as unknown as typeof fetch;
    const report = await importLexwork(db, {
      snapshots,
      today: "2026-11-01",
      host,
      pauseMs: 0,
      fetchImpl: impl,
    });
    expect(report.failures).toEqual([]);
    expect(report.emptyAtPublisher).toEqual([`${host} 9.9-1 version 10`]);
    expect(report.versionsStored).toBe(1);
  });
});

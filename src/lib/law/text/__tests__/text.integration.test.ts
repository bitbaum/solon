/**
 * The Confederation's text through the real importer into a real database,
 * against a stand-in for Fedlex: versions and articles stored and cited, a
 * rerun that fetches nothing, a newer version that closes the old one, a
 * number two acts share (left alone, not guessed), a page that is not an act
 * (reported), and a limit that resumes.
 *
 * Runs only with INTEGRATION=1 against a migrated database.
 */
import { randomInt } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { legalActVersions } from "@/lib/db/law-schema";
import type { SnapshotStore } from "@/lib/places/importer/snapshots";
import { importLexfindRegister } from "../../register/lexfind";
import { readProvision, searchActs } from "../../register/coverage";
import { importFedlexText } from "../import";
import { importCantonalText } from "../import-cantonal";
import { importLilexText } from "../import-lilex";
import { importRegister } from "../../register/import";
import { liRows, parseSystematicRegister } from "../../register/li-systematic";

const RUN = process.env.INTEGRATION === "1";

const snapshots: SnapshotStore = {
  async put(sha) {
    return `memory/${sha}`;
  },
  async get() {
    throw new Error("not needed here");
  },
};

const base = 900_000_000 + randomInt(1, 50_000_000) * 10;
const N = `t${base}`;
const SR = { a: `${N}.1`, b: `${N}.2`, shared: `${N}.3`, broken: `${N}.4` };

const article = (id: string, heading: string, text: string) =>
  `<article id="${id}"><h6><b>${heading}</b></h6><div><p>${text}</p></div></article>`;
const act = (...articles: string[]) =>
  `<div id="lawcontent"><h1>Titel</h1>${articles.join("")}</div>`;

/** What Fedlex serves, as the test sets it up. */
const store = {
  versions: [] as { eli: string; sr: string; date: string; url: string }[],
  pages: new Map<string, string>(),
  fetched: [] as string[],
};

const fedlex = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = String(input);
  if (url.includes("sparqlendpoint")) {
    return new Response(
      JSON.stringify({
        results: {
          bindings: store.versions.map((v) => ({
            cc: { value: v.eli },
            n: { value: v.sr },
            date: { value: v.date },
            url: { value: v.url },
          })),
        },
      }),
    );
  }
  store.fetched.push(url);
  void init;
  const html = store.pages.get(url);
  return html ? new Response(html) : new Response("gone", { status: 404 });
}) as typeof fetch;

const run = (options: { day: string; limit?: number; dryRun?: boolean }) =>
  importFedlexText(db, { lang: "de", snapshots, fetchImpl: fedlex, pauseMs: 0, ...options });

const reg = (id: number, title: string, number: string) => ({
  id,
  title,
  systematicNumber: number,
  inForce: true,
  categoryId: 4,
});

describe.skipIf(!RUN)("fedlex text import", () => {
  it("is set up: the register holds the stand-in acts", async () => {
    const bytes = new TextEncoder().encode(
      JSON.stringify({
        fetchedAt: "2026-10-23T00:00:00.000Z",
        authorities: [
          {
            code: "CH",
            acts: [
              reg(base + 1, `Erstes ${N}`, SR.a),
              reg(base + 2, `Zweites ${N}`, SR.b),
              reg(base + 3, `Geteiltes ${N}`, SR.shared),
              reg(base + 4, `Kaputtes ${N}`, SR.broken),
            ],
          },
        ],
      }),
    );
    const report = await importLexfindRegister(db, {
      bytes,
      url: "test",
      retrievedAt: new Date(),
      snapshots,
    });
    expect(report.status).toBe("applied");

    store.versions = [
      {
        eli: `https://x/eli/cc/${N}/a`,
        sr: SR.a,
        date: "2020-01-01",
        url: `https://x/${N}/a-2020`,
      },
      {
        eli: `https://x/eli/cc/${N}/b`,
        sr: SR.b,
        date: "2021-05-01",
        url: `https://x/${N}/b-2021`,
      },
      {
        eli: `https://x/eli/cc/${N}/s1`,
        sr: SR.shared,
        date: "2019-01-01",
        url: `https://x/${N}/s1`,
      },
      {
        eli: `https://x/eli/cc/${N}/s2`,
        sr: SR.shared,
        date: "2022-01-01",
        url: `https://x/${N}/s2`,
      },
      {
        eli: `https://x/eli/cc/${N}/c`,
        sr: SR.broken,
        date: "2018-01-01",
        url: `https://x/${N}/c`,
      },
    ];
    store.pages.set(
      `https://x/${N}/a-2020`,
      act(article("art_1", "Art. 1 Alt", "Alter Text."), article("art_2", "Art. 2 Zwei", "Zwei.")),
    );
    store.pages.set(`https://x/${N}/b-2021`, act(article("art_1", "Art. 1 B", "B-Text.")));
    store.pages.set(`https://x/${N}/s1`, act(article("art_1", "Art. 1", "x")));
    store.pages.set(`https://x/${N}/s2`, act(article("art_1", "Art. 1", "y")));
    store.pages.set(`https://x/${N}/c`, "<html>Not an act</html>");
  });

  it("a dry run fetches and parses but stores nothing", async () => {
    const report = await run({ day: "2026-10-23", dryRun: true });
    expect(report.status).toBe("dry_run");
    expect(report.stored).toBeGreaterThanOrEqual(2);
    const [a] = await searchActs(db, { authority: "ch", number: SR.a });
    const held = await db.select().from(legalActVersions).where(eq(legalActVersions.actId, a!.id));
    expect(held).toEqual([]);
  });

  it("stores the version in force, with its articles, cited to the publisher's page and hash", async () => {
    const report = await run({ day: "2026-10-23" });
    expect(report.failures.map((f) => f.sr)).toEqual([SR.broken]);
    expect(report.failures[0]!.reason).toContain("no articles");
    expect(report.ambiguous).toContain(SR.shared);

    const [a] = await searchActs(db, { authority: "ch", number: SR.a });
    const provision = await readProvision(db, {
      actId: a!.id,
      path: "art_1",
      lang: "de",
      on: "2026-10-23",
    });
    expect(provision).toMatchObject({
      heading: "Art. 1 Alt",
      text: "Alter Text.",
      inForceFrom: "2020-01-01",
      inForceTo: null,
      status: "consolidated",
      dateBasis: "publisher",
      sourceUrl: `https://x/${N}/a-2020`,
    });
    expect(provision!.contentSha256).toMatch(/^[0-9a-f]{64}$/);

    // The shared number is left alone: no version for either act that shares it.
    const [shared] = await searchActs(db, { authority: "ch", number: SR.shared });
    expect(
      await readProvision(db, { actId: shared!.id, path: "art_1", lang: "de", on: "2026-10-23" }),
    ).toBeNull();
  });

  it("a rerun on the same day fetches nothing it already holds", async () => {
    store.fetched.length = 0;
    const report = await run({ day: "2026-10-23" });
    expect(report.alreadyHeld).toBeGreaterThanOrEqual(2);
    expect(store.fetched.filter((u) => u.includes(`/${N}/a-`) || u.includes(`/${N}/b-`))).toEqual(
      [],
    );
  });

  it("a newer version closes the old one the day before, and both can be read by date", async () => {
    store.versions = store.versions.map((v) =>
      v.sr === SR.a ? { ...v, date: "2025-03-01", url: `https://x/${N}/a-2025` } : v,
    );
    store.pages.set(`https://x/${N}/a-2025`, act(article("art_1", "Art. 1 Neu", "Neuer Text.")));
    const report = await run({ day: "2026-10-23" });
    expect(report.stored).toBe(1);

    const [a] = await searchActs(db, { authority: "ch", number: SR.a });
    const now = await readProvision(db, {
      actId: a!.id,
      path: "art_1",
      lang: "de",
      on: "2026-10-23",
    });
    const before = await readProvision(db, {
      actId: a!.id,
      path: "art_1",
      lang: "de",
      on: "2024-06-01",
    });
    expect(now).toMatchObject({ text: "Neuer Text.", inForceFrom: "2025-03-01", inForceTo: null });
    expect(before).toMatchObject({
      text: "Alter Text.",
      inForceFrom: "2020-01-01",
      inForceTo: "2025-02-28",
    });
    expect(
      await readProvision(db, { actId: a!.id, path: "art_1", lang: "de", on: "2019-01-01" }),
    ).toBeNull();
  });

  it("a limit stops early, reports what remains, and the next run continues from there", async () => {
    const bytes = new TextEncoder().encode(
      JSON.stringify({
        fetchedAt: "2026-10-23T00:00:00.000Z",
        authorities: [
          {
            code: "CH",
            acts: [
              reg(base + 5, `Fuenftes ${N}`, `${N}.5`),
              reg(base + 6, `Sechstes ${N}`, `${N}.6`),
            ],
          },
        ],
      }),
    );
    await importLexfindRegister(db, {
      bytes,
      url: "test",
      retrievedAt: new Date(),
      snapshots,
    });
    for (const n of [5, 6]) {
      store.versions.push({
        eli: `https://x/eli/cc/${N}/${n}`,
        sr: `${N}.${n}`,
        date: "2023-01-01",
        url: `https://x/${N}/${n}`,
      });
      store.pages.set(`https://x/${N}/${n}`, act(article("art_1", "Art. 1", `Text ${n}.`)));
    }
    const first = await run({ day: "2026-10-23", limit: 1 });
    expect(first).toMatchObject({ stored: 1, remaining: 1 });
    const second = await run({ day: "2026-10-23", limit: 1 });
    expect(second).toMatchObject({ stored: 1, remaining: 0 });
  });
});

describe.skipIf(!RUN)("lilex text import", () => {
  const lr = `998.${base}`;
  const issue = (base % 800) + 100;
  const actPage = `<div class="htit1">Gesetz</div><div class="art"><a name="art:1"></a>Art. 1<div class="sacht">Zweck</div><div class="abs">Text.</div></div>`;
  const serving = (body: string) => (async () => new Response(body)) as unknown as typeof fetch;
  const read = (fetchImpl: typeof fetch) =>
    importLilexText(db, { snapshots, today: "2026-10-23", lr, pauseMs: 0, fetchImpl });

  it("is set up: the register holds the act, named by LR number with its issue", async () => {
    const line = `${lr} G vom 17. September 2008 über etwas ........ 2008 ${issue}`;
    const report = await importRegister(db, {
      register: {
        key: "li-systematic-register",
        licenceSpdx: "LicenseRef-li-official-act",
        identityScheme: "li_lr",
      },
      bytes: new TextEncoder().encode(line),
      url: "test",
      retrievedAt: new Date(),
      snapshots,
      read: () => liRows(parseSystematicRegister([line])),
    });
    expect(report.counts.actsInserted).toBe(1);
  });

  it("stops at the proof-of-work page and stores nothing", async () => {
    const report = await read(serving("<script>array_to_hex_string()</script>"));
    expect(report.stoppedByChallenge).toBe(true);
    expect(report.stored).toBe(0);
  });

  it("reports a page that is not an act, and does not store it", async () => {
    const report = await read(serving("<html>Nicht gefunden</html>"));
    expect(report.failures).toEqual([{ lr, reason: "no act at that page" }]);
    expect(report.stored).toBe(0);
  });

  it("stores the act dated by the day it was read, cited to Lilex's page and hash", async () => {
    const report = await read(serving(actPage));
    expect(report).toMatchObject({ stored: 1, provisions: 1, failures: [] });
    const [act] = await searchActs(db, { authority: "li", number: lr });
    const provision = await readProvision(db, {
      actId: act!.id,
      path: "art_1",
      lang: "de",
      on: "2026-10-23",
    });
    expect(provision).toMatchObject({
      heading: "Art. 1 Zweck",
      text: "Text.",
      inForceFrom: "2026-10-23",
      dateBasis: "retrieved",
      status: "consolidated",
      sourceUrl: `https://www.gesetze.li/konso/html/2008${String(issue).padStart(3, "0")}000`,
    });
    expect(provision!.contentSha256).toMatch(/^[0-9a-f]{64}$/);
    const [version] = await db
      .select({ basis: legalActVersions.dateBasis })
      .from(legalActVersions)
      .where(eq(legalActVersions.actId, act!.id));
    expect(version!.basis).toBe("retrieved");
  });

  it("does not read an act it already holds", async () => {
    const report = await read(serving("must not be fetched"));
    expect(report.wanted).toBe(0);
  });
});

describe.skipIf(!RUN)("cantonal text import", () => {
  const html = (n: number) =>
    `<div>Zweck</div><div>Art. 1 Dieses Gesetz regelt ${n}.</div><div>Geltung</div><div>Art. 2 Es gilt überall.</div>`;
  const serving = (body: string, type = "text/html") =>
    (async () =>
      new Response(body, { headers: { "content-type": type } })) as unknown as typeof fetch;
  const lexfindId = base + 7;
  const run = (fetchImpl: typeof fetch, extra: { dryRun?: boolean } = {}) =>
    importCantonalText(db, {
      snapshots,
      today: "2026-10-23",
      authority: "gl",
      pauseMs: 0,
      minFreeBytes: 0,
      fetchImpl,
      ...extra,
    });

  it("is set up: a Glarus act in the register", async () => {
    const bytes = new TextEncoder().encode(
      JSON.stringify({
        fetchedAt: "2026-10-23T00:00:00.000Z",
        authorities: [{ code: "GL", acts: [reg(lexfindId, `Glarner Gesetz ${N}`, `${N}.gl`)] }],
      }),
    );
    const report = await importLexfindRegister(db, {
      bytes,
      url: "test",
      retrievedAt: new Date(),
      snapshots,
    });
    expect(report.counts.actsInserted).toBe(1);
  });

  it("a dry run reads and cuts the document but stores nothing", async () => {
    const report = await run(serving(html(1)), { dryRun: true });
    expect(report.status).toBe("dry_run");
    expect(report.stored).toBeGreaterThanOrEqual(1);
    const [act] = await searchActs(db, { authority: "gl", number: `${N}.gl` });
    expect(
      await db.select().from(legalActVersions).where(eq(legalActVersions.actId, act!.id)),
    ).toEqual([]);
  });

  it("stores the act's articles, dated by the day it was read, cited to the document and its hash", async () => {
    const report = await run(serving(html(2)));
    expect(report.failures).toEqual([]);
    expect(report.stored).toBeGreaterThanOrEqual(1);
    const [act] = await searchActs(db, { authority: "gl", number: `${N}.gl` });
    const provision = await readProvision(db, {
      actId: act!.id,
      path: "art_2",
      lang: "de",
      on: "2026-10-23",
    });
    expect(provision).toMatchObject({
      text: "Es gilt überall.",
      inForceFrom: "2026-10-23",
      sourceUrl: `https://www.lexfind.ch/tol/${lexfindId}/de`,
    });
    expect(provision!.contentSha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("does not read an act it already holds", async () => {
    const report = await run(serving("must not be used"));
    expect(report.stored).toBe(0);
  });

  it("refuses to start with too little room for the snapshots", async () => {
    const report = await importCantonalText(db, {
      snapshots,
      today: "2026-10-23",
      authority: "gl",
      pauseMs: 0,
      minFreeBytes: Number.MAX_SAFE_INTEGER,
      fetchImpl: serving(html(3)),
    });
    expect(report.refusedForSpace).toBe(true);
    expect(report.stored).toBe(0);
  });
});

/**
 * South Ossetia's registers through the real importer into a real database,
 * against stand-ins for the Parliament's listings and the President's API
 * built from the pages read on 2026-11-10: acts registered under the authority
 * `rso` with the publisher's page, a rerun that adds nothing, a retitled act
 * superseded, a dry run that writes nothing, and an act listed under two
 * categories registered once.
 *
 * Runs only with INTEGRATION=1 against a migrated database.
 */
import { randomInt } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { legalActIdentifiers, legalActNames, legalActs } from "@/lib/db/law-schema";
import type { SnapshotStore } from "@/lib/places/importer/snapshots";
import { registerParliament, registerPresident } from "../import-so-registers";

const RUN = process.env.INTEGRATION === "1";
const snapshots: SnapshotStore = {
  async put(sha) {
    return `memory/${sha}`;
  },
  async get() {
    throw new Error("not needed here");
  },
};

/** Node and post numbers no real act has, new on every run. */
const N = randomInt(800_000_000, 899_000_000);

const row = (id: number, title: string) =>
  `<div class="views-row views-row-1"><div class="views-field views-field-title"><h3 class="field-content"><a href="/node/${id}">${title}</a></h3></div>
<div class="views-field views-field-created"><span class="field-content">воскресенье, 25/10/26</span></div></div>`;
const page = (...rows: string[]) =>
  `<html><body><a href="/node/1">menu</a><div class="view-content">${rows.join("")}</div></body></html>`;

/** The Parliament: law listings of two pages, one constitutional law, an empty resolutions listing. */
function parliament(titleOfFirst: string): typeof fetch {
  const listings: Record<string, string> = {
    "2:0": page(row(N + 1, titleOfFirst), row(N + 2, "Закон РЮО «Об общественных объединениях»")),
    "2:1": page(row(N + 3, "Закон РЮО «О торгово-промышленных палатах»")),
    "2:2": page(),
    "1:0": page(row(N + 4, "Конституционный закон РЮО «О Правительстве»")),
    "1:1": page(),
    "16:0": page(),
  };
  return async (input) => {
    const m = /term\/(\d+)\?page=(\d+)/.exec(String(input));
    const html = m ? listings[`${m[1]}:${m[2]}`] : undefined;
    return html === undefined ? new Response("", { status: 404 }) : new Response(html);
  };
}

/**
 * The President: category 7 (decrees), 5 (documents) and 6 (treaties) share posts as the live API
 * does, one decree has the bare title "Указ", and a single post's page serves the decree's text.
 */
function president(): typeof fetch {
  const post = (id: number, title: string) => ({
    id,
    date: "2026-11-06T18:33:10",
    link: `https://presidentruo.org/ukaz-${id}/`,
    title: { rendered: title },
  });
  const treaty = post(N + 14, "Договор об углублении союзнического взаимодействия");
  const byCategory: Record<string, unknown[]> = {
    "7": [
      post(N + 11, "Указ «О членах Центральной избирательной комиссии»"),
      post(N + 12, "Указ «О Министре»"),
      post(N + 15, "Указ"),
    ],
    "5": [post(N + 12, "Указ «О Министре»"), treaty],
    "6": [post(N + 13, "Договор о дружбе и сотрудничестве"), treaty],
    "14": [],
  };
  return async (input) => {
    const url = String(input);
    const single = new RegExp(`/posts/${N + 15}\\?`).exec(url);
    if (single) {
      return Response.json({
        ...post(N + 15, "Указ"),
        content: {
          rendered:
            "<p>постановляю:</p><p>1. Назначить.</p><p>Президент Республики Южная Осетия А. БИБИЛОВ</p><p>г. Цхинвал, 27 апреля 2021 г.</p>",
        },
      });
    }
    const m = /categories=(\d+)&per_page=100&page=(\d+)/.exec(url);
    const list = m ? byCategory[m[1]!] : undefined;
    if (!list) return new Response("", { status: 404 });
    if (Number(m![2]) > 1) {
      return Response.json({ code: "rest_post_invalid_page_number" }, { status: 400 });
    }
    return Response.json(list, { headers: { "x-wp-totalpages": "1" } });
  };
}

async function actsOf(prefix: string) {
  return db
    .select({
      kind: legalActs.kind,
      authority: legalActs.authority,
      identity: legalActIdentifiers.value,
    })
    .from(legalActs)
    .innerJoin(
      legalActIdentifiers,
      and(
        eq(legalActIdentifiers.actId, legalActs.id),
        eq(legalActIdentifiers.scheme, "publisher_ref"),
      ),
    )
    .where(eq(legalActs.authority, "rso"))
    .then((rows) => rows.filter((r) => r.identity.startsWith(prefix)));
}

describe.skipIf(!RUN)("South Ossetia's registers (real database)", () => {
  it("registers the Parliament's acts with their pages, kinds from their listing, and reruns to nothing", async () => {
    const options = {
      snapshots,
      pauseMs: 0,
      fetchImpl: parliament("Закон РЮО «О местном самоуправлении»"),
    };
    const first = await registerParliament(db, options);
    expect(first.register.status).toBe("applied");
    expect(first.register.problems).toEqual([]);
    const mine = (await actsOf("parliamentrso:")).filter((a) =>
      a.identity.startsWith(`parliamentrso:${String(N).slice(0, 3)}`),
    );
    expect(mine.map((a) => [a.identity, a.kind]).sort()).toEqual(
      [
        [`parliamentrso:${N + 1}`, "statute"],
        [`parliamentrso:${N + 2}`, "statute"],
        [`parliamentrso:${N + 3}`, "statute"],
        [`parliamentrso:${N + 4}`, "statute"],
      ].sort(),
    );
    const [official] = await db
      .select({ value: legalActIdentifiers.value })
      .from(legalActIdentifiers)
      .where(
        and(
          eq(legalActIdentifiers.scheme, "official_url"),
          eq(legalActIdentifiers.value, `https://parliamentrso.org/node/${N + 1}`),
        ),
      );
    expect(official).toBeDefined();

    const flags = await db
      .select({ inForce: legalActs.inForce, statusStated: legalActs.statusStated })
      .from(legalActs)
      .innerJoin(legalActIdentifiers, eq(legalActIdentifiers.actId, legalActs.id))
      .where(eq(legalActIdentifiers.value, `parliamentrso:${N + 1}`));
    // Neither publisher says whether an act is in force: the register must not claim it.
    expect(flags).toEqual([{ inForce: true, statusStated: false }]);

    const again = await registerParliament(db, options);
    expect(again.register.counts.actsInserted).toBe(0);
    expect(again.register.counts.namesInserted).toBe(0);
  });

  it("supersedes a retitled act's name and keeps the act", async () => {
    await registerParliament(db, {
      snapshots,
      pauseMs: 0,
      fetchImpl: parliament("Закон РЮО «О местном самоуправлении (новая редакция)»"),
    });
    const names = await db
      .select({ name: legalActNames.text, superseded: legalActNames.supersededAt })
      .from(legalActNames)
      .innerJoin(legalActIdentifiers, eq(legalActIdentifiers.actId, legalActNames.actId))
      .where(eq(legalActIdentifiers.value, `parliamentrso:${N + 1}`));
    expect(names.filter((n) => n.superseded === null).map((n) => n.name)).toEqual([
      "Закон РЮО «О местном самоуправлении (новая редакция)»",
    ]);
    expect(names).toHaveLength(2);
  });

  it("registers an act listed under several categories once, a treaty as a treaty, and names a bare-titled decree from its own text", async () => {
    const report = await registerPresident(db, { snapshots, pauseMs: 0, fetchImpl: president() });
    expect(report.register.status).toBe("applied");
    const mine = await actsOf("presidentruo:");
    const ids = [11, 12, 13, 14, 15].map((d) => `presidentruo:${N + d}`);
    const ours = mine.filter((a) => ids.includes(a.identity));
    expect(ours.map((a) => [a.identity, a.kind]).sort()).toEqual(
      [
        [`presidentruo:${N + 11}`, "decree"],
        [`presidentruo:${N + 12}`, "decree"],
        [`presidentruo:${N + 13}`, "treaty"],
        // Listed under "Документы" and "Договоры": the more specific category decides.
        [`presidentruo:${N + 14}`, "treaty"],
        [`presidentruo:${N + 15}`, "decree"],
      ].sort(),
    );
    const [named] = await db
      .select({ text: legalActNames.text, derived: legalActNames.derived })
      .from(legalActNames)
      .innerJoin(legalActIdentifiers, eq(legalActIdentifiers.actId, legalActNames.actId))
      .where(eq(legalActIdentifiers.value, `presidentruo:${N + 15}`));
    expect(named).toEqual({ text: "Указ от 27 апреля 2021 г.", derived: true });
    const [own] = await db
      .select({ derived: legalActNames.derived })
      .from(legalActNames)
      .innerJoin(legalActIdentifiers, eq(legalActIdentifiers.actId, legalActNames.actId))
      .where(eq(legalActIdentifiers.value, `presidentruo:${N + 11}`));
    expect(own).toEqual({ derived: false });
  });

  it("writes nothing on a dry run", async () => {
    const before = (await actsOf("parliamentrso:")).length;
    const report = await registerParliament(db, {
      snapshots,
      pauseMs: 0,
      dryRun: true,
      fetchImpl: parliament("Закон РЮО «Новый закон»"),
    });
    expect(report.register.status).toBe("dry_run");
    expect((await actsOf("parliamentrso:")).length).toBe(before);
  });
});

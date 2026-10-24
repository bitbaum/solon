/**
 * The Amtliche Sammlung of the City of Zürich (stadt-zuerich.ch/as): the
 * city's own collection of its ordinances, regulations and guidelines since
 * 1893, as PDFs since 2002.
 *
 * Its pages state what the register-based readers must guess: for each version
 * the day it was decided, the day it took effect and the day it ended, and the
 * PDF; and each act lists its other versions. The page's tables are embedded as
 * JSON in an HTML attribute (`<stzh-datatable rows="…">`), read here and nowhere else.
 */
import { decodeEntities } from "../text/html-text";
import { getBytes, getText } from "./http";
import type { DocumentRef, ListedAct, PublisherAdapter, VersionRef } from "./types";

const HOST = "www.stadt-zuerich.ch";
const BASE = `https://${HOST}`;
const SECTION = "/de/politik-und-verwaltung/politik-und-recht/amtliche-sammlung";
const HOSTS = [HOST] as const;

type Cell = { id: string; value: string; isHeader: boolean };

/** The tables of a page, each a list of rows of cells. */
export function dataTables(html: string): Cell[][][] {
  const tables: Cell[][][] = [];
  for (const m of html.matchAll(/<stzh-datatable[^>]*?\srows="([^"]*)"/g)) {
    try {
      tables.push(JSON.parse(decodeEntities(m[1]!)) as Cell[][]);
    } catch {
      // not a table of this shape
    }
  }
  return tables;
}

/** 30.06.2026 → 2026-06-30; null for an empty cell. */
export function isoDay(value: string): string | null {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value.trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

const text = (cell: string): string =>
  decodeEntities(cell.replace(/<br\s*\/?>/g, " ").replace(/<[^>]+>/g, ""))
    .replace(/\s+/g, " ")
    .trim();

const hrefOf = (cell: string): string | null => /href="([^"]+)"/.exec(cell)?.[1] ?? null;

const absolute = (href: string): string => new URL(href, BASE).toString();

/** The chapter pages the index links, and the act pages each chapter links. */
export function chapterLinks(indexHtml: string): string[] {
  return [
    ...new Set(
      [...indexHtml.matchAll(new RegExp(`href="(${SECTION}/\\d/\\d+\\.html)"`, "g"))].map(
        (m) => m[1]!,
      ),
    ),
  ].sort();
}

export function actLinks(chapterHtml: string): string[] {
  return [
    ...new Set(
      [...chapterHtml.matchAll(new RegExp(`href="(${SECTION}/\\d/\\d+/[^"]+\\.html)"`, "g"))].map(
        (m) => m[1]!,
      ),
    ),
  ].sort();
}

/** The act's own table: number, title and the dates and file of the version it shows. */
export function readActPage(html: string): {
  ref: string;
  title: string;
  versionPage: string | null;
  inForceFrom: string | null;
  inForceTo: string | null;
  pdf: string | null;
} | null {
  const rows = dataTables(html).find((table) =>
    table.some((row) => row.some((cell) => cell.id === "ASZ")),
  );
  if (!rows) return null;
  const value = (id: string): string =>
    rows.flat().find((cell) => cell.id === id && !cell.isHeader)?.value ?? "";
  const titleCell = value("title");
  return {
    ref: value("ASZ").trim(),
    title:
      text(titleCell)
        .split(/\s+vom\s+|\s+Gemeindebeschluss\s+/)[0]!
        .trim() || text(titleCell),
    versionPage: hrefOf(titleCell),
    inForceFrom: isoDay(value("inkrafttretendatum")),
    inForceTo: isoDay(value("ausserkrafttretendatum")),
    pdf: hrefOf(value("rechtstexte")),
  };
}

/** The other versions an act page lists: number, title link, from, to. */
export function otherVersions(html: string): VersionRef[] {
  const out: VersionRef[] = [];
  const at = html.indexOf('id="andere_versionen"');
  if (at < 0) return out;
  const table = dataTables(html.slice(at))[0] ?? [];
  for (const row of table) {
    const href = hrefOf(row[1]?.value ?? "");
    const from = isoDay(row[2]?.value ?? "");
    if (!href || !from) continue;
    out.push({
      inForceFrom: from,
      inForceTo: isoDay(row[3]?.value ?? ""),
      pageUrl: absolute(href),
    });
  }
  return out;
}

const KINDS: [RegExp, ListedAct["kind"]][] = [
  [/^Gemeindeordnung|^Verfassung/i, "constitution"],
  [/verordnung/i, "ordinance"],
  [/beschluss/i, "decree"],
  [/reglement|richtlinie|satzung|statut/i, "regulation"],
];
export const kindOf = (title: string): ListedAct["kind"] =>
  KINDS.find(([pattern]) => pattern.test(title))?.[1] ?? "other";

export const zurichCity: PublisherAdapter = {
  key: "zurich-city",
  authority: "bfs261",
  name: "Stadt Zürich, Amtliche Sammlung",
  homepage: `${BASE}/as`,
  licenceSpdx: "LicenseRef-ch-official-act",
  textStatus: "consolidated",
  locale: "de",

  async list(doFetch) {
    const url = `${BASE}/as`;
    const bytes = await getBytes(url, doFetch, HOSTS);
    const acts = new Map<string, ListedAct>();
    for (const chapter of chapterLinks(new TextDecoder().decode(bytes))) {
      const links = actLinks(await getText(BASE + chapter, doFetch, HOSTS));
      await new Promise((resolve) => setTimeout(resolve, 500));
      for (const link of links) {
        const page = readActPage(await getText(BASE + link, doFetch, HOSTS));
        await new Promise((resolve) => setTimeout(resolve, 500));
        if (!page || !page.ref) continue;
        acts.set(page.ref, {
          ref: page.ref,
          title: page.title,
          kind: kindOf(page.title),
          pageUrl: BASE + link,
        });
      }
    }
    return { bytes, url, acts: [...acts.values()] };
  },

  async versions(pageUrl, doFetch) {
    const html = await getText(pageUrl, doFetch, HOSTS);
    const page = readActPage(html);
    const current: VersionRef[] =
      page?.inForceFrom && page.versionPage
        ? [
            {
              inForceFrom: page.inForceFrom,
              inForceTo: page.inForceTo,
              pageUrl: absolute(page.versionPage),
            },
          ]
        : [];
    return oneOfEachDay([...current, ...otherVersions(html)]);
  },

  async document(version, doFetch): Promise<DocumentRef | null> {
    const page = readActPage(await getText(version.pageUrl, doFetch, HOSTS));
    return page?.pdf ? { url: absolute(page.pdf), format: "pdf" } : null;
  },
};

/**
 * Oldest first, one version per first day. The city's oldest versions overlap
 * and repeat a first day; of those the one that ran longest is kept.
 */
export function oneOfEachDay(versions: readonly VersionRef[]): VersionRef[] {
  const byDay = new Map<string, VersionRef>();
  for (const v of versions) {
    const seen = byDay.get(v.inForceFrom);
    if (
      !seen ||
      (seen.inForceTo !== null && (v.inForceTo === null || v.inForceTo > seen.inForceTo))
    ) {
      byDay.set(v.inForceFrom, v);
    }
  }
  return [...byDay.values()].sort((a, b) => a.inForceFrom.localeCompare(b.inForceFrom));
}

/**
 * A commune whose site runs on the i-web CMS (Innovative Web AG), whose legal
 * collection module many Swiss communes use under their own page names
 * ("Rechtssammlung", "Reglemente und Verordnungen", "Gesetzessammlung",
 * "Règlements"). One adapter for all of them; what differs is config: the page
 * that holds the collection and which of its links lead to more of it.
 *
 * What the module serves, the same on every site:
 *
 *   list     a table whose rows are JSON in its `data-entities` attribute,
 *            each row an act: its link (`title`), its number (`_nummer`), and
 *            often the day it took effect (`_rechtsgueltigkeit-sort`, ISO)
 *   an act   a page whose `<dl>` names its number, the day it was enacted and
 *            the day it took effect ("Inkrafttreten", "Entrée en vigueur"),
 *            when it stopped applying ("Gültig bis"), and links to its earlier
 *            version ("Vorgängerversion"); its documents are `/_doc/<id>` or
 *            `/_docn/<id>/<file>` links in a table
 *   history  an earlier version's document may answer first with a notice
 *            that it is no longer in force, whose link `/_rtr/dokument_<id>`
 *            serves the file itself
 *
 * The shape is read from two public readers of i-web sites: OneGov Cloud's
 * importer of Horw's Gesetzessammlung (onegov.org.horw_laws) and vigie-vaud's
 * reader of i-web council pages, which keeps real captures of them. Not one of
 * the cities configured below could be opened from the sandbox this reader was
 * written in, so their first run on Solon's server is also its first live read.
 */
import type { ActKind } from "@/lib/config/law";
import { originalOf } from "../archive-copy";
import { decodeEntities } from "../text/html-text";
import { read } from "./http";
import type { DocumentRef, ListedAct, PublisherAdapter, VersionRef } from "./types";

export interface IwebConfig {
  key: string;
  authority: string;
  name: string;
  homepage: string;
  licenceSpdx: string;
  locale: "de" | "fr";
  /** The pages that hold the collection's table. */
  pages: readonly string[];
  /** Links on those pages, on the same host, to open once for more of the table (chapters, categories). */
  follow?: RegExp;
}

type Row = Record<string, unknown>;

/** Every row of every `data-entities` table on a page. */
export function tableRows(html: string): Row[] {
  const rows: Row[] = [];
  for (const m of html.matchAll(/\bdata-entities=(["'])([\s\S]*?)\1/g)) {
    try {
      const parsed = JSON.parse(decodeEntities(m[2]!)) as { data?: unknown };
      if (Array.isArray(parsed.data)) rows.push(...(parsed.data as Row[]));
    } catch {
      // a table of another shape
    }
  }
  return rows;
}

const words = (html: string): string =>
  decodeEntities(html.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " "))
    .replace(/ /g, " ")
    .replace(/\s+/g, " ")
    .trim();

const hrefOf = (html: string): string | null =>
  /<a\b[^>]*?\bhref=(["'])(.*?)\1/i.exec(html)?.[2] ?? null;

const absolute = (href: string, base: string): string =>
  originalOf(new URL(decodeEntities(href), base).toString());

/** What a commune's collection calls a form or a notice rather than an act ("Gesuchsformular": German compounds too). */
const FORM =
  /formular|merkblatt|checkliste|\b(?:antrag|gesuch|anmeldung|demande|inscription|aide-mémoire)\b/i;

const KINDS: [RegExp, ActKind][] = [
  [/^(?:gemeindeordnung|gemeindeverfassung|stadtverfassung|verfassung)\b/i, "constitution"],
  [
    /^r[èe]glement communal d.organisation|^r[èe]glement g[ée]n[ée]ral de la commune/i,
    "constitution",
  ],
  [/verordnung|^ordonnance/i, "ordinance"],
  [/beschluss|^arr[êe]t[ée]|^d[ée]cision/i, "decree"],
  [
    /reglement|richtlinie|satzung|statut|ordnung|gesetz|^r[èe]glement|^directive|^tarif/i,
    "regulation",
  ],
];
export const kindOf = (title: string): ActKind =>
  KINDS.find(([pattern]) => pattern.test(title))?.[1] ?? "communal_act";

const iso = (y: string, m: number, d: string) =>
  `${y}-${String(m).padStart(2, "0")}-${d.padStart(2, "0")}`;

const MONTHS: Record<string, number> = {
  januar: 1,
  janvier: 1,
  februar: 2,
  février: 2,
  fevrier: 2,
  märz: 3,
  maerz: 3,
  mars: 3,
  april: 4,
  avril: 4,
  mai: 5,
  juni: 6,
  juin: 6,
  juli: 7,
  juillet: 7,
  august: 8,
  août: 8,
  aout: 8,
  september: 9,
  septembre: 9,
  oktober: 10,
  octobre: 10,
  november: 11,
  novembre: 11,
  dezember: 12,
  décembre: 12,
  decembre: 12,
};

/** "1. September 2024", "1er septembre 2024", "01.09.2024" or "2024-09-01" → 2024-09-01; else null. */
export function dayOf(text: string): string | null {
  const t = text.trim().toLowerCase();
  let m = /(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(t);
  if (m) return iso(m[3]!, Number(m[2]), m[1]!);
  m = /(\d{1,2})(?:\.|er)?\s+([a-zäéû]+)\s+(\d{4})/.exec(t);
  if (m && MONTHS[m[2]!]) return iso(m[3]!, MONTHS[m[2]!]!, m[1]!);
  return null;
}

/** The acts among a collection's rows: one per number, titled by its link, forms left out. */
export function actsOfRows(rows: readonly Row[], base: string): ListedAct[] {
  const acts = new Map<string, ListedAct>();
  for (const row of rows) {
    // German sites name the column title or name; others (Sion) another: the cell holding the act's link.
    const cell = String(
      row.title ??
        row.name ??
        Object.values(row).find((v) => typeof v === "string" && /\bhref=/.test(v)) ??
        "",
    );
    const href = hrefOf(cell);
    const title = words(cell);
    if (!href || !title || FORM.test(title)) continue;
    const pageUrl = absolute(href, base);
    // The collection's number names the act across its versions; a row without one is named by its page.
    const number = words(String(row._nummer ?? row.nummer ?? ""));
    const ref = number || (/(\d+)\/?$/.exec(new URL(pageUrl).pathname)?.[1] ?? pageUrl);
    if (acts.has(ref)) continue;
    acts.set(ref, { ref, title, kind: kindOf(title), pageUrl });
  }
  return [...acts.values()];
}

/**
 * The acts a page links to without a table (Sion's `/reglements` lists them as
 * links): every link whose address is the page's own followed by an act's id,
 * `<page>/<id>` or `<page>/sammlung/<id>`, titled by its words.
 */
export function actsOfLinks(html: string, base: string): ListedAct[] {
  const root = new URL(base).pathname.replace(/\/$/, "");
  const own = new RegExp(`^${root.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/(?:sammlung/)?(\\d+)/?$`);
  const acts = new Map<string, ListedAct>();
  for (const m of html.matchAll(/<a\b[^>]*\bhref=(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi)) {
    let pageUrl: string;
    try {
      pageUrl = absolute(decodeEntities(m[2]!), base);
    } catch {
      continue;
    }
    const url = new URL(pageUrl);
    // i-web also serves a collection's acts as publications: /_rte/publikation/<id>.
    const id =
      own.exec(url.pathname)?.[1] ?? /^\/_rte\/publikation\/(\d+)\/?$/.exec(url.pathname)?.[1];
    const title = words(m[3]!);
    if (!id || !title || FORM.test(title) || url.hostname !== new URL(base).hostname) continue;
    if (!acts.has(id))
      acts.set(id, { ref: id, title, kind: kindOf(title), pageUrl: url.toString() });
  }
  return [...acts.values()];
}

/** An act page's facts: each `<dt>` with its `<dd>`, as words and as the HTML it holds. */
export function factsOf(html: string): { label: string; text: string; html: string }[] {
  return [...html.matchAll(/<dt\b[^>]*>([\s\S]*?)<\/dt>\s*<dd\b[^>]*>([\s\S]*?)<\/dd>/gi)].map(
    (m) => ({ label: words(m[1]!), text: words(m[2]!), html: m[2]! }),
  );
}

const STARTS =
  /^(?:inkrafttreten|in kraft seit|gültig ab|rechtsgültig ab|entrée en vigueur|en vigueur dès|valable dès)/i;
const ENDS = /^(?:gültig bis|ausser kraft|aufgehoben|abrogé|abrogation|valable jusqu)/i;
const EARLIER =
  /^(?:vorgängerversion|frühere version|alte version|version précédente|ancienne version)/i;

/** One version as its page states it: from, to, and the pages of the versions before it. */
export function readVersionPage(
  html: string,
  pageUrl: string,
): { inForceFrom: string | null; inForceTo: string | null; earlier: string[] } {
  const facts = factsOf(html);
  const day = (label: RegExp) => {
    const fact = facts.find((f) => label.test(f.label));
    return fact ? dayOf(fact.text) : null;
  };
  const earlier = facts
    .filter((f) => EARLIER.test(f.label))
    .flatMap((f) =>
      [...f.html.matchAll(/\bhref=(["'])(.*?)\1/gi)].map((m) => absolute(m[2]!, pageUrl)),
    );
  return { inForceFrom: day(STARTS), inForceTo: day(ENDS), earlier };
}

const DOCUMENT = /\/_docn?\/\d+(?:\/[^"'?#]*)?/;

/** The version's document: the first `/_doc/` or `/_docn/` link in one of the page's tables, not the site's navigation. */
export function documentOf(html: string, pageUrl: string): string | null {
  for (const table of html.matchAll(/<table\b[\s\S]*?<\/table>/gi)) {
    for (const link of table[0].matchAll(/\bhref=(["'])(.*?)\1/gi)) {
      if (DOCUMENT.test(link[2]!)) return absolute(link[2]!, pageUrl);
    }
  }
  return null;
}

/** On an earlier version's notice, the link that serves the file itself. */
export function noticeLinkOf(html: string, pageUrl: string): string | null {
  const href = /\bhref=(["'])([^"']*\/_rtr\/dokument_\d+)\1/i.exec(html)?.[2];
  return href ? absolute(href, pageUrl) : null;
}

/** How many earlier versions are followed back from the current one. */
const EARLIER_VERSIONS = 20;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function iweb(config: IwebConfig, pauseMs = 500): PublisherAdapter {
  const host = new URL(config.homepage).hostname;
  const hosts = [host];
  const text = async (url: string, doFetch: typeof fetch) =>
    new TextDecoder().decode((await read(url, doFetch, hosts)).bytes);
  return {
    key: config.key,
    authority: config.authority,
    name: config.name,
    homepage: config.homepage,
    licenceSpdx: config.licenceSpdx,
    textStatus: "consolidated",
    locale: config.locale,

    async list(doFetch) {
      const queue = [...config.pages];
      const opened = new Set<string>();
      const pages: string[] = [];
      const acts = new Map<string, ListedAct>();
      const missed: string[] = [];
      let first: string | null = null;
      while (queue.length && opened.size < 60) {
        const url = queue.shift()!;
        if (opened.has(url)) continue;
        opened.add(url);
        let page;
        try {
          // The publisher's page, or the archive's dated copy of it when the publisher refuses (http.ts).
          page = await read(url, doFetch, hosts);
        } catch (error) {
          missed.push(`${url}: ${error instanceof Error ? error.message : String(error)}`);
          continue;
        }
        first ??= page.url;
        const html = new TextDecoder().decode(page.bytes);
        pages.push(html);
        const rows = actsOfRows(tableRows(html), url);
        // A page with no table may still link its acts (Sion).
        for (const act of rows.length > 0 ? rows : actsOfLinks(html, url))
          if (!acts.has(act.ref)) acts.set(act.ref, act);
        if (config.follow)
          for (const m of html.matchAll(/\bhref=(["'])(.*?)\1/gi)) {
            let next: string;
            try {
              next = absolute(m[2]!, url);
            } catch {
              continue;
            }
            if (config.follow.test(new URL(next).pathname) && new URL(next).hostname === host)
              queue.push(next.split("#")[0]!);
          }
        await sleep(pauseMs);
      }
      // A collection that lists nothing is a moved page or a changed module, never "no acts": fail
      // loudly, with what the pages did link to, so the next reader is fixed from evidence.
      if (acts.size === 0) {
        const seen = [
          ...new Set(
            pages.flatMap((html) =>
              [...html.matchAll(/\bhref=(["'])(\/[^"'#?]*)\1/gi)].map((m) => m[2]!),
            ),
          ),
        ].slice(0, 25);
        throw new Error(
          `${config.key}: the pages listed no acts${missed.length ? ` (${missed.join("; ")})` : ""}; ${pages.length} page(s), tables ${pages.map((h) => tableRows(h).length).join("/")}, a row: ${JSON.stringify(pages.flatMap((h) => tableRows(h))[0] ?? null).slice(0, 600)}, links: ${seen.join(" ")}`,
        );
      }
      return {
        bytes: new TextEncoder().encode(pages.join("\n")),
        url: first ?? config.pages[0]!,
        acts: [...acts.values()],
      };
    },

    async versions(pageUrl, doFetch) {
      const today = new Date().toISOString().slice(0, 10);
      const out: VersionRef[] = [];
      const seen = new Set<string>();
      let queue = [pageUrl];
      while (queue.length && seen.size <= EARLIER_VERSIONS) {
        const url = queue.shift()!;
        if (seen.has(url)) continue;
        seen.add(url);
        if (seen.size > 1) await sleep(pauseMs);
        const page = readVersionPage(await text(url, doFetch), url);
        if (page.inForceFrom) {
          out.push({ inForceFrom: page.inForceFrom, inForceTo: page.inForceTo, pageUrl: url });
        } else if (url === pageUrl) {
          // A page that states no day is dated by the day it was read; only the current one can be.
          out.push({ inForceFrom: today, inForceTo: null, pageUrl: url, dateBasis: "retrieved" });
        }
        queue = [...queue, ...page.earlier];
      }
      return oneOfEachDay(out);
    },

    async document(version, doFetch): Promise<DocumentRef | null> {
      const url = documentOf(await text(version.pageUrl, doFetch), version.pageUrl);
      if (!url) return null;
      if (version.inForceTo === null) return { url, format: "pdf" };
      // An earlier version's file may first answer with a notice that it is no longer in force.
      const first = await read(url, doFetch, hosts);
      const head = new TextDecoder().decode(first.bytes.subarray(0, 1024));
      if (head.includes("%PDF-")) return { url, format: "pdf" };
      const file = noticeLinkOf(new TextDecoder().decode(first.bytes), url);
      return file ? { url: file, format: "pdf" } : null;
    },
  };
}

const dayBefore = (day: string): string => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

/**
 * Oldest first, one version per first day (a version stated twice keeps the
 * one that names an end); an earlier version that states no end ends the day
 * before the next begins.
 */
export function oneOfEachDay(versions: readonly VersionRef[]): VersionRef[] {
  const byDay = new Map<string, VersionRef>();
  for (const v of versions) {
    const seen = byDay.get(v.inForceFrom);
    if (!seen || (seen.inForceTo === null && v.inForceTo !== null)) byDay.set(v.inForceFrom, v);
  }
  const sorted = [...byDay.values()].sort((a, b) => a.inForceFrom.localeCompare(b.inForceFrom));
  return sorted.map((v, i) =>
    v.inForceTo === null && i < sorted.length - 1
      ? { ...v, inForceTo: dayBefore(sorted[i + 1]!.inForceFrom) }
      : v,
  );
}

/**
 * Five of Switzerland's twenty most populous communes keep their collection in
 * the module (surveyed 2026-11-08 from the addresses search engines index for
 * their act pages: `<page>/sammlung/<id>`, chapters `<page>/kapitel/<id>`,
 * documents `/_doc/<id>` and `/_docn/<id>/<file>`). A collection's page is the
 * one its act pages sit under; its chapter pages are listed too, so a moved
 * index still leaves the chapters to read.
 */
const CITY = {
  licenceSpdx: "LicenseRef-ch-official-act",
  follow: /\/kapitel\/(?:kapitel\/)?\d+$/,
};

export const luzernCity = iweb({
  ...CITY,
  key: "luzern-city",
  authority: "bfs1061",
  name: "Stadt Luzern, Systematische Rechtssammlung",
  homepage: "https://www.stadtluzern.ch/",
  locale: "de",
  pages: [
    "https://www.stadtluzern.ch/dokumentebilder/rechtssammlung",
    "https://www.stadtluzern.ch/dokumentebilder/rechtssammlung/kapitel/kapitel/66",
  ],
});

export const thun = iweb({
  ...CITY,
  key: "thun",
  authority: "bfs942",
  name: "Stadt Thun, Reglemente und Verordnungen",
  homepage: "https://www.thun.ch/",
  locale: "de",
  // The collection's own page: its act pages are /reglementeverordnungen/sammlung/<id>
  // (as search engines index them, 2026-11-08); the address first configured answered 404.
  pages: ["https://www.thun.ch/reglementeverordnungen"],
});

export const chur = iweb({
  ...CITY,
  key: "chur",
  authority: "bfs3901",
  name: "Stadt Chur, Gesetzessammlung",
  homepage: "https://www.chur.ch/",
  locale: "de",
  // One page per hundred of the collection's numbers, 100 to 999.
  pages: [
    "https://www.chur.ch/rechtssammlung",
    "https://www.chur.ch/grundlagen/kapitel/87",
    "https://www.chur.ch/gesetzeskapitel",
    "https://www.chur.ch/gesundheit",
    "https://www.chur.ch/finanzen",
    "https://www.chur.ch/planung",
    "https://www.chur.ch/erziehung",
    "https://www.chur.ch/anhang/kapitel/95",
  ],
});

export const schaffhausenCity = iweb({
  ...CITY,
  key: "schaffhausen-city",
  authority: "bfs2939",
  name: "Stadt Schaffhausen, Rechtssammlung (RSS)",
  homepage: "https://www.stadt-schaffhausen.ch/",
  locale: "de",
  pages: ["https://www.stadt-schaffhausen.ch/rechtssammlung"],
});

export const sion = iweb({
  ...CITY,
  key: "sion",
  authority: "bfs6266",
  name: "Ville de Sion, Règlements",
  homepage: "https://www.sion.ch/",
  locale: "fr",
  pages: ["https://www.sion.ch/reglements"],
});

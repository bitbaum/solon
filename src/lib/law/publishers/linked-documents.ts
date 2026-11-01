/**
 * A commune that publishes its acts as documents linked from its own pages
 * ("Reglemente & Formulare"), which is how most communes in Liechtenstein and
 * Switzerland do it. One adapter for all of them; what differs is config: the
 * pages that list the acts, how a document link looks, which folders to open,
 * and which titles are acts rather than forms.
 *
 * Such a page states no day an act took effect, so a version is dated by the
 * day it was read (`dateBasis: retrieved`), and a document already held, byte
 * for byte, is not stored again (load.ts).
 */
import type { ActKind } from "@/lib/config/law";
import { getText } from "./http";
import type { ListedAct, PublisherAdapter, VersionRef } from "./types";

export interface LinkedDocumentsConfig {
  key: string;
  authority: string;
  name: string;
  homepage: string;
  licenceSpdx: string;
  /** The pages that list the acts. */
  pages: readonly string[];
  /** A document link; its first group is the collection's own id for the document. */
  link: RegExp;
  /** Folder links to open once, on the same host. */
  follow?: RegExp;
  /** A title that names an act (Reglement, Verordnung, Ordnung, Statuten, Tarif). */
  include: RegExp;
  /** A title that names a form or a notice, even if it says "Reglement". */
  exclude: RegExp;
  kind?: ActKind;
}

const decode = (s: string) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(
      /&([aouAOU])uml;/g,
      (_, v: string) => ({ a: "ä", o: "ö", u: "ü", A: "Ä", O: "Ö", U: "Ü" })[v]!,
    )
    .replace(/&szlig;/g, "ß")
    .replace(/&shy;|\u00ad/g, "")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)));

/** The links of a page, each with the words a reader sees on it. */
export function anchorsOf(html: string, base: string): { href: string; text: string }[] {
  const out: { href: string; text: string }[] = [];
  for (const m of html.matchAll(/<a\b[^>]*?href=(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi)) {
    const text = decode(
      m[3]!
        .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    )
      .replace(/\.pdf$/i, "")
      // A download button's own words are not the act's title ("… als PDF herunterladen").
      .replace(/\s*(?:als PDF herunterladen|\(PDF[^)]*\)|PDF herunterladen)$/i, "")
      .trim();
    try {
      out.push({ href: new URL(decode(m[2]!), base).toString(), text });
    } catch {
      // not an address
    }
  }
  return out;
}

/** The acts among a page's links: one per document id, titled by its link, forms left out. */
export function actsOf(
  anchors: readonly { href: string; text: string }[],
  config: Pick<LinkedDocumentsConfig, "link" | "include" | "exclude" | "kind">,
): ListedAct[] {
  const seen = new Set<string>();
  const acts: ListedAct[] = [];
  for (const a of anchors) {
    const id = config.link.exec(a.href)?.[1];
    if (!id || seen.has(id) || !a.text) continue;
    if (!config.include.test(a.text) || config.exclude.test(a.text)) continue;
    seen.add(id);
    // A cache-buster changes on every visit ("?t=639291088808965558"); the act's address does not.
    const url = new URL(a.href);
    url.searchParams.delete("t");
    acts.push({
      ref: id,
      title: a.text,
      kind: config.kind ?? "communal_act",
      pageUrl: url.toString(),
    });
  }
  return acts;
}

const iso = (d: string, m: string, y: string) => `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;

/**
 * The day a title says it applies from ("gültig ab 01.01.2027"): the
 * publisher's own words, so it dates the version, and a version that has not
 * begun waits (load.ts serves the version in force today). A title that says
 * nothing, or only when it ends ("gültig bis 31.12.2026"), is dated by the day
 * it is read and stays open until its successor begins.
 */
export function versionOf(title: string, pageUrl: string, today: string): VersionRef {
  const from = /gültig ab (\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(title);
  if (from) return { inForceFrom: iso(from[1]!, from[2]!, from[3]!), inForceTo: null, pageUrl };
  return { inForceFrom: today, inForceTo: null, pageUrl, dateBasis: "retrieved" };
}

export function linkedDocuments(config: LinkedDocumentsConfig): PublisherAdapter {
  const host = new URL(config.homepage).hostname;
  const titles = new Map<string, string>();
  return {
    key: config.key,
    authority: config.authority,
    name: config.name,
    homepage: config.homepage,
    licenceSpdx: config.licenceSpdx,
    textStatus: "authentic",
    locale: "de",
    async list(doFetch) {
      const pages: string[] = [];
      const anchors: { href: string; text: string }[] = [];
      const queue = [...config.pages];
      const opened = new Set<string>();
      while (queue.length && opened.size < 40) {
        const url = queue.shift()!;
        if (opened.has(url)) continue;
        opened.add(url);
        const html = await getText(url, doFetch, [host]);
        pages.push(html);
        const found = anchorsOf(html, url);
        anchors.push(...found);
        if (config.follow && config.pages.includes(url))
          for (const a of found)
            if (config.follow.test(a.href) && new URL(a.href).hostname === host) queue.push(a.href);
      }
      const acts = actsOf(anchors, config);
      // A page that lists nothing is a changed page or a challenge, never "no acts": fail loudly.
      if (acts.length === 0) throw new Error(`${config.key}: the pages listed no acts`);
      for (const act of acts) titles.set(act.pageUrl, act.title);
      return { bytes: new TextEncoder().encode(pages.join("\n")), url: config.pages[0]!, acts };
    },
    async versions(pageUrl) {
      const today = new Date().toISOString().slice(0, 10);
      const version: VersionRef = {
        inForceFrom: today,
        inForceTo: null,
        pageUrl,
        dateBasis: "retrieved",
      };
      return [version];
    },
    async document(version) {
      return { url: version.pageUrl, format: "pdf" };
    },
  };
}

/** What a Liechtenstein commune calls an act, and what it calls a form. */
const LI_ACT =
  /reglement|verordnung|ordnung|statut|tarif|gebühren|richtlinie|beschluss|leitbild|gemeindegesetz|vorschrift/i;
const LI_FORM =
  /antrag|formular|anmeld|gesuch|bestell|merkblatt|erklärung|preisliste|plan\b|karte|inventar|vollmacht|checkliste|offenlegung/i;
const CONCRETE_FILE = /\/download_file\/(?:view\/|force\/)?([0-9a-f-]{1,40})(?:[/?#]|$)/i;

/** A file a WordPress site serves from its uploads, named by its path there. */
const WORDPRESS_FILE = /\/wp-content\/uploads\/((?:\d{4}\/\d{2}\/)?[^/?#]+\.pdf)(?:[?#]|$)/i;
/** A file in a media archive (Ruggell), named by its file name. */
const MEDIA_ARCHIVE_FILE = /\/files\/(?:medienarchiv|attachments)\/([^/?#]+\.pdf)(?:[?#]|$)/i;

const liCommune = (
  key: string,
  authority: string,
  name: string,
  homepage: string,
  pages: string[],
  follow?: RegExp,
  link: RegExp = CONCRETE_FILE,
) =>
  linkedDocuments({
    key,
    authority,
    name,
    homepage,
    licenceSpdx: "LicenseRef-li-official-act",
    pages,
    link,
    follow,
    include: LI_ACT,
    exclude: LI_FORM,
  });

export const vaduz = liCommune(
  "vaduz",
  "li7001",
  "Gemeinde Vaduz",
  "https://www.vaduz.li/",
  ["https://www.vaduz.li/reglemente"],
  /\/reglemente\/navigate\/\d+\/\d+$/,
);
export const schaan = liCommune("schaan", "li7005", "Gemeinde Schaan", "https://www.schaan.li/", [
  "https://www.schaan.li/gemeinde-politik/service/reglemente",
]);
export const planken = liCommune(
  "planken",
  "li7006",
  "Gemeinde Planken",
  "https://www.planken.li/",
  ["https://www.planken.li/service/downloads/formulare-und-reglemente"],
);
export const gamprin = liCommune(
  "gamprin",
  "li7009",
  "Gemeinde Gamprin",
  "https://www.gamprin.li/",
  ["https://www.gamprin.li/service-dokumente"],
);
export const ruggell = liCommune(
  "ruggell",
  "li7010",
  "Gemeinde Ruggell",
  "https://www.ruggell.li/",
  ["https://www.ruggell.li/downloads"],
  /\/downloads\.aspx\?fid=1853&sfid=\d+/,
  MEDIA_ARCHIVE_FILE,
);
export const eschen = liCommune(
  "eschen",
  "li7007",
  "Gemeinde Eschen-Nendeln",
  "https://www.eschen.li/",
  ["https://www.eschen.li/verwaltung-service/service/download/"],
  undefined,
  WORDPRESS_FILE,
);

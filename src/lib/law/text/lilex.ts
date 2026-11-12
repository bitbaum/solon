/**
 * Reads Liechtenstein's consolidated acts from Lilex, the Government's
 * collection on gesetze.li (design L2). An act is one HTML page in which every
 * provision is a `div.art` opened by an anchor: `art:<n>` for an article,
 * `par:<n>` for a § of an act taken from Austria.
 *
 * Lilex answers a burst of requests with a browser proof-of-work page instead
 * of the law. That page is recognised and the run stops at once: it is never
 * solved, and nothing more is asked of the publisher until a later run.
 */
import { LILEX } from "@/lib/config/law";
import { blockText } from "./html-text";
import { WHOLE_ACT, type Provision } from "./fedlex";

const USER_AGENT = "solon-law-text (cato@orangecat.ch)";

export class ChallengeError extends Error {
  constructor() {
    super("gesetze.li answered with its proof-of-work page; not solved, the run stops");
  }
}

/** The Landesgesetzblatt issue ("2008/311") as the id of the act's Lilex page, or null when it has no plain one. */
export function lilexId(lgbl: string | null, lr: string): string | null {
  const exception = LILEX.idByLr[lr];
  if (exception) return exception;
  const m = /^(\d{4})\/(\d{1,3})$/.exec(lgbl ?? "");
  return m ? `${m[1]}${m[2]!.padStart(3, "0")}000` : null;
}

export const lilexUrl = (id: string): string => `${LILEX.page}${id}`;

// gesetze.li answers an address it does not know with a maintenance notice that carries the same script.
const isMaintenance = (html: string) => html.includes("Wartungsarbeiten");
const isChallenge = (html: string) => html.includes("array_to_hex_string") && !isMaintenance(html);
const isAct = (html: string) =>
  html.includes('<div class="art"') || html.includes('<div class="htit1"');

/** An act's page; null when it does not exist or is not an act. Throws ChallengeError on the proof-of-work page. */
export async function fetchLilexPage(
  id: string,
  doFetch: typeof fetch = fetch,
): Promise<Uint8Array | null> {
  const response = await doFetch(lilexUrl(id), {
    headers: { "user-agent": USER_AGENT },
    signal: AbortSignal.timeout(90_000),
  });
  const bytes = new Uint8Array(await response.arrayBuffer());
  const html = new TextDecoder().decode(bytes);
  if (!isAct(html)) {
    if (isChallenge(html)) throw new ChallengeError();
    return null;
  }
  return bytes;
}

/** The PDF a page links for its text, when the page holds none (a gazette entry, a treaty). */
export function pdfLinkOf(html: string): string | null {
  const href = /href="(\/(?:konso|chrono)\/pdf\/[^"]+)"/.exec(html)?.[1];
  return href ? new URL(href.replace(/&amp;/g, "&"), LILEX.homepage).toString() : null;
}

/** An act's text as the publisher gives it: its page, or else the PDF of its Landesgesetzblatt entry. */
export async function fetchLilexDocument(
  id: string,
  doFetch: typeof fetch = fetch,
): Promise<{ bytes: Uint8Array; format: "html" | "pdf" } | null> {
  const page = await fetchLilexPage(id, doFetch);
  if (page) return { bytes: page, format: "html" };
  // No consolidated page: the entry in the gazette, whose text is a PDF.
  const entry = await doFetch(`${LILEX.homepage}/chrono/${id}`, {
    headers: { "user-agent": USER_AGENT },
    signal: AbortSignal.timeout(90_000),
  });
  const link = pdfLinkOf(await entry.text());
  if (!link) return null;
  const pdf = await doFetch(link, {
    headers: { "user-agent": USER_AGENT },
    signal: AbortSignal.timeout(180_000),
  });
  const bytes = new Uint8Array(await pdf.arrayBuffer());
  return new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-" ? { bytes, format: "pdf" } : null;
}

/** LR number → page id, from a Gebietssystematik page: the publisher's own list of where each act is. */
export function parseSystematicIds(html: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of html.matchAll(/<td>(\d+(?:\.\d+)*)<\/td>\s*<td><a href="\/konso\/(\d+)">/g)) {
    // A treaty is listed once for its main text and again for its parts: the first is the act.
    if (!out.has(m[1]!)) out.set(m[1]!, m[2]!);
  }
  return out;
}

/** The listings that may hold an act: its own, then each parent ("0.110.042.08" → "0.110.042" → "0.110" → "0"). */
export function systematicStarts(lr: string): string[] {
  const parts = lr.split(".");
  return parts.map((_, i) => parts.slice(0, parts.length - i).join("."));
}

export async function fetchSystematicIds(
  lrstart: string,
  doFetch: typeof fetch = fetch,
): Promise<Map<string, string>> {
  const response = await doFetch(
    `${LILEX.homepage}/konso/gebietssystematik?lrstart=${encodeURIComponent(lrstart)}`,
    { headers: { "user-agent": USER_AGENT }, signal: AbortSignal.timeout(90_000) },
  );
  const html = await response.text();
  if (isChallenge(html) && !html.includes("<table")) throw new ChallengeError();
  return parseSystematicIds(html);
}

/** The link from a word to its footnote at the foot of the page; not part of the text. */
const FOOTNOTE_MARK = /<a href="#fn[^"]*"[^>]*>[\s\S]*?<\/a\s*>/g;

// A heading is `tit`, `tit1`, `tit1m` …: the digit and a letter after it name its level and kind.
const BOUNDARY = /<div class="(?:art|tit\d?[a-z]*|fntext)"|<div class="sacht" style=/g;

/**
 * The articles and §§ of an act, in order. The anchor `art:2a` becomes the path
 * `art_2a`. An act with no provision of that kind is one provision, `text`.
 */
export function parseLilexProvisions(html: string): Provision[] {
  // The publisher styles an article's block when a heading stands above it (`<div class="art" style="margin-top:6.5pt">`):
  // those are articles too. Matching only the bare tag dropped every article that follows a heading, § 1 of the ABGB first.
  const starts = [...html.matchAll(/<div class="art"[^>]*>/g)].map((m) => m.index!);
  const out: { at: number; provision: Provision }[] = [];
  const seen = new Map<string, number>();
  const headings = headingsOf(html);
  const loose = looseText(html);
  // Where a block of text begins: an article, or the body under a heading. Headings are listed above the next one.
  const boundaries = [...starts, ...loose.map((l) => l.at)];
  for (const start of starts) {
    BOUNDARY.lastIndex = start + 1;
    const end = BOUNDARY.exec(html)?.index ?? html.length;
    // Footnote marks are links to the notes at the end of the page; not part of the text.
    const block = html.slice(start, end).replace(FOOTNOTE_MARK, "");
    const anchor = /<a name="((?:art|par):[^"]+)"><\/a>/.exec(block)?.[1];
    if (!anchor) continue;
    // An announcement of several EEA decisions numbers each decision's articles from 1, so one page
    // repeats art:1, art:2: every one is kept, the later ones under a suffix, never dropped.
    const base = anchor.replace(":", "_");
    const times = (seen.get(base) ?? 0) + 1;
    seen.set(base, times);
    const path = times === 1 ? base : `${base}_n${times}`;
    const afterAnchor = block.slice(block.indexOf("</a>") + 4);
    const sacht = /<div class="sacht">([\s\S]*?)<\/div>/.exec(afterAnchor);
    // The number ("Art. 1", "§ 1096") runs up to the title, or to the first block when there is none.
    const numberEnd =
      sacht?.index ??
      (afterAnchor.indexOf("<div") < 0 ? afterAnchor.length : afterAnchor.indexOf("<div"));
    const number = blockText(afterAnchor.slice(0, numberEnd));
    const title = sacht ? blockText(sacht[1]!) : "";
    const body = sacht
      ? afterAnchor.slice(sacht.index! + sacht[0].length)
      : afterAnchor.slice(numberEnd);
    out.push({
      at: start,
      provision: {
        path,
        heading: [number, title].filter(Boolean).join(" "),
        text: blockText(body),
        headingPath: pathAt(headings, start, boundaries),
      },
    });
  }
  // The text the articles do not hold: what a promulgation says before its first article, and an
  // annex, a list or a table under a heading of its own. Without it a page keeps a fraction of
  // its words (125 of 5,395 on one of Liechtenstein's EEA decisions). Footnotes stay out.
  if (out.length > 0) {
    let n = 0;
    for (const { at, provision } of loose) {
      n++;
      // The text before the first heading has none above it.
      const headingPath = headings.some((h) => h.at === at) ? pathAt(headings, at, boundaries) : [];
      out.push({ at, provision: { ...provision, path: `part_${n}`, headingPath } });
    }
  }
  if (out.length === 0) {
    const start = html.indexOf('<div class="htit1"');
    if (start >= 0) {
      const title = blockText(/<div class="htit1">([\s\S]*?)<\/div>/.exec(html)?.[1] ?? "");
      const notes = html.indexOf('<div class="fntext"');
      const text = blockText(
        html.slice(start, notes < 0 ? undefined : notes).replace(FOOTNOTE_MARK, ""),
      );
      if (text) out.push({ at: start, provision: { path: WHOLE_ACT, heading: title, text } });
    }
  }
  return out.sort((a, b) => a.at - b.at).map((o) => o.provision);
}

interface Heading {
  at: number;
  level: number;
  text: string;
  /** A title printed above one article only (`sacht` before its `art`), not above the ones after it. */
  single: boolean;
}

/**
 * The chapter headings of a page (`tit1`, `tit2`, `tit3` …) and the titles that stand above a single
 * article, in page order, each with its level.
 */
function headingsOf(html: string): Heading[] {
  const found: Heading[] = [];
  for (const m of html.matchAll(/<div class="tit(\d?)([a-z]*)"[^>]*>([\s\S]*?)<\/div>/g)) {
    found.push({
      at: m.index!,
      // `tit1ue`: the title line under a numbered heading ("II." then "Inkrafttreten"), one level below it.
      level: m[1] ? Number(m[1]) + (m[2] ? 0.5 : 0) : 1,
      text: blockText(m[3]!.replace(FOOTNOTE_MARK, "")),
      single: false,
    });
  }
  // `<div class="sacht" style=…><a name="vorart:14;sacht:1">` outside an article names the article after it.
  for (const m of html.matchAll(
    /<div class="sacht"[^>]*>\s*(<a name="vorart:[^>]*><\/a>[\s\S]*?)<\/div>/g,
  )) {
    found.push({
      at: m.index!,
      level: 99,
      text: blockText(m[1]!.replace(FOOTNOTE_MARK, "")),
      single: true,
    });
  }
  return found.filter((h) => h.text).sort((a, b) => a.at - b.at);
}

/**
 * The headings above the block that begins at `at`, outermost first, in the page's order: those still
 * in force from before the previous block (`boundaries`: where articles and annexes begin), then every
 * heading printed since, even one a later heading of its own level replaced ("Anlage", then its
 * title, then "Erfolgsrechnung", over one table). A heading is never lost for want of a body.
 */
function pathAt(headings: Heading[], at: number, boundaries: number[]): string[] {
  const since = Math.max(-1, ...boundaries.filter((b) => b < at));
  const run = headings.filter((h) => h.at > since && h.at < at);
  const top = Math.min(99, ...run.map((h) => h.level));
  const held = new Map<number, string>();
  for (const h of headings) {
    if (h.at > since) break;
    if (h.single) continue;
    for (const level of held.keys()) if (level >= h.level) held.delete(level);
    held.set(h.level, h.text);
  }
  const older = [...held.entries()]
    .filter(([level]) => level < top)
    .sort((x, y) => x[0] - y[0])
    .map(([, text]) => text);
  return [...older, ...run.map((h) => h.text)];
}

/**
 * The text outside the articles, in page order, each as a provision without its path: the
 * promulgation before the first article (the act's title lines aside), and the body under every
 * heading that is not an article. A heading with nothing under it before the next article is just a
 * chapter title and gives nothing.
 */
function looseText(html: string): { at: number; provision: Provision }[] {
  const out: { at: number; provision: Provision }[] = [];
  const marks = [...html.matchAll(new RegExp(BOUNDARY.source, "g"))].map((m) => ({
    at: m.index!,
    tag: m[0],
  }));
  if (marks.length === 0) return out;
  const bodyAt = Math.max(html.indexOf("<body"), 0);
  const first = html.slice(bodyAt, marks[0]!.at);
  const title = /<div class="htit1">([\s\S]*?)<\/div>/.exec(first)?.[1] ?? "";
  const preamble = blockText(
    first
      .replace(/<div class="(?:htit\d|vom|tit\d?[a-z]*)"[^>]*>[\s\S]*?<\/div>/g, "")
      .replace(FOOTNOTE_MARK, ""),
  );
  if (preamble)
    out.push({ at: bodyAt, provision: { path: "", heading: blockText(title), text: preamble } });
  for (const [i, mark] of marks.entries()) {
    if (!/class="tit\d?[a-z]*"/.test(mark.tag)) continue;
    const segment = html.slice(mark.at, marks[i + 1]?.at ?? html.length);
    const head = /^<div class="tit\d?[a-z]*"[^>]*>([\s\S]*?)<\/div>/.exec(segment);
    if (!head) continue;
    const text = blockText(segment.slice(head[0].length).replace(FOOTNOTE_MARK, ""));
    if (text)
      out.push({
        at: mark.at,
        provision: {
          path: "",
          heading: blockText(head[1]!.replace(FOOTNOTE_MARK, "")),
          text,
        },
      });
  }
  return out;
}

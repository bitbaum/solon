/**
 * Reads one act of the Republic of South Ossetia as its publishers print it
 * (PARLIAMENTRSO and PRESIDENTRUO in src/lib/config/law), in Russian: a
 * Drupal node (the Parliament) or a WordPress post's content (the President),
 * cut into its articles. Format readers only; which publisher an act belongs
 * to is config.
 *
 * Neither publisher marks provisions up: an act is paragraphs, an article is a
 * paragraph that starts "Статья 12." (the Constitution prints "Статья 12" and
 * the title in the next paragraph), a chapter one that starts "Глава" or
 * "Раздел". The cut follows those words and nothing else; an act with no
 * articles (a decree is numbered points under its preamble) is one provision.
 */
import type { Provision } from "./fedlex";
import { WHOLE_ACT } from "./fedlex";
import { blockText, decodeEntities } from "./html-text";

export interface ParsedNode {
  /** The body of the page as HTML. */
  bodyHtml: string;
  /** The day the Parliament states the act is dated, from the page's own date field. */
  enacted: string | null;
}

/** A node page's body and its date; null when the page is not an act's (a changed layout fails loudly). */
export function parseNode(html: string): ParsedNode | null {
  const start = html.indexOf("field-name-body");
  if (start < 0) return null;
  const open = html.indexOf('property="content:encoded">', start);
  if (open < 0) return null;
  const from = open + 'property="content:encoded">'.length;
  const end = html.indexOf('<div class="field field-name-', from);
  const bodyHtml = html.slice(from, end < 0 ? undefined : end);
  const enacted =
    /field-name-field-enactment[\s\S]*?content="(\d{4}-\d{2}-\d{2})T/.exec(html)?.[1] ?? null;
  return { bodyHtml, enacted };
}

const MONTHS: Record<string, string> = {
  января: "01",
  февраля: "02",
  марта: "03",
  апреля: "04",
  мая: "05",
  июня: "06",
  июля: "07",
  августа: "08",
  сентября: "09",
  октября: "10",
  ноября: "11",
  декабря: "12",
};

const DATE = new RegExp(
  `(\\d{1,2})\\s+(${Object.keys(MONTHS).join("|")})\\s+(\\d{4})\\s*(?:г\\.|года)?`,
  "gi",
);

/** The last "6 ноября 2026 г." in the text's closing lines: the day a decree is signed, as ISO and as printed. */
export function closingDate(text: string): { iso: string; printed: string } | null {
  const tail = text.slice(-600);
  let last: RegExpExecArray | null = null;
  for (const m of tail.matchAll(DATE)) last = m;
  if (!last) return null;
  const month = MONTHS[last[2]!.toLowerCase()]!;
  return {
    iso: `${last[3]}-${month}-${last[1]!.padStart(2, "0")}`,
    printed: last[0].trim(),
  };
}

/** The day a decree is signed (ISO), from its closing lines. */
export const signedOn = (text: string): string | null => closingDate(text)?.iso ?? null;

/**
 * A title for an act the site titles with a bare type word ("Указ"): the word with the day and number
 * the act itself prints in its closing lines, as printed ("Указ от 27 апреля 2021 г."). Null when the
 * act prints no date: nothing is made up.
 */
export function titleFromBody(typeWord: string, text: string): string | null {
  const date = closingDate(text);
  if (!date) return null;
  const number = numberOf(text);
  return `${typeWord} от ${date.printed}${number ? ` № ${number}` : ""}`;
}

/** The number the authority gave the act, "№494", from the closing lines or the header; null when it prints none. */
export function numberOf(text: string): string | null {
  const NUMBER = "№\\s*([0-9]+(?:[-/][0-9A-Za-zА-Яа-я]+)*)";
  const tail = new RegExp(`${NUMBER}\\s*$`).exec(text.trimEnd().slice(-120));
  if (tail) return tail[1]!;
  // A law's header: "Принят Парламентом РЮО", then "18 февраля 2004 года №44".
  return new RegExp(`Принят[\\s\\S]{0,120}?${NUMBER}`).exec(text.slice(0, 800))?.[1] ?? null;
}

const ARTICLE = /^Статья\s+(\d+(?:[.-]\d+)?)\.?\s*(.*)$/;
const CHAPTER = /^(Глава|Раздел|Часть)\s+([IVXLC0-9]+(?:[.-]\d+)?)\b\.?\s*(.*)$/i;

/** The text of an act cut into a preamble, chapters and articles; one provision when it has no articles. */
export function cutProvisions(text: string): Provision[] {
  const lines = text.split("\n").filter(Boolean);
  const out: Provision[] = [];
  const used = new Map<string, number>();
  const unique = (path: string) => {
    const n = (used.get(path) ?? 0) + 1;
    used.set(path, n);
    return n === 1 ? path : `${path}-${n}`;
  };
  let current: Provision | null = null;
  const flush = () => {
    if (current && current.text.trim()) out.push(current);
    current = null;
  };
  for (const line of lines) {
    const article = ARTICLE.exec(line);
    const chapter = article ? null : CHAPTER.exec(line);
    if (article) {
      flush();
      current = { path: unique(`art_${article[1]!.replace(".", "_")}`), heading: line, text: line };
    } else if (chapter) {
      flush();
      current = { path: unique(`ch_${chapter[2]!.toLowerCase()}`), heading: line, text: line };
    } else {
      if (!current) current = { path: "preamble", heading: "", text: "" };
      current.text = current.text ? `${current.text}\n${line}` : line;
    }
  }
  flush();
  if (!out.some((p) => p.path.startsWith("art_"))) {
    return text.trim()
      ? [{ path: WHOLE_ACT, heading: lines[0] ?? "", text: lines.join("\n") }]
      : [];
  }
  return out;
}

/**
 * Plain lines of a fragment of HTML, as the page prints them. A raised footnote marker is its own
 * word on the page ("приставов¹"), so it is kept apart from the word before it, not fused into it.
 */
export const linesOf = (html: string): string => blockText(html.replace(/<sup[^>]*>/g, " <sup>"));

/** A WordPress post's rendered content, as plain lines; the title as the page's own. */
export function postText(json: unknown): { title: string; text: string; date: string } {
  const o = json as {
    title?: { rendered?: string };
    content?: { rendered?: string };
    date?: string;
  };
  if (typeof o.content?.rendered !== "string" || typeof o.date !== "string") {
    throw new Error("the post has no content");
  }
  return {
    title: decodeEntities((o.title?.rendered ?? "").replace(/<[^>]+>/g, "")).trim(),
    text: linesOf(o.content.rendered),
    date: o.date.slice(0, 10),
  };
}

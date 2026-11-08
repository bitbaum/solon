/**
 * New Hampshire's Revised Statutes Annotated as the General Court publishes
 * them (GCNH in src/lib/config/law): the table of titles, each title's
 * chapters, and each chapter's merged page, cut into its sections.
 *
 * A merged chapter page runs: the title and chapter in `<h1>` and `<h2>`,
 * headings that group sections in further `<h2>`s, then each section as
 *
 *   <center><h3>Section 39:3</h3></center>
 *   &nbsp;&nbsp;&nbsp;<b> 39:3 Articles. &#150;</b>
 *   <codesect> … </codesect>
 *   <sourcenote><p><b>Source.</b> … </p></sourcenote>
 *
 * A repealed section keeps its place and says so in its text ("[Repealed
 * 2016, 85:10, II, eff. July 18, 2016.]"); a run of them may share one
 * ("Section 5:7-9", "5:7 to 5:9 Repealed."). A chapter repealed whole has no
 * sections, only "Chapter 268 Repealed – Entire Chapter was repealed" and the
 * repealing act.
 */
import type { Provision } from "./fedlex";
import { blockText, decodeEntities } from "./html-text";

export interface GcnhTitle {
  /** The title's number as the site writes it in addresses: "III", "XIX-A". */
  title: string;
  name: string;
}

export interface GcnhChapter {
  title: string;
  /** The chapter's number: "39", "21-J". */
  chapter: string;
  name: string;
}

export interface GcnhChapterText {
  provisions: Provision[];
  /** The page says the whole chapter was repealed. */
  repealed: boolean;
}

/** The page's text. The site's older pages are Windows-1252; anything that is not valid UTF-8 is read as that. */
export function decodePage(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

/** The merged page of a chapter, relative to the RSA's base address. */
export const chapterPage = (c: Pick<GcnhChapter, "title" | "chapter">) =>
  `${c.title}/${c.chapter}/${c.chapter}-mrg.htm`;

/** A title's list of chapters, relative to the RSA's base address. */
export const titlePage = (title: string) => `NHTOC/NHTOC-${title}.htm`;

/**
 * The anchor a section is found by: the name of the publisher's own page for
 * it (`39-3.htm`, `5-6-a.htm`, `5-7-9.htm`), so `sec_39-3`, `sec_5-6-a`.
 */
export const sectionAnchor = (number: string) => `sec_${number.replace(":", "-")}`;

/** The one provision of a chapter repealed whole. */
export const repealedChapterAnchor = (chapter: string) => `ch_${chapter}`;

/** Windows-1252 punctuation the pages write as numeric references to C1 controls (&#150; is an en dash). */
const CP1252: Readonly<Record<string, string>> = {
  "133": "…",
  "145": "‘",
  "146": "’",
  "147": "“",
  "148": "”",
  "150": "–",
  "151": "—",
};

/** Plain text out of a fragment: the source's line breaks are spaces, `<br>` and paragraphs are lines. */
function textOf(fragment: string): string {
  return blockText(
    fragment
      .replace(/\s+/g, " ")
      .replace(/&#(1[2-5]\d);/g, (whole, n: string) => CP1252[n] ?? whole)
      // The pages write `&nbsp` without its semicolon, and runs of it to indent a paragraph.
      .replace(/&nbsp;?/gi, " ")
      .replace(/<p[\s>]/gi, (m) => `\n${m}`),
  );
}

const SMALL_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "by",
  "for",
  "from",
  "in",
  "into",
  "of",
  "on",
  "or",
  "the",
  "to",
  "upon",
  "with",
]);

/**
 * A name the tables write in capitals, in title case: "TIME FOR HOLDING TOWN
 * MEETINGS" → "Time for Holding Town Meetings". A word with a digit, and a
 * Roman numeral, stays as written.
 */
export function titleCase(name: string): string {
  return name
    .toLowerCase()
    .split(/(\s+|-|\/)/)
    .map((word, i) => {
      if (!/[a-z]/.test(word)) return word;
      if (/\d/.test(word)) return word.toUpperCase();
      if (/^(?:[ivxl]+)$/.test(word) && word.length > 1) return word.toUpperCase();
      if (i > 0 && SMALL_WORDS.has(word)) return word;
      return word.replace(/[a-z]/, (c) => c.toUpperCase());
    })
    .join("");
}

/** The titles in the table of contents (`nhtoc.htm`). A title repealed whole links elsewhere and is not listed. */
export function parseGcnhTitles(html: string): GcnhTitle[] {
  const titles: GcnhTitle[] = [];
  const seen = new Set<string>();
  for (const m of html.matchAll(
    /<a\s+href="NHTOC\/NHTOC-([A-Z]+(?:-[A-Z])?)\.htm"\s*>\s*TITLE\s+[^:<]+:\s*([^<]*)<\/a>/gi,
  )) {
    const title = m[1]!.toUpperCase();
    if (seen.has(title)) continue;
    seen.add(title);
    titles.push({ title, name: titleCase(textOf(m[2]!)) });
  }
  return titles;
}

/** The chapters a title's page lists (`NHTOC/NHTOC-III.htm`), in its order. */
export function parseGcnhChapters(html: string, title: string): GcnhChapter[] {
  const chapters: GcnhChapter[] = [];
  const seen = new Set<string>();
  const escaped = title.replace(/[-]/g, "\\-");
  const link = new RegExp(
    `<a\\s+href="NHTOC-${escaped}-([0-9][0-9A-Z-]*)\\.htm"\\s*>\\s*CHAPTER\\s+[^:<]+:\\s*([^<]*)</a>`,
    "gi",
  );
  for (const m of html.matchAll(link)) {
    const chapter = m[1]!.toUpperCase();
    if (seen.has(chapter)) continue;
    seen.add(chapter);
    chapters.push({ title, chapter, name: titleCase(textOf(m[2]!)) });
  }
  return chapters;
}

const SECTION_START = /<center>\s*<h3>\s*Section\s+([^<]+?)\s*<\/h3>\s*<\/center>/gi;

/**
 * The sections of one chapter's merged page, in order, each with its heading
 * as the page prints it ("39:3 Articles.") and its text: the paragraphs of
 * the section, then its source note ("Source. RS 32:3. …"). Throws when the
 * page is not a chapter's (a firewall's page in its place, say).
 */
export function parseGcnhChapter(html: string, chapter: string): GcnhChapterText {
  if (!/<h2>\s*CHAPTER\s/i.test(html)) throw new Error("not a chapter page");
  const starts = [...html.matchAll(SECTION_START)];
  if (starts.length === 0) {
    const repeal = /<b>([^<]*Chapter\s+\S+\s+Repealed[^<]*)<\/b>([\s\S]*?)(?:<\/body>|$)/i.exec(
      html,
    );
    if (!repeal) return { provisions: [], repealed: false };
    const heading = textOf(repeal[1]!).replace(/\s*[–-]\s*$/, "");
    return {
      provisions: [
        {
          path: repealedChapterAnchor(chapter),
          heading,
          text: textOf(repeal[2]!) || heading,
        },
      ],
      repealed: true,
    };
  }
  const provisions: Provision[] = [];
  const paths = new Set<string>();
  starts.forEach((start, i) => {
    const number = textOf(start[1]!);
    if (!number.includes(":")) return;
    const from = start.index! + start[0].length;
    const to = starts[i + 1]?.index ?? html.length;
    const part = html.slice(from, to);
    const bold = /<b>([\s\S]*?)<\/b>/i.exec(part);
    const heading = bold ? textOf(bold[1]!).replace(/\s*[–-]\s*$/, "") : number;
    const afterHeading = bold ? part.slice(bold.index + bold[0].length) : part;
    const noteAt = afterHeading.search(/<sourcenote>/i);
    const body = (noteAt >= 0 ? afterHeading.slice(0, noteAt) : afterHeading)
      // A heading that groups the sections after this one, and the page's end, are not its text.
      .replace(/<center>[\s\S]*?<\/center>/gi, "")
      .replace(/<\/?(?:body|html)>/gi, "");
    const note =
      noteAt >= 0
        ? textOf(
            /<sourcenote>([\s\S]*?)(?:<\/sourcenote>|$)/i.exec(afterHeading.slice(noteAt))![1]!,
          )
        : "";
    const text = [textOf(body), note].filter(Boolean).join("\n");
    let path = sectionAnchor(number);
    for (let n = 2; paths.has(path); n++) path = `${sectionAnchor(number)}_${n}`;
    paths.add(path);
    provisions.push({
      path,
      heading,
      // A section that is only its heading says what it says there.
      text: text || decodeEntities(heading.replace(/^\S+\s+/, "")),
    });
  });
  return { provisions, repealed: false };
}

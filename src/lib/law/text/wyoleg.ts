/**
 * Wyoming's statutes and constitution as the Legislative Service Office
 * publishes them for download: one PDF per title (Title 97 is the
 * Constitution), its text layer cut into sections (design:
 * docs/design/2026-11-global-law-and-exit.md, "Beyond Switzerland").
 *
 * A title's text runs: the title line, chapter and article lines in capitals,
 * then sections, each opening on a line of its own — `15-1-101. Definitions.`
 * in the statutes, `Article 1, Section 1 Power inherent in the people.` in the
 * Constitution — with the PDF's hard line breaks inside paragraphs.
 */
import type { Provision } from "./fedlex";

/**
 * A statute section's number: title-chapter-section, with dotted parts
 * (34.1-9-101, 15-1-103.1) and the Uniform Commercial Code's lettered
 * articles (34.1-2.A-101, 34.1-4.A-201).
 */
const STATUTE = /^(\d+(?:\.\d+)?-\d+(?:\.[A-Z0-9]+)?-\d+(?:\.\d+)?)\.\s+(\S.*)$/;
const CONSTITUTION = /^Article (\d+), Section (\d+(?:\.\d+)?)\s+(\S.*)$/;
/** A line that opens a new paragraph: (a), (iv), (A), (II) and the like. */
const SUBSECTION = /^\((?:[a-z]{1,2}|[ivxlc]{1,8}|[A-Z]{1,2}|[IVXLC]{1,8})\)\s/;
/**
 * A line that leads into a citation: when the line before a candidate heading
 * ends like this, the candidate is a section number cited mid-sentence and
 * wrapped onto its own line ("…established in W.S.\n15-9-134. Any person…").
 */
const CITES_NEXT =
  /(?:^|[\s(])(?:W\.S\.|W\.S|§|§§|sections?|through|and|or|to|of|in|under|by|with|see|pursuant)$/i;
/** Chapter and article lines: the structure between sections, not part of any. */
const STRUCTURE =
  /^(?:REVISED )?(?:TITLE|CHAPTER|ARTICLE|PART|SUBARTICLE|DIVISION)(?:\s*-)?\s+[\dA-Z.]+(?:\.|\s*-(?:\s.*)?)?$/;

/**
 * Numbers compared part by part, so 15-1-103.1 follows 15-1-103, 15-10-101
 * follows 15-9-101, and a lettered article (2.A) follows every section of the
 * numbered one before it (2-725) and precedes the next (3-101).
 */
function compareNumbers(a: readonly number[], b: readonly number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? -1) - (b[i] ?? -1);
    if (d !== 0) return d;
  }
  return 0;
}
const LETTER = 1_000_000;
const partsOf = (number: string): number[] =>
  number
    .split(/[-.]/)
    .map((part) => (/^\d+$/.test(part) ? Number(part) : LETTER + part.charCodeAt(0)));

/** The anchor a section is found by: `sec_15-1-101`, `art_3_sec_52`. */
export const statuteAnchor = (number: string) => `sec_${number}`;
export const constitutionAnchor = (article: string, section: string) =>
  `art_${article}_sec_${section.replace(".", "_")}`;

interface Heading {
  path: string;
  heading: string;
  order: number[];
}

/**
 * A section's opening line, when this line is one. A statute section must
 * belong to the title being read and come after the one before it, so a
 * wrapped line that happens to begin with a citation ("15-7-305 vacate…",
 * "22-18-101. The …") is never mistaken for a heading.
 */
function headingOf(line: string, title: string, previous: number[] | null): Heading | null {
  if (title === "97") {
    const m = CONSTITUTION.exec(line);
    if (!m) return null;
    const order = [Number(m[1]), ...partsOf(m[2]!)];
    if (previous && compareNumbers(order, previous) <= 0) return null;
    return { path: constitutionAnchor(m[1]!, m[2]!), heading: line.trim(), order };
  }
  const m = STATUTE.exec(line);
  if (!m) return null;
  const number = m[1]!;
  if (number.split("-")[0] !== title) return null;
  const order = partsOf(number);
  if (previous && compareNumbers(order, previous) <= 0) return null;
  return { path: statuteAnchor(number), heading: line.trim(), order };
}

/** Joins the PDF's hard-wrapped lines back into paragraphs; a subsection marker starts a new one. */
function paragraphs(lines: readonly string[]): string {
  const out: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (out.length === 0 || SUBSECTION.test(line)) out.push(line);
    else {
      const last = out[out.length - 1]!;
      // A word broken at a hyphen at the end of a line ("two-\nthirds") keeps its hyphen.
      out[out.length - 1] = last.endsWith("-") ? `${last}${line}` : `${last} ${line}`;
    }
  }
  return out.join("\n");
}

/**
 * The sections of one title's text, in order. `title` is the title's number
 * as the file names it ("15", "34.1"; "97" for the Constitution). A heading
 * that wraps onto a second short line ending in a full stop is joined.
 */
export function parseWyolegProvisions(text: string, title: string): Provision[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const sections: { head: Heading; body: string[] }[] = [];
  let previous: number[] | null = null;
  let inStructure = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (/^\d{1,4}$/.test(line)) continue; // a page number
    const before = lines[i - 1]?.trim() ?? "";
    const head: Heading | null = CITES_NEXT.test(before) ? null : headingOf(line, title, previous);
    if (head) {
      const next = lines[i + 1]?.trim() ?? "";
      if (
        !/\.$/.test(head.heading) &&
        next.length > 0 &&
        next.length < 60 &&
        /\.$/.test(next) &&
        !SUBSECTION.test(next) &&
        !headingOf(next, title, head.order)
      ) {
        head.heading = `${head.heading} ${next}`;
        i++;
      }
      sections.push({ head, body: [] });
      previous = head.order;
      inStructure = false;
      continue;
    }
    if (STRUCTURE.test(line)) {
      inStructure = true;
      continue;
    }
    // A chapter or article title that wraps goes on in capitals; it is structure, not text.
    if (inStructure && /^[A-Z0-9 ,;:'&()./-]+$/.test(line) && /[A-Z]{3}/.test(line)) continue;
    inStructure = false;
    sections.at(-1)?.body.push(line);
  }
  return sections.map(({ head, body }) => ({
    path: head.path,
    heading: head.heading,
    // A section that is only its heading ("15-1-104. Repealed by Laws 1983, ch. 3, § 2.") says it there.
    text: paragraphs(body) || head.heading.replace(/^\S+\s+/, ""),
  }));
}

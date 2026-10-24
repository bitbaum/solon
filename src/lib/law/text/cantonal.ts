/**
 * Reads a cantonal act as a document (design L3, first pass): the canton's
 * own PDF (or HTML) as the register keeps it, cut into articles.
 *
 * A PDF loses structure. Margin notes run into the text and a heading may sit
 * after its body; what is stored is the text as extracted, cut at the places
 * where an article or § begins. An act whose text has no such place is one
 * provision, `text`. The snapshot keeps the document itself, so a better reader
 * can be run over the same bytes later.
 */
import { extractText, getDocumentProxy } from "unpdf";
import { CANTONAL_DOCUMENTS } from "@/lib/config/law";
import { blockText } from "./html-text";
import { WHOLE_ACT, type Provision } from "./fedlex";

const USER_AGENT = "solon-law-text (cato@orangecat.ch)";

export const documentUrl = (registerId: string, lang: string): string =>
  `${CANTONAL_DOCUMENTS.base}${registerId}/${lang}`;

/** The act's document and what the server says it is; null when there is none. */
export async function fetchDocument(
  registerId: string,
  lang: string,
  doFetch: typeof fetch = fetch,
): Promise<{ bytes: Uint8Array; kind: "pdf" | "html" } | null> {
  const response = await doFetch(documentUrl(registerId, lang), {
    headers: { "user-agent": USER_AGENT },
    signal: AbortSignal.timeout(120_000),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`document ${registerId}: HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-") return { bytes, kind: "pdf" };
  const type = response.headers.get("content-type") ?? "";
  return type.includes("html") ? { bytes, kind: "html" } : null;
}

/** The text of a document, line by line. */
export async function documentText(bytes: Uint8Array, kind: "pdf" | "html"): Promise<string> {
  if (kind === "html") return blockText(new TextDecoder().decode(bytes));
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  return String((await extractText(pdf, { mergePages: true })).text);
}

/** The text without the header and footer lines a PDF repeats on every page, and with broken words made whole. */
export function cleanPdfText(raw: string): string {
  const lines = raw.split("\n").map((line) => line.replace(/\s+/g, " ").trim());
  const counts = new Map<string, number>();
  for (const line of lines) if (line) counts.set(line, (counts.get(line) ?? 0) + 1);
  return (
    lines
      .filter(
        (line) =>
          line &&
          (counts.get(line) ?? 0) < 8 &&
          !/^\d{1,4}$/.test(line) &&
          !/^\d{1,2}\. ?\d{1,2}\. ?\d{2,4} - \d+$/.test(line),
      )
      .join("\n")
      // A word hyphenated across a line break is one word ("Steuer-\\npflichtige"),
      // unless the next is a conjunction ("Einkommens-\\nund Vermögenssteuern").
      .replace(/(\p{L})-\n(?!(?:und|oder|bzw|et|ou|e|o)\b)(\p{Ll})/gu, "$1$2")
  );
}

/**
 * Places that may be the heading of an article or §: the sign and number, then
 * the text (or a paragraph number and the text). A PDF can run a margin note
 * into the line before it, or glue the heading to its first word ("Art. 4Der"),
 * so neither the start of a line nor a space is required. A reference
 * ("Art. 5 Abs. 2", "nach Art. 5 des Gesetzes") is not one of these.
 */
const CANDIDATE =
  /(?<!\d)(Art\.|Artikel|§)\s*(\d+)\s*(bis|ter|quater|quinquies|sexies|septies|octies|novies|decies|[a-z]?)(?![\p{L}\d])\.?(?:\s+|(?=[A-ZÄÖÜ]))(?=(?:\d{1,2}\s+)?[A-ZÄÖÜ])(?!Abs\.|al\.|lit\.|let\.|cpv\.|Ziff\.|ch\.)/gu;

/** Order of articles: 5 < 5a < 5b < 6. */
const rank = (n: number, letters: string): number =>
  n * 1000 + (letters ? letters.charCodeAt(0) - 96 : 0);

interface Heading {
  sign: "art" | "par";
  label: string;
  rank: number;
  /** Where the heading starts and where its text begins. */
  at: number;
  textAt: number;
}

/**
 * The headings among the candidates, in the order the act numbers them. After
 * an article, the next is the lowest-numbered candidate within a few of it, so
 * a reference to a later article met first is passed over.
 */
function pickHeadings(text: string): Heading[] {
  const candidates = [...text.matchAll(CANDIDATE)].map((m): Heading => ({
    sign: m[1]!.toLowerCase().startsWith("art") ? "art" : "par",
    label: `${m[1]} ${m[2]}${m[3]}`,
    rank: rank(Number(m[2]), m[3]!.toLowerCase()),
    at: m.index!,
    textAt: m.index! + m[0].length,
  }));
  const picked: Heading[] = [];
  let lastRank = 0;
  let from = 0;
  for (;;) {
    const window = candidates.filter(
      (c) =>
        c.at >= from && c.rank > lastRank && c.rank <= Math.floor(lastRank / 1000) * 1000 + 4000,
    );
    if (window.length === 0) break;
    const best = window.reduce((a, b) =>
      b.rank < a.rank || (b.rank === a.rank && b.at < a.at) ? b : a,
    );
    picked.push(best);
    lastRank = best.rank;
    from = best.textAt;
  }
  return picked;
}

/** A short line that names the article after it: a margin note, without a full stop. */
const isMarginNote = (line: string): boolean =>
  line.length > 0 && line.length <= 70 && !/[.:;,]$/.test(line) && !/^\d/.test(line);

/**
 * The articles and §§ of a cleaned act text, in order, each with the margin
 * note that titles it when the PDF puts one before the heading; the whole text
 * when there are no headings.
 */
export function parseCantonalProvisions(text: string, title = ""): Provision[] {
  const headings = pickHeadings(text);
  if (headings.length === 0) {
    return text.trim() ? [{ path: WHOLE_ACT, heading: title, text: text.trim() }] : [];
  }
  const out: Provision[] = [];
  const seen = new Set<string>();
  // Where each body really ends: before the margin note that titles the next heading.
  const ends = headings.map((heading, i) => {
    const lineStart = text.lastIndexOf("\n", heading.at - 1) + 1;
    const inLine = text.slice(lineStart, heading.at).trim();
    if (inLine) return { end: lineStart, note: isMarginNote(inLine) ? inLine : "" };
    const prevStart = text.lastIndexOf("\n", lineStart - 2) + 1;
    const prev = text.slice(prevStart, lineStart - 1).trim();
    const floor = i === 0 ? 0 : headings[i - 1]!.textAt;
    return prevStart > floor && isMarginNote(prev)
      ? { end: prevStart, note: prev }
      : { end: Math.max(lineStart, floor), note: "" };
  });
  headings.forEach((heading, i) => {
    const path = `${heading.sign}_${heading.label
      .replace(/^\S+\s*/, "")
      .replace(/\s+/g, "")
      .toLowerCase()}`;
    if (seen.has(path)) return;
    seen.add(path);
    const stop = ends[i + 1]?.end ?? text.length;
    const body = text.slice(heading.textAt, Math.max(heading.textAt, stop)).trim();
    out.push({
      path,
      heading: [heading.label, ends[i]!.note].filter(Boolean).join(" "),
      text: body,
    });
  });
  return out;
}

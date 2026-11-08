/**
 * Germany's federal law from Gesetze im Internet (GII in src/lib/config/law),
 * the portal of the Federal Ministry of Justice: the table of contents of the
 * acts in force (`gii-toc.xml`), and each act as a zip of XML cut into its
 * paragraphs, articles and annexes.
 *
 * The XML is the portal's own (DTD gii-norm.dtd): a `<dokumente>` holding one
 * `<norm>` per part of the act. A norm's `<metadaten>` carry its number
 * (`<enbez>`: "§ 12", "Art 3", "Anlage 1") and heading (`<titel>`), its
 * `<textdaten><text><Content>` the words, in `<P>` paragraphs and `<DL>`
 * lists (`<DT>` "1.", `<DD><LA>` the text) and CALS tables. The first norm of
 * an act carries the act's own metadata (`jurabk`, `kurzue`, `langue`, the
 * `standangabe` notes) and no text.
 *
 * A provision's path is its number as an anchor: `§ 12a` → `par_12a`,
 * `Art 3` → `art_3`, `Anlage 2` → `anlage_2`; a part without a number (the
 * Eingangsformel, a Präambel) takes its heading's: `eingangsformel`.
 */
import { GII } from "@/lib/config/law";
import type { ActKind } from "@/lib/config/law";
import { unzipSync } from "fflate";
import type { Provision } from "./fedlex";
import { decodeEntities } from "./html-text";

/** One act the table of contents lists. */
export interface GiiAct {
  /** The portal's abbreviation for the act: the folder it is served from. */
  abbr: string;
  /** Its title as the table of contents prints it (German, the long title). */
  title: string;
  kind: ActKind | "other";
}

/** The kind of an act from its German title (`GII.kindByTitle`): the rule whose word comes first wins. */
export function kindOfTitle(title: string): ActKind {
  let best: { at: number; kind: ActKind } | null = null;
  for (const [pattern, kind] of GII.kindByTitle) {
    const at = title.search(pattern);
    if (at >= 0 && (!best || at < best.at)) best = { at, kind };
  }
  return best?.kind ?? "other";
}

/** The text of an XML element's content, entities decoded, CDATA unwrapped, on one line. */
const oneLine = (fragment: string) =>
  decodeEntities(
    fragment
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
      .replace(/<[^>]+>/g, "")
      .replace(/\u0000/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();

/** `http://www.gesetze-im-internet.de/bgb/xml.zip` → `bgb`; null for any other address. */
export function abbrOfLink(link: string): string | null {
  const m = /\/([A-Za-z0-9_.-]+)\/xml\.zip\s*$/.exec(link.trim());
  return m ? m[1]! : null;
}

/**
 * The acts in the portal's table of contents, each once, in order. An entry
 * without a title or without a link to an act's zip is left out, with why.
 */
export function parseToc(xml: string): {
  acts: GiiAct[];
  skipped: { row: string; reason: string }[];
} {
  const acts: GiiAct[] = [];
  const skipped: { row: string; reason: string }[] = [];
  const seen = new Set<string>();
  for (const m of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)) {
    const item = m[1]!;
    // The portal marks a title that has a note with a trailing "*)".
    const title = oneLine(/<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(item)?.[1] ?? "")
      .replace(/\s*\*+\)\s*$/, "")
      .trim();
    const link = oneLine(/<link\b[^>]*>([\s\S]*?)<\/link>/i.exec(item)?.[1] ?? "");
    const abbr = abbrOfLink(link);
    if (!abbr) {
      skipped.push({ row: title || link || "(empty entry)", reason: "no link to an act's zip" });
    } else if (!title) {
      skipped.push({ row: abbr, reason: "no title" });
    } else if (!seen.has(abbr)) {
      seen.add(abbr);
      acts.push({ abbr, title, kind: kindOfTitle(title) });
    }
  }
  return { acts, skipped };
}

/** True when the bytes are the table of contents, not an error page in its place. */
export const isToc = (xml: string) => /<items\b/i.test(xml) && /<item\b/i.test(xml);

export const zipUrlOf = (abbr: string) => GII.zipUrl.replace("{abbr}", abbr);
export const pageUrlOf = (abbr: string) => GII.pageUrl.replace("{abbr}", abbr);

/** A zip begins with "PK" and a version marker. */
export const isZip = (bytes: Uint8Array) => bytes[0] === 0x50 && bytes[1] === 0x4b;

/** The act's XML inside the portal's zip (`BJNR….xml`, beside any images the act has). */
export function xmlOfZip(bytes: Uint8Array): Uint8Array {
  const files = unzipSync(bytes, { filter: (file) => /\.xml$/i.test(file.name) });
  const names = Object.keys(files).sort();
  if (names.length === 0) throw new Error("no XML in the zip");
  return files[names[0]!]!;
}

/* ------------------------------------------------------------------ text -- */

const SUPERSCRIPT: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
};

/**
 * Plain text of a norm's content: one line per paragraph, per list item (its
 * number and its text together) and per table row (cells apart by " | "),
 * footnote marks and the portal's own table of contents left out.
 */
export function giiText(fragment: string): string {
  const flat = fragment
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<TOC\b[\s\S]*?<\/TOC>/gi, "")
    .replace(/<FnR\b[^>]*>[\s\S]*?<\/FnR>/g, "")
    .replace(/<FnR\b[^>]*\/>/g, "")
    // Preformatted text keeps its line breaks; the rest of the XML's layout is not text.
    .replace(
      /(<pre\b[^>]*>)([\s\S]*?)(<\/pre>)/gi,
      (_, open: string, inner: string, close: string) =>
        `${open}${inner.replace(/\r?\n/g, "\u0001")}${close}`,
    )
    .replace(/\s+/g, " ")
    .replace(/<SUP\b[^>]*>(\d+)<\/SUP>/gi, (_, n: string) =>
      [...n].map((d) => SUPERSCRIPT[d] ?? d).join(""),
    )
    .replace(/<DT\b/g, "\n<DT")
    .replace(/<\/DT>/g, " ")
    .replace(/<\/(?:P|LA|DD|DL|row|tr|table|pre)>|<(?:DL|table|pre)\b[^>]*>|<br\b[^>]*>/gi, "\n")
    .replace(/<\/(?:entry|td|th)>/gi, " | ");
  return decodeEntities(flat.replace(/<[^>]+>/g, ""))
    .replace(/\u0000/g, " ")
    .split("\n")
    .flatMap((line) => line.split("\u0001"))
    .map((line) =>
      line
        .replace(/[ \t]+/g, " ")
        .replace(/^\s*\|\s*/, "")
        .replace(/(?:\s*\|)+\s*$/, "")
        .trim(),
    )
    .filter(Boolean)
    .join("\n");
}

const TRANSLITERATION: Record<string, string> = { ä: "ae", ö: "oe", ü: "ue", ß: "ss" };

/**
 * A number or heading as an anchor: `§ 12a` → `par_12a`, `§ 12 a` → `par_12a`,
 * `§§ 3 bis 5` → `par_3_bis_5`, `Art 3` → `art_3`, `Anlage 2 (zu § 5)` →
 * `anlage_2`, `Eingangsformel` → `eingangsformel`. Null when nothing is left.
 */
export function anchorOf(label: string): string | null {
  const text = label
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/[äöüß]/g, (c) => TRANSLITERATION[c] ?? c)
    .replace(/^§§?\s*/, "par ")
    .replace(/^art\.?(?=\s|\d|$)/, "art")
    // "12 a" is the paragraph 12a; "3 bis 5" is a range.
    .replace(/(\d)\s+([a-z])(?![a-z])/g, "$1$2");
  const slug = text
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
  return slug || null;
}

/** The portal's own listing of an act's parts: not a provision of the law. */
const CONTENTS = /^inhalt(?:s(?:übersicht|verzeichnis)|sübersicht)$/i;

/** One `<norm>`'s part of the act, or null for a norm with no text of its own (the act's metadata, a bare heading). */
function provisionOf(norm: string): Provision | null {
  const meta = /<metadaten\b[^>]*>([\s\S]*?)<\/metadaten>/.exec(norm)?.[1] ?? "";
  const enbez = oneLine(/<enbez\b[^>]*>([\s\S]*?)<\/enbez>/.exec(meta)?.[1] ?? "");
  const titel = oneLine(/<titel\b[^>]*>([\s\S]*?)<\/titel>/.exec(meta)?.[1] ?? "");
  if (CONTENTS.test(enbez) || CONTENTS.test(titel)) return null;
  // `<text>` itself, never `<textdaten>`; a text with nothing in it is self-closed.
  const body = /<text\b(?:[^>]*[^/>])?>([\s\S]*?)<\/text>/.exec(norm)?.[1] ?? "";
  const content = /<Content\b[^>]*>([\s\S]*)<\/Content>/.exec(body)?.[1] ?? body;
  const text = giiText(content);
  if (!text) return null;
  const heading = [enbez, titel].filter(Boolean).join(" ");
  // The act's first norm, which states the act itself, may carry a note of its own (on the title).
  const path = anchorOf(enbez) ?? anchorOf(titel) ?? (/<langue\b/.test(meta) ? "vorspann" : "");
  return { path, heading, text };
}

/** Every path once: a part repeated under one number (a second "Anlage") is `anlage-2`; one with none is `norm_<n>`. */
function unique(provisions: Provision[]): Provision[] {
  const seen = new Map<string, number>();
  return provisions.map((p, i) => {
    const base = p.path || `norm_${i + 1}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return { ...p, path: n === 1 ? base : `${base}-${n}` };
  });
}

/** The provisions of an act's XML, in order: each paragraph, article, annex and formula that has words. */
export function parseGiiXml(xml: string): Provision[] {
  const out: Provision[] = [];
  for (const m of xml.matchAll(/<norm\b[^>]*>([\s\S]*?)<\/norm>/g)) {
    const provision = provisionOf(m[1]!);
    if (provision) out.push(provision);
  }
  return unique(out);
}

/** The act's short abbreviation (`jurabk`) and long title (`langue`) as its first norm states them. */
export function metadataOf(xml: string): { jurabk: string | null; title: string | null } {
  const first = /<metadaten\b[^>]*>([\s\S]*?)<\/metadaten>/.exec(xml)?.[1] ?? "";
  const pick = (tag: string) =>
    oneLine(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`).exec(first)?.[1] ?? "") || null;
  return { jurabk: pick("jurabk"), title: pick("langue") };
}

/** True when the text is an act's XML from the portal, not an error or a notice in its place. */
export const isGiiXml = (xml: string) => /<dokumente\b/.test(xml) && /<norm\b/.test(xml);

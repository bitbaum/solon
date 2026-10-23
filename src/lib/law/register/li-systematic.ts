/**
 * Reads Liechtenstein's Systematic Register (design L2: the register of what
 * exists). The Government's legal service publishes it as a PDF on gesetze.li:
 * every act in force at the reference day, by LR number, each with the
 * Landesgesetzblatt issue (year and number) that published it.
 *
 * The listing page names the current edition's PDF; both are fetched politely.
 * gesetze.li protects some pages with a browser proof-of-work. A response that
 * is that challenge instead of the page is reported, never solved or avoided:
 * the run stops and fetches less.
 */
import { extractText, getDocumentProxy } from "unpdf";
import { LI_SYSTEMATIC_REGISTER as LI } from "@/lib/config/law";
import type { ActRow, RegisterRead } from "./import";

const USER_AGENT = "solon-law-register (cato@orangecat.ch)";
const PAUSE_MS = 6000;

type Fetch = typeof fetch;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface ParsedLiAct {
  /** The systematic (LR) number: 152.20. */
  lr: string;
  /** What the register prints, joined and de-hyphenated: "G vom 17. September 2008 über die Ausländer (Ausländergesetz; AuG)". */
  title: string;
  /** The Landesgesetzblatt issue that published it; null for the Austrian-era acts (ASW). */
  lgbl: { year: string; number: string } | null;
}

const MONTHS = "Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember";
const START = /^(\d{1,3}(?:\.\d+)*)\s+(\S.*)$/;
const FUNDSTELLE = /\.{3,}\s*(\d{4})\s+(\d{1,4}(?:\/\d+)?)\s*$/;
const ASW = /\.{3,}\s*ASW\b/;
const NOT_CONTENT = /^(LGBl\.?(\s*Nr\.?)?|Nr\.|\d{1,3}(\.\d+)*|\d{1,3})$/;
const KEEPS_HYPHEN_BEFORE = /^(und|oder|bzw\.?|sowie|resp\.?)\b/;

/** Joins wrapped lines; a word broken at a line end ("Auslän-" "dergesetz") is made whole again. */
function join(lines: readonly string[]): string {
  let out = "";
  for (const line of lines) {
    if (!out) {
      out = line;
    } else if (/[A-Za-zäöüÄÖÜß]-$/.test(out) && !KEEPS_HYPHEN_BEFORE.test(line)) {
      out = out.slice(0, -1) + line;
    } else {
      out = `${out} ${line}`;
    }
  }
  return out.replace(/\s+/g, " ").trim();
}

/**
 * The acts of the register, from the text of its pages. An act opens a line
 * with its LR number and ends, within a few lines, with dot leaders and the
 * year and number of its Landesgesetzblatt issue. A line that opens with a
 * number and never reaches one is a heading, and is not an act.
 */
export function parseSystematicRegister(pages: readonly string[]): ParsedLiAct[] {
  const lines = pages
    .flatMap((page) => page.split("\n"))
    .map((line) => line.trim())
    .filter((line) => line && !NOT_CONTENT.test(line));
  const startsAct = (line: string) => {
    const m = START.exec(line);
    return !!m && !new RegExp(`^(${MONTHS})\\b`).test(m[2]!);
  };
  const acts: ParsedLiAct[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < lines.length; i++) {
    if (!startsAct(lines[i]!)) continue;
    const m = START.exec(lines[i]!)!;
    const taken = [m[2]!];
    let j = i + 1;
    while (
      !FUNDSTELLE.test(taken[taken.length - 1]!) &&
      !ASW.test(taken[taken.length - 1]!) &&
      j < lines.length &&
      j < i + 9 &&
      !startsAct(lines[j]!)
    ) {
      taken.push(lines[j]!);
      j++;
    }
    const text = join(taken);
    const fund = FUNDSTELLE.exec(text);
    const asw = ASW.exec(text);
    const cut = fund?.index ?? asw?.index;
    if (cut === undefined || seen.has(m[1]!)) continue;
    seen.add(m[1]!);
    acts.push({
      lr: m[1]!,
      title: text
        .slice(0, cut)
        .replace(/\s*\.+\s*$/, "")
        .trim(),
      lgbl: fund ? { year: fund[1]!, number: fund[2]! } : null,
    });
    i = j - 1;
  }
  return acts;
}

/** The kind of an act from how its title opens, or from its number for treaties. */
export function kindOfLiAct(act: ParsedLiAct): ActRow["kind"] {
  if (act.lr.startsWith(LI.treatyPrefix)) return "treaty";
  const first = /^[^\s,(]+/.exec(act.title)?.[0] ?? "";
  const exact = LI.kindByLeadingWord[first];
  if (exact) return exact;
  const word = first.toLowerCase();
  return LI.kindByLeadingSuffix.find(([suffix]) => word.endsWith(suffix))?.[1] ?? "other";
}

/** The generic rows the importer applies: every act listed is in force at the reference day. */
export function liRows(acts: readonly ParsedLiAct[]): RegisterRead {
  return {
    rows: acts.map((act): ActRow => ({
      authority: LI.authority,
      kind: kindOfLiAct(act),
      inForce: true,
      title: act.title,
      locale: LI.locale,
      identity: { scheme: LI.identityScheme, value: act.lr },
      systematicNumber: act.lr,
      more: act.lgbl
        ? [{ scheme: "li_lgbl", value: `${act.lgbl.year}/${act.lgbl.number}` }]
        : undefined,
    })),
    skipped: [],
  };
}

/** The text of each page of the register's PDF. */
export async function pdfPages(bytes: Uint8Array): Promise<string[]> {
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { text } = await extractText(pdf, { mergePages: false });
  return text;
}

/** Reads a stored edition of the register (the PDF) into rows. */
export async function readLiechtensteinRegister(bytes: Uint8Array): Promise<RegisterRead> {
  return liRows(parseSystematicRegister(await pdfPages(bytes)));
}

const isChallenge = (html: string) =>
  html.includes("array_to_hex_string") && !html.includes("<h2>");

/** The current edition's PDF: the listing page names it, then it is fetched. */
export async function fetchLiechtensteinRegister(
  doFetch: Fetch = fetch,
  pauseMs: number = PAUSE_MS,
): Promise<{ bytes: Uint8Array; url: string }> {
  const headers = { "user-agent": USER_AGENT };
  const listing = await doFetch(LI.listing, { headers, signal: AbortSignal.timeout(60_000) });
  if (!listing.ok) throw new Error(`gesetze.li listing: HTTP ${listing.status}`);
  const html = await listing.text();
  if (isChallenge(html))
    throw new Error("gesetze.li answered with its proof-of-work page; not solved");
  const href = /href="(\/konso\/systematisches-register\/\d+)"/.exec(html)?.[1];
  if (!href) throw new Error("gesetze.li listing names no edition of the register");
  await sleep(pauseMs);
  const url = new URL(href, LI.homepage).toString();
  const response = await doFetch(url, { headers, signal: AbortSignal.timeout(180_000) });
  if (!response.ok) throw new Error(`gesetze.li register: HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") {
    throw new Error("gesetze.li register is not a PDF (a challenge page?); not solved");
  }
  return { bytes, url };
}

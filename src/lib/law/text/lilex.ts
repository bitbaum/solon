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

const isChallenge = (html: string) => html.includes("array_to_hex_string");
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

const BOUNDARY = /<div class="(?:art|tit\d?|fntext)"|<div class="sacht" style=/g;

/**
 * The articles and §§ of an act, in order. The anchor `art:2a` becomes the path
 * `art_2a`. An act with no provision of that kind is one provision, `text`.
 */
export function parseLilexProvisions(html: string): Provision[] {
  const starts = [...html.matchAll(/<div class="art">/g)].map((m) => m.index!);
  const out: Provision[] = [];
  const seen = new Set<string>();
  for (const start of starts) {
    BOUNDARY.lastIndex = start + 1;
    const end = BOUNDARY.exec(html)?.index ?? html.length;
    // Footnote marks are links to the notes at the end of the page; not part of the text.
    const block = html.slice(start, end).replace(/<a href="#fn[^"]*"[^>]*>[\s\S]*?<\/a\s*>/g, "");
    const anchor = /<a name="((?:art|par):[^"]+)"><\/a>/.exec(block)?.[1];
    if (!anchor) continue;
    const path = anchor.replace(":", "_");
    if (seen.has(path)) continue;
    seen.add(path);
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
      path,
      heading: [number, title].filter(Boolean).join(" "),
      text: blockText(body),
    });
  }
  if (out.length === 0) {
    const start = html.indexOf('<div class="htit1"');
    if (start >= 0) {
      const title = blockText(/<div class="htit1">([\s\S]*?)<\/div>/.exec(html)?.[1] ?? "");
      const notes = html.indexOf('<div class="fntext"');
      const text = blockText(html.slice(start, notes < 0 ? undefined : notes));
      if (text) out.push({ path: WHOLE_ACT, heading: title, text });
    }
  }
  return out;
}

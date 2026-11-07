/**
 * Estonia's law from Riigi Teataja, the State Gazette (RIIGITEATAJA in
 * src/lib/config/law): the register of consolidated texts in force, read from
 * its public search, and each text's structured XML cut into its sections
 * (design: docs/design/2026-11-global-law-and-exit.md, "Beyond Switzerland").
 *
 * The XML is the publisher's own (schema tyviseadus): a section is a
 * `<paragrahv id="para4">` with its number and heading, holding subsections
 * (`<loige>`, "(1)") and points (`<alampunkt>`, "1)"), each with its text and
 * a note of the act that last amended it. The ids are the anchors Riigi
 * Teataja's own links use, so a section's path here is its path there.
 */
import { RIIGITEATAJA } from "@/lib/config/law";
import type { Provision } from "./fedlex";
import { decodeEntities } from "./html-text";

/** One act in force, as the register's search lists it. */
export interface RtAct {
  /** The id of this consolidated version (its `globaalID`). */
  id: string;
  /** The id shared by every consolidated version of the act. */
  groupId: string;
  title: string;
  abbreviation: string | null;
  /** seadus (act), määrus (regulation), otsus (decision), … */
  type: string;
  issuer: string;
  /** The day this version took effect, as the publisher states it. */
  inForceFrom: string;
  /** True for a municipality's own regulation. */
  local: boolean;
}

const UNICODE_SUPERSCRIPT: Record<string, string> = {
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

/** Text of an XML fragment: superscripts as superscript digits (§ 20¹), tags dropped, entities decoded. */
function plain(fragment: string): string {
  return decodeEntities(
    fragment
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
      .replace(/<sup>(\d+)<\/sup>/g, (_, n: string) =>
        [...n].map((d) => UNICODE_SUPERSCRIPT[d] ?? d).join(""),
      )
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/\u0000/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** The first element of a name inside a fragment, as text; empty when absent. */
const first = (fragment: string, tag: string): string => {
  const m = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`).exec(fragment);
  return m ? plain(m[1]!) : "";
};

/** Every element of a name directly in a fragment, as their raw inner XML, in order. */
function elements(fragment: string, tag: string): string[] {
  const out: string[] = [];
  const open = new RegExp(`<${tag}(?:\\s[^>]*)?>`, "g");
  let m: RegExpExecArray | null;
  while ((m = open.exec(fragment))) {
    const start = m.index + m[0].length;
    const end = fragment.indexOf(`</${tag}>`, start);
    if (end < 0) break;
    out.push(fragment.slice(start, end));
    open.lastIndex = end;
  }
  return out;
}

/**
 * A subsection or a point as one line: its number as published, then its
 * text. A repealed one says "Kehtetu" (repealed), as the publisher prints it;
 * the notes of which act amended what are left out of the text.
 */
function line(fragment: string): string {
  const number = first(fragment, "kuvatavNr");
  const own = fragment
    .replace(/<alampunkt[\s\S]*?<\/alampunkt>/g, "")
    .replace(/<muutmismarge>[\s\S]*?<\/muutmismarge>/g, "");
  const text =
    elements(own, "sisuTekst").map(plain).join(" ") ||
    (/<muutmismarge>\s*<tavatekst>\s*Kehtetu/.test(fragment) ? "Kehtetu" : "");
  return [number, text].filter(Boolean).join(" ");
}

/** The sections of one act's XML, in order. */
export function parseRiigiTeatajaXml(xml: string): Provision[] {
  const provisions: Provision[] = [];
  const open = /<paragrahv\s+id="([^"]+)"[^>]*>/g;
  let m: RegExpExecArray | null;
  while ((m = open.exec(xml))) {
    const start = m.index + m[0].length;
    const end = xml.indexOf("</paragrahv>", start);
    if (end < 0) break;
    const body = xml.slice(start, end);
    open.lastIndex = end;
    const number = first(body, "kuvatavNr");
    const title = first(body, "paragrahvPealkiri");
    const lines: string[] = [];
    const subsections = elements(body, "loige");
    if (subsections.length === 0) {
      // A section with no subsections: its own text, then any points.
      const own = body.replace(/<muutmismarge>[\s\S]*?<\/muutmismarge>/g, "");
      const text = elements(own.replace(/<alampunkt[\s\S]*?<\/alampunkt>/g, ""), "sisuTekst")
        .map(plain)
        .join(" ");
      if (text) lines.push(text);
      for (const point of elements(body, "alampunkt")) lines.push(line(point));
    } else {
      for (const subsection of subsections) {
        lines.push(line(subsection));
        for (const point of elements(subsection, "alampunkt")) lines.push(line(point));
      }
    }
    const repealed = lines.length === 0 && /<muutmismarge>\s*<tavatekst>\s*Kehtetu/.test(body);
    provisions.push({
      path: m[1]!,
      heading: [number.replace(/\s+$/, ""), title].filter(Boolean).join(" "),
      text: repealed ? "Kehtetu" : lines.filter(Boolean).join("\n"),
    });
  }
  return provisions;
}

/** The day a version took effect, from its XML: `<kehtivuseAlgus>2026-03-01+02:00</kehtivuseAlgus>`. */
export function inForceFromXml(xml: string): string | null {
  const m = /<kehtivus>\s*<kehtivuseAlgus>(\d{4}-\d{2}-\d{2})/.exec(xml);
  return m ? m[1]! : null;
}

/** The search body Riigi Teataja's own site sends for every consolidated text in force on a day. */
export function searchBody(day: string, offset: number): string {
  return JSON.stringify({
    general: {
      searchInText: false,
      searchInTitle: true,
      searchText: "",
      searchText2: "",
      logicalOperator: "AND",
      morphSearch: false,
      searchAfter: offset,
      sortAscending: true,
    },
    precise: {
      valislepingutega: false,
      reportNumber: null,
      reportNumberStart: null,
      reportNumberEnd: null,
      status: "KEHTIVAD_KEHTETUTETA",
      validDate: `${day}T00:00:00.000+00:00`,
      excludedFilterList: [],
    },
  });
}

interface SearchPage {
  kehtivad: number;
  results: {
    id: number;
    groupId: number;
    title: string;
    abbreviation: string | null;
    reportType: string;
    reportIssuer: string;
    reportDateStart: string;
    localGovernment: boolean;
  }[];
}

/** One page of the register as acts. */
export function actsOfPage(page: SearchPage): RtAct[] {
  return page.results.map((r) => ({
    id: String(r.id),
    groupId: String(r.groupId),
    title: r.title,
    abbreviation: r.abbreviation,
    type: r.reportType,
    issuer: r.reportIssuer,
    // The search states the day in Estonian time; the calendar day is what counts.
    inForceFrom: r.reportDateStart.slice(0, 10),
    local: r.localGovernment,
  }));
}

/**
 * Every consolidated text in force on `day`, page by page, politely paced.
 * `national` leaves out the municipalities' own regulations.
 */
export async function listInForce(
  day: string,
  doFetch: typeof fetch,
  options: {
    national?: boolean;
    pauseMs?: number;
    onPage?: (seen: number, total: number) => void;
  } = {},
): Promise<RtAct[]> {
  const out: RtAct[] = [];
  for (let offset = 0; ;) {
    const res = await doFetch(RIIGITEATAJA.searchUrl, {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": RIIGITEATAJA.userAgent },
      body: searchBody(day, offset),
    });
    if (!res.ok) throw new Error(`the register answered ${res.status} at ${offset}`);
    const page = (await res.json()) as SearchPage;
    const acts = actsOfPage(page);
    out.push(...acts.filter((a) => !options.national || !a.local));
    offset += page.results.length;
    options.onPage?.(offset, page.kehtivad);
    if (page.results.length === 0 || offset >= page.kehtivad) break;
    await new Promise((resolve) => setTimeout(resolve, options.pauseMs ?? 400));
  }
  return out;
}

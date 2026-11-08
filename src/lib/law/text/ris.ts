/**
 * Austria's federal law from the Rechtsinformationssystem des Bundes (RIS in
 * src/lib/config/law): the register of consolidated acts in force, read from the
 * OGD-RIS API's `Bundesrecht` query (application `BrKons`), and each act's whole
 * consolidated text, the one HTML page the API names for it, cut into its
 * sections, articles and annexes.
 *
 * What the API answers: one JSON document for every section (§), article or
 * annex of every act, each carrying the act's Gesetzesnummer, and one for the act
 * itself (Dokumenttyp "Norm", section "§ 0"), which holds the Kurztitel and the
 * Langtitel. The register asks only for those: the sections `§ 0` of the
 * consolidated acts in force today, a hundred to a page, so a page is a hundred
 * acts. Each document is checked on its way in, whatever the filter returned: an
 * act is listed once, by its Gesetzesnummer, from its own document when the page
 * has it.
 *
 * The text page (`GeltendeFassung.wxe`) holds the whole act in force today as
 * `<div class="documentContent">` blocks, each headed by the RIS's own marker in
 * `<h2 class="onlyScreenreader">`: "§ 0" (Langtitel and Präambel), "§ 4",
 * "Art. 2 § 4", "Art. 7", "Anl. 1". A provision's path here is that marker, with
 * "Anl." written "Anlage". The page says every number and every list point twice,
 * once for the eye and once for a screen reader (`class="sr-only"`: "Absatz eins,");
 * only the first is words of the law.
 */
import { RIS, type ActKind } from "@/lib/config/law";
import { USER_AGENT } from "../publishers/http";
import { closeOf } from "./eurlex";
import { WHOLE_ACT, type Provision } from "./fedlex";
import { blockText, decodeEntities } from "./html-text";

/** One act in force, as its own document in the register states it. */
export interface RisAct {
  /** The RIS's number for the act, shared by every document of it: `10001622`. */
  gesetzesnummer: string;
  /** The NOR number of the act's own document: `NOR40198929`. */
  nor: string | null;
  /** The Kurztitel; the first line of the Langtitel when there is none. */
  title: string;
  /** The Langtitel, as one line. */
  langtitel: string | null;
  /** The RIS's type of the act (`Typ`): BG, BVG, V, K, … */
  typ: string | null;
  kind: ActKind;
  /** The day the RIS last changed the act's document (`Geaendert`). */
  changed: string | null;
  /** The first day the act applied. */
  firstInForce: string | null;
  /** The act's whole consolidated text, on the RIS's site. */
  textUrl: string;
}

/** What the API answers is JSON from XML: an element that may repeat is an object once and a list twice. */
type Json = { [key: string]: unknown };
const asRecord = (value: unknown): Json =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Json) : {};
const asList = (value: unknown): unknown[] =>
  value === undefined || value === null ? [] : Array.isArray(value) ? value : [value];

/** A value as text: a string, or the `#text` of an element that also has attributes. */
function str(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number") return String(value);
  const text = asRecord(value)["#text"];
  return typeof text === "string" ? text.trim() || null : null;
}

const day = (value: unknown): string | null => {
  const text = str(value);
  return text && /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : null;
};

/** The RIS marks a line break in a title with `<br/>`; the rest of its markup is formatting. */
const titleLines = (title: string): string[] =>
  decodeEntities(title.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, ""))
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

/** The act's kind: from the RIS's type, else from the first word of its title. */
export function kindOf(typ: string | null, title: string): ActKind {
  // "K (Geltungsbereich)" is a K; "Vertrag – UNO" a Vertrag.
  const byType = typ ? (RIS.kindByTyp[typ] ?? RIS.kindByTyp[typ.split(/[\s(]/)[0]!]) : undefined;
  if (byType) return byType;
  const first = /^[\p{L}-]+/u.exec(title)?.[0];
  return (first && RIS.kindByLeadingWord[first]) || "other";
}

export const textUrlOf = (gesetzesnummer: string) =>
  RIS.textUrl.replace("{gesetzesnummer}", encodeURIComponent(gesetzesnummer));

/** The documents of an answer, in order, and how many the query matched in all. */
export interface RisPage {
  hits: number;
  documents: Json[];
}

/** An answer's documents; an error the API states in the answer becomes one. */
export function pageOf(body: unknown): RisPage {
  const result = asRecord(asRecord(body)["OgdSearchResult"]);
  const error = asRecord(result["Error"]);
  if (Object.keys(error).length > 0) {
    throw new Error(`RIS answered an error: ${str(error["Message"]) ?? JSON.stringify(error)}`);
  }
  const results = asRecord(result["OgdDocumentResults"]);
  const hits = Number(str(results["Hits"]) ?? 0);
  return {
    hits: Number.isFinite(hits) ? hits : 0,
    documents: asList(results["OgdDocumentReference"]).map(asRecord),
  };
}

/** The query's parameters in the API's own names; the default is the register's. */
export function queryOf(today: string, extra: Record<string, string | number>): URLSearchParams {
  return new URLSearchParams({
    Applikation: RIS.application,
    "Fassung.FassungVom": today,
    ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, String(v)])),
  });
}

/** The register's question: the acts' own sections ("§ 0") in force on `today`, a page of them. */
export const registerQuery = (today: string, page: number) =>
  queryOf(today, {
    "Abschnitt.Von": 0,
    "Abschnitt.Bis": 0,
    "Abschnitt.Typ": "Paragraph",
    DokumenteProSeite: "OneHundred",
    Seitennummer: page,
  });

/** The question for the latest day a section of an act took effect, on or before `today`. */
export const latestQuery = (gesetzesnummer: string, today: string) =>
  queryOf(today, {
    Gesetzesnummer: gesetzesnummer,
    "Sortierung.SortedByColumn": "Inkrafttretensdatum",
    "Sortierung.SortDirection": "Descending",
    DokumenteProSeite: "Ten",
    Seitennummer: 1,
  });

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * One question to the API. Asked again after a dropped connection or a 5xx, at most three
 * times; after a 429 the pause is longer, and the server's `Retry-After` is obeyed. Any other
 * answer is final.
 */
export async function ask(
  params: URLSearchParams,
  doFetch: typeof fetch,
  retryMs = 3000,
): Promise<RisPage> {
  const url = `${RIS.api}?${params}`;
  if (!(RIS.hosts as readonly string[]).includes(new URL(url).hostname)) {
    throw new Error(`not the RIS: ${url}`);
  }
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await doFetch(url, {
        headers: { accept: "application/json", "user-agent": USER_AGENT },
        signal: AbortSignal.timeout(120_000),
      });
      if (response.status === 429 || response.status >= 500) {
        const after = Number(response.headers.get("retry-after"));
        const wait = Number.isFinite(after) && after > 0 ? after * 1000 : retryMs * 5;
        last = new Error(`RIS answered ${response.status}`);
        await sleep(Math.min(wait, 120_000) * (attempt + 1));
        continue;
      }
      if (!response.ok) throw new Error(`RIS answered ${response.status}`);
      try {
        return pageOf(await response.json());
      } catch (error) {
        // An error the API states (a parameter it does not know) is final: asking again changes nothing.
        if (error instanceof Error && error.message.startsWith("RIS answered an error")) {
          throw Object.assign(error, { final: true });
        }
        throw new Error("RIS did not answer JSON");
      }
    } catch (error) {
      if ((error as { final?: boolean }).final) throw error;
      last = error;
      await sleep(retryMs * (attempt + 1));
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}

/** What a document of the API says about its act, or null when it names none. */
export function actOfDocument(
  document: Json,
  today: string,
): { act: RisAct; norm: boolean; inForce: boolean } | { skip: string } | null {
  const data = asRecord(document["Data"]);
  const meta = asRecord(data["Metadaten"]);
  const law = asRecord(meta["Bundesrecht"]);
  const cons = asRecord(law["BrKons"]);
  const gesetzesnummer = str(cons["Gesetzesnummer"]);
  if (!gesetzesnummer) return null;
  const nor = str(asRecord(meta["Technisch"])["ID"]);
  const lines = titleLines(str(law["Titel"]) ?? "");
  const short = titleLines(str(law["Kurztitel"]) ?? "")[0] ?? null;
  const title = short ?? lines[0];
  if (!title) return { skip: `${gesetzesnummer}: no title` };
  const typ = str(cons["Typ"]);
  const ends = day(cons["Ausserkrafttretensdatum"]);
  const url = str(cons["GesamteRechtsvorschriftUrl"]);
  const official =
    url && (RIS.hosts as readonly string[]).includes(safeHost(url)) && url.startsWith("https:")
      ? url
      : textUrlOf(gesetzesnummer);
  return {
    norm: str(cons["Dokumenttyp"]) === "Norm",
    inForce: !ends || ends > today,
    act: {
      gesetzesnummer,
      nor,
      title,
      langtitel: lines.length > 0 ? lines.join(" ") : null,
      typ,
      kind: kindOf(typ, lines[0] ?? title),
      changed: day(asRecord(meta["Allgemein"])["Geaendert"]),
      firstInForce: day(cons["Inkrafttretensdatum"]),
      textUrl: official,
    },
  };
}

const safeHost = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
};

/**
 * The acts of documents, each once, by Gesetzesnummer: the act's own document when the
 * documents hold it, else the first of its sections. An act that ended on or before `today`,
 * or has no title, is left out, with why.
 */
export function actsOfDocuments(
  documents: readonly Json[],
  today: string,
  into: Map<string, { act: RisAct; norm: boolean }> = new Map(),
  skipped: { act: string; reason: string }[] = [],
): {
  acts: Map<string, { act: RisAct; norm: boolean }>;
  skipped: { act: string; reason: string }[];
} {
  for (const document of documents) {
    const read = actOfDocument(document, today);
    if (!read) continue;
    if ("skip" in read) {
      skipped.push({ act: read.skip.split(":")[0]!, reason: read.skip.split(": ")[1]! });
      continue;
    }
    if (!read.inForce) {
      skipped.push({ act: read.act.gesetzesnummer, reason: "ended" });
      continue;
    }
    const kept = into.get(read.act.gesetzesnummer);
    if (!kept || (read.norm && !kept.norm)) into.set(read.act.gesetzesnummer, read);
  }
  return { acts: into, skipped };
}

/**
 * The consolidated acts in force on `today`, page by page, politely paced. `stopAfter` ends
 * the reading once that many acts are listed (a trial run does not need all of them).
 */
export async function listInForce(
  doFetch: typeof fetch,
  options: {
    today: string;
    pauseMs?: number;
    stopAfter?: number;
    onPage?: (page: number, acts: number, hits: number) => void;
  },
): Promise<{ acts: RisAct[]; skipped: { act: string; reason: string }[]; hits: number }> {
  const pauseMs = options.pauseMs ?? 1000;
  const acts = new Map<string, { act: RisAct; norm: boolean }>();
  const skipped: { act: string; reason: string }[] = [];
  let hits = 0;
  for (let page = 1; page <= 10_000; page++) {
    const answer = await ask(registerQuery(options.today, page), doFetch, pauseMs > 0 ? 3000 : 0);
    hits = answer.hits;
    actsOfDocuments(answer.documents, options.today, acts, skipped);
    options.onPage?.(page, acts.size, hits);
    if (
      answer.documents.length < RIS.pageSize ||
      page * RIS.pageSize >= hits ||
      acts.size >= (options.stopAfter ?? Infinity)
    ) {
      break;
    }
    await sleep(pauseMs);
  }
  return { acts: [...acts.values()].map((a) => a.act), skipped, hits };
}

/**
 * The latest day on or before `today` that a section of the act took effect: the day the text
 * in force today began, as the publisher dates it. Null when the API gives no section a day.
 */
export async function inForceFromOf(
  gesetzesnummer: string,
  today: string,
  doFetch: typeof fetch,
  retryMs?: number,
): Promise<string | null> {
  const { documents } = await ask(latestQuery(gesetzesnummer, today), doFetch, retryMs);
  const days = documents
    .map((d) =>
      day(
        asRecord(asRecord(asRecord(asRecord(d["Data"])["Metadaten"])["Bundesrecht"])["BrKons"])[
          "Inkrafttretensdatum"
        ],
      ),
    )
    .filter((d): d is string => d !== null && d <= today)
    .sort();
  return days.at(-1) ?? null;
}

/* ------------------------------------------------------------------ text -- */

/** The page's second voice, for a screen reader: "Absatz eins,", "Paragraph 1295,". */
const SCREEN_READER = /<span class="sr-only">[\s\S]*?<\/span>/g;

/** Plain text of a fragment of the RIS's HTML: one line per paragraph, heading and list point. */
export function risText(fragment: string): string {
  return blockText(
    fragment
      .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, "")
      .replace(SCREEN_READER, "")
      // A list point: its number in one block, its text in the next, on one line.
      .replace(
        /<div class="SymE\d"><div class="[^"]*">([\s\S]*?)<\/div><\/div>\s*<div class="content"><div class="[^"]*">/g,
        "$1 ",
      )
      // A subsection: its number, then its text, on one line.
      .replace(/(<span\b[^>]*class="Absatzzahl"[^>]*>[\s\S]*?<\/span>)/g, "$1 ")
      // A table row is one line: its cells side by side, as the eye reads them.
      .replace(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi, (_, row: string) => {
        const cells = [...row.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)]
          .map((c) => blockText(c[1]!).replace(/\n/g, " "))
          .filter(Boolean);
        return `<p>${cells.join(" ")}</p>`;
      })
      .replace(/<\/table>/gi, "</p>")
      .replace(/<\/h[1-6]>|<\/li>/gi, "</p>"),
  );
}

/** The RIS's marker of a section as a path: "Art. 2 § 4" stays, "Anl. 1" is "Anlage 1". */
export const pathOf = (marker: string): string =>
  decodeEntities(marker)
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\bAnl\.\s*/g, "Anlage ")
    .trim();

/** The content blocks of the page: one per section, article or annex, in order. */
function blocksOf(html: string): string[] {
  const open = /<div class="documentContent">/g;
  const out: string[] = [];
  let taken = 0;
  let m: RegExpExecArray | null;
  while ((m = open.exec(html))) {
    if (m.index < taken) continue;
    taken = closeOf(html, m.index);
    out.push(html.slice(m.index, taken));
  }
  return out;
}

/** What a block names but is not words of the law: the amendments, the transposition notes, the index. */
const NOT_TEXT = /^(?:Änderung|Umsetzungshinweis|Inhaltsverzeichnis|Schlagworte|Index)/i;

/** The words of one block: its containers except the apparatus, each without its label. */
function wordsOf(block: string): string {
  const containers = /<div id="[^"]*Container[^"]*" class="p(?: embeddedContent)?">/g;
  const parts: string[] = [];
  let taken = 0;
  let m: RegExpExecArray | null;
  while ((m = containers.exec(block))) {
    if (m.index < taken) continue;
    taken = closeOf(block, m.index);
    let inner = block.slice(m.index + m[0].length, taken - "</div>".length);
    const label = /^\s*<h3\b[^>]*>([\s\S]*?)<\/h3>/i.exec(inner);
    const name = label ? blockText(label[1]!) : "";
    if (NOT_TEXT.test(name)) continue;
    if (label) inner = inner.slice(label[0].length);
    // The contents of the act's opening, a table of its sections, is the publisher's aid.
    if (/^Präambel/i.test(name)) inner = inner.replace(/<table\b[\s\S]*?<\/table>/gi, "");
    const text = risText(inner);
    if (text) parts.push(text);
  }
  return parts.join("\n");
}

/** A section's own heading ("Grundrecht auf Datenschutz"), when it has one. */
function subjectOf(block: string): string {
  const heading = /<h\d\b[^>]*class="UeberschrPara[^"]*"[^>]*>([\s\S]*?)<\/h\d>/i.exec(block);
  return heading ? risText(heading[1]!).replace(/\s+/g, " ").trim() : "";
}

/**
 * Every path once: an act can carry a marker twice (a section, and its replacement). The
 * second is `§ 5-2`.
 */
function unique(provisions: Provision[]): Provision[] {
  const seen = new Map<string, number>();
  return provisions.map((p) => {
    const n = (seen.get(p.path) ?? 0) + 1;
    seen.set(p.path, n);
    return n === 1 ? p : { ...p, path: `${p.path}-${n}` };
  });
}

/**
 * The provisions of an act as the RIS's page serves it: "§ 0" (the Langtitel and the
 * Präambel), then each section, article and annex under its own marker. A page whose
 * blocks carry no marker is one provision, `text`, so none of its words are lost.
 */
export function parseRisHtml(html: string): Provision[] {
  const body = html.replace(/^[\s\S]*?<body\b[^>]*>/i, "").replace(/<\/body>[\s\S]*$/i, "");
  const out: Provision[] = [];
  const unmarked: string[] = [];
  for (const block of blocksOf(body)) {
    const marker = /<h2 class="onlyScreenreader">([\s\S]*?)<\/h2>/i.exec(block)?.[1];
    const text = wordsOf(block);
    if (!text) continue;
    if (!marker) {
      unmarked.push(text);
      continue;
    }
    const path = pathOf(marker);
    const subject = subjectOf(block);
    out.push({
      path,
      heading: path === "§ 0" ? "Langtitel" : subject ? `${path} ${subject}` : path,
      text,
    });
  }
  if (out.length === 0 && unmarked.length > 0) {
    return [{ path: WHOLE_ACT, heading: "", text: unmarked.join("\n") }];
  }
  return unique(out);
}

/** True when the bytes are an act's page from the RIS, not an error or a notice in its place. */
export function isActPage(html: string): boolean {
  return /<div class="documentContent"/.test(html);
}

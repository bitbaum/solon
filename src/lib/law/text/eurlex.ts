/**
 * The European Union's legislation from the Publications Office (EURLEX in
 * src/lib/config/law): the register of regulations and directives in force,
 * read from Cellar's SPARQL endpoint, and each act's English text from
 * EUR-Lex as HTML, cut into its articles and annexes.
 *
 * The register is read a year at a time (the CELEX number's year), so no
 * query asks the endpoint to sort more rows than it will (its sorted pages
 * stop at 10,000). Two questions per year: the acts in force, with their
 * English title and the day each entered into force; and the consolidated
 * versions of that year's acts, whose CELEX numbers carry the day each
 * applies from (`02016R0679-20160504`). An act is read in its latest
 * consolidated version that has begun; an act never amended has none, and is
 * read as the Official Journal published it, dated by its entry into force.
 *
 * EUR-Lex marks each article `<div class="eli-subdivision" id="art_1">` and
 * each annex `id="anx_I"`, the European Legislation Identifier's anchors, so a
 * provision's path here is its anchor there. Older acts, published before
 * those anchors, are cut on their article headings ("Article 12a" → `art_12a`).
 */
import { EURLEX } from "@/lib/config/law";
import { USER_AGENT } from "../publishers/http";
import { WHOLE_ACT, type Provision } from "./fedlex";
import { blockText } from "./html-text";

/** One act in force, as the register states it. */
export interface EuAct {
  /** The act's CELEX number: `32016R0679`. */
  celex: string;
  /** Its English title, as the Publications Office states it. */
  title: string;
  /** R (regulation) or L (directive), from the CELEX number. */
  type: string;
  /** The earliest day the register says it entered into force, else the day of the document. */
  inForceFrom: string;
  /** The text to read: the latest consolidated version begun by `today`, or the act itself. */
  text: { celex: string; date: string; consolidated: boolean };
}

const PREFIXES = `PREFIX cdm: <http://publications.europa.eu/ontology/cdm#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>`;

/** A row per act, title and day of entry into force; an act with several of either has several rows. */
export const PAGE = 5000;

/**
 * The regulations and directives of one year that the register marks in force.
 * The CELEX number decides the year and the type (R, L); corrigenda (`R(01)`)
 * and other sectors do not match.
 */
export function inForceQuery(year: number, offset: number): string {
  return `${PREFIXES}
SELECT DISTINCT ?celex ?title ?force ?date WHERE {
  ?work cdm:resource_legal_id_celex ?celex ;
        cdm:resource_legal_in-force ?inForce .
  FILTER(STR(?inForce) = "true" && REGEX(STR(?celex), "^3${year}[RL][0-9]{4}$"))
  OPTIONAL { ?work cdm:resource_legal_date_entry-into-force ?force }
  OPTIONAL { ?work cdm:work_date_document ?date }
  OPTIONAL {
    ?expression cdm:expression_belongs_to_work ?work ;
                cdm:expression_uses_language <http://publications.europa.eu/resource/authority/language/${EURLEX.cdmLanguage}> ;
                cdm:expression_title ?title .
  }
} ORDER BY ?celex LIMIT ${PAGE} OFFSET ${offset}`;
}

/** Every consolidated version of one year's regulations and directives, by its CELEX number. */
export function consolidatedQuery(year: number, offset: number): string {
  return `${PREFIXES}
SELECT DISTINCT ?celex WHERE {
  ?work cdm:resource_legal_id_celex ?celex .
  FILTER(REGEX(STR(?celex), "^0${year}[RL][0-9]{4}-[0-9]{8}$"))
} ORDER BY ?celex LIMIT ${PAGE} OFFSET ${offset}`;
}

type Binding = Record<string, { value: string } | undefined>;

/** A title as one line: the Publications Office separates some parts with `#`. */
export const cleanTitle = (title: string) => title.replace(/#/g, " ").replace(/\s+/g, " ").trim();

const day = (value: string | undefined) =>
  value && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null;

/**
 * The acts in rows of `inForceQuery`, each once: the first English title, the
 * earliest day of entry into force (an act whose articles start on different
 * days has several), else the day of the document. An act without an English
 * title or any date is left out, with why.
 */
export function actsOfRows(rows: readonly Binding[]): {
  acts: Omit<EuAct, "text">[];
  skipped: { celex: string; reason: string }[];
} {
  const seen = new Map<
    string,
    { title: string | null; force: string | null; date: string | null }
  >();
  for (const row of rows) {
    const celex = row.celex?.value;
    if (!celex) continue;
    const kept = seen.get(celex) ?? { title: null, force: null, date: null };
    const title = row.title?.value ? cleanTitle(row.title.value) : null;
    const force = day(row.force?.value);
    const date = day(row.date?.value);
    seen.set(celex, {
      title: kept.title ?? title,
      force: force && (!kept.force || force < kept.force) ? force : kept.force,
      date: kept.date ?? date,
    });
  }
  const acts: Omit<EuAct, "text">[] = [];
  const skipped: { celex: string; reason: string }[] = [];
  for (const [celex, { title, force, date }] of seen) {
    const from = force ?? date;
    if (!title) skipped.push({ celex, reason: "no English title" });
    else if (!from) skipped.push({ celex, reason: "no date" });
    else acts.push({ celex, title, type: celex.charAt(5), inForceFrom: from });
  }
  return { acts, skipped };
}

/** `02016R0679-20160504` → the act `32016R0679` and the day `2016-05-04`; null for anything else. */
export function consolidationOf(celex: string): { act: string; date: string } | null {
  const m = /^0(\d{4}[RL]\d{4})-(\d{4})(\d{2})(\d{2})$/.exec(celex);
  return m ? { act: `3${m[1]}`, date: `${m[2]}-${m[3]}-${m[4]}` } : null;
}

/** The latest consolidated version of each act that has begun by `today`, by the act's CELEX number. */
export function latestConsolidations(
  celexes: readonly string[],
  today: string,
): Map<string, { celex: string; date: string }> {
  const out = new Map<string, { celex: string; date: string }>();
  for (const celex of celexes) {
    const c = consolidationOf(celex);
    if (!c || c.date > today) continue;
    const kept = out.get(c.act);
    if (!kept || kept.date < c.date) out.set(c.act, { celex, date: c.date });
  }
  return out;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** One query's rows. The endpoint drops a connection now and then; a query is asked again, at most three times. */
export async function sparql(
  query: string,
  doFetch: typeof fetch,
  retryMs = 3000,
): Promise<Binding[]> {
  const host = new URL(EURLEX.sparql).hostname;
  if (!(EURLEX.hosts as readonly string[]).includes(host)) throw new Error(`not Cellar: ${host}`);
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await doFetch(EURLEX.sparql, {
        method: "POST",
        headers: {
          accept: "application/sparql-results+json",
          "content-type": "application/x-www-form-urlencoded",
          "user-agent": USER_AGENT,
        },
        body: new URLSearchParams({ query }).toString(),
        signal: AbortSignal.timeout(180_000),
      });
      if (!response.ok) throw new Error(`cellar sparql answered ${response.status}`);
      const json = (await response.json()) as { results?: { bindings?: Binding[] } };
      return json.results?.bindings ?? [];
    } catch (error) {
      last = error;
      await sleep(retryMs * (attempt + 1));
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}

/** Every page of a query of one year, in order. */
async function allPages(
  query: (offset: number) => string,
  doFetch: typeof fetch,
  pauseMs: number,
): Promise<Binding[]> {
  const rows: Binding[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const page = await sparql(query(offset), doFetch, pauseMs > 0 ? 3000 : 0);
    rows.push(...page);
    if (page.length < PAGE) return rows;
    await sleep(pauseMs);
  }
}

/**
 * The regulations and directives in force, each with the text to read, year
 * by year from `EURLEX.firstYear` to this one, politely paced. `years` reads
 * only those (a test, or a run that wants one year).
 */
export async function listInForce(
  doFetch: typeof fetch,
  options: {
    today: string;
    years?: readonly number[];
    pauseMs?: number;
    onYear?: (year: number, acts: number) => void;
  },
): Promise<{ acts: EuAct[]; skipped: { celex: string; reason: string }[] }> {
  const pauseMs = options.pauseMs ?? 1000;
  const last = Number(options.today.slice(0, 4));
  const years =
    options.years ??
    Array.from({ length: last - EURLEX.firstYear + 1 }, (_, i) => EURLEX.firstYear + i);
  const acts: EuAct[] = [];
  const skipped: { celex: string; reason: string }[] = [];
  for (const year of years) {
    const listed = actsOfRows(await allPages((o) => inForceQuery(year, o), doFetch, pauseMs));
    skipped.push(...listed.skipped);
    if (listed.acts.length > 0) {
      await sleep(pauseMs);
      const consolidated = latestConsolidations(
        (await allPages((o) => consolidatedQuery(year, o), doFetch, pauseMs)).flatMap(
          (row) => row.celex?.value ?? [],
        ),
        options.today,
      );
      for (const act of listed.acts) {
        const c = consolidated.get(act.celex);
        acts.push({
          ...act,
          text: c
            ? { celex: c.celex, date: c.date, consolidated: true }
            : { celex: act.celex, date: act.inForceFrom, consolidated: false },
        });
      }
    }
    options.onYear?.(year, listed.acts.length);
    await sleep(pauseMs);
  }
  return { acts, skipped };
}

export const htmlUrlOf = (celex: string) => EURLEX.htmlUrl.replace("{celex}", celex);
export const pageUrlOf = (celex: string) => EURLEX.pageUrl.replace("{celex}", celex);

/* ------------------------------------------------------------------ text -- */

/** EUR-Lex's amendment marks in a consolidated text (▼M3, ►C1, ◄): the publisher's apparatus, not words of the law. */
const MARKS = /[▼►][A-Z]{1,2}\d*|◄/g;

/**
 * A table row as one line, innermost rows first: an enumeration is laid out as
 * a row of its number and its text ("(a)", "the data subject has given
 * consent"), and a point inside a point is a table inside the cell.
 */
function flattenRows(fragment: string): string {
  const innermost = /<tr\b[^>]*>((?:(?!<tr\b)[\s\S])*?)<\/tr>/i;
  let out = fragment;
  for (let guard = 0; guard < 100_000 && innermost.test(out); guard++) {
    out = out.replace(innermost, (_, row: string) => {
      const cells = [...row.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) =>
        blockText(c[1]!),
      );
      const [first = "", ...rest] = cells.filter(Boolean);
      const lines = [first, ...rest].join("\n").split("\n");
      // The number and the first line of the text are one line; what follows keeps its own.
      const joined =
        rest.length > 0 ? [`${first} ${lines[1] ?? ""}`.trim(), ...lines.slice(2)] : lines;
      return `<p>${joined.join("</p><p>")}</p>`;
    });
  }
  return out.replace(/<\/?(?:table|tbody|thead|colgroup)\b[^>]*>|<col\b[^>]*>/gi, "");
}

/** Plain text of a fragment of EUR-Lex HTML: one line per paragraph and per point. */
export function eurlexText(fragment: string): string {
  return blockText(
    flattenRows(
      fragment
        .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, "")
        .replace(/<span class="oj-super[^"]*"[^>]*>([\s\S]*?)<\/span>/g, "$1")
        // A consolidated paragraph: its number, then its text in a block beside it, on one line.
        .replace(
          /(<span class="no-parag"[^>]*>[\s\S]*?<\/span>)\s*<div\b[^>]*class="inline-element"[^>]*>/g,
          "$1 ",
        )
        // A consolidated point: its letter in one column, its text in the next, on one line.
        .replace(/<\/div>\s*<div\b[^>]*class="[^"]*grid-list-column-2[^"]*"[^>]*>/g, " ")
        .replace(MARKS, ""),
    ),
  );
}

/** Where the `<div>` opening at `start` closes: the index just past its `</div>`. */
function closeOf(html: string, start: number): number {
  const tag = /<div\b|<\/div>/gi;
  tag.lastIndex = start + 1;
  let depth = 1;
  let m: RegExpExecArray | null;
  while ((m = tag.exec(html))) {
    depth += m[0].toLowerCase() === "</div>" ? -1 : 1;
    if (depth === 0) return m.index + m[0].length;
  }
  return html.length;
}

/** The leading paragraphs whose class makes them a heading, as one line, and the fragment without them. */
function headed(fragment: string, heading: RegExp, max: number): { heading: string; body: string } {
  const parts: string[] = [];
  let body = fragment;
  const para = /<p\b[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/p>/gi;
  for (let i = 0; i < max; i++) {
    para.lastIndex = 0;
    const m = para.exec(body);
    if (!m || !heading.test(m[1]!)) break;
    // Only markup may stand before a heading: text first means the heading is further in.
    if (eurlexText(body.slice(0, m.index))) break;
    parts.push(eurlexText(m[2]!).replace(/\n/g, " "));
    body = body.slice(m.index + m[0].length);
  }
  return { heading: parts.filter(Boolean).join(" "), body };
}

const ARTICLE_HEADING = /\b(?:oj-)?s?ti-art\b|\bs?title-article-norm\b/;
const ANNEX_HEADING = /\b(?:oj-)?doc-ti\b|\btitle-annex-\d\b|\b(?:oj-)?ti-grseq-1\b/;

/** The provisions marked with the ELI's anchors: the preamble, each article, each annex, in order. */
function anchored(html: string): Provision[] {
  const open = /<div\b[^>]*\bid="((?:art|anx|pbl)_[0-9A-Za-z]+)"[^>]*>/g;
  const out: Provision[] = [];
  let taken = 0;
  let m: RegExpExecArray | null;
  while ((m = open.exec(html))) {
    if (m.index < taken) continue;
    const end = closeOf(html, m.index);
    taken = end;
    const path = m[1]!;
    const inner = html.slice(m.index + m[0].length, end - "</div>".length);
    if (path.startsWith("art_")) {
      const { heading, body } = headed(inner, ARTICLE_HEADING, 2);
      out.push({ path, heading: heading || path, text: eurlexText(body) });
    } else if (path.startsWith("anx_")) {
      const { heading, body } = headed(inner, ANNEX_HEADING, 2);
      out.push({ path, heading: heading || path, text: eurlexText(body) });
    } else {
      out.push({ path, heading: "Preamble", text: eurlexText(inner) });
    }
  }
  return out;
}

/** "Article 12a" → `art_12a`; "ANNEX II" → `anx_II`, the anchors EUR-Lex gives the same parts of newer acts. */
const anchorOf = (heading: string): string | null => {
  const article = /^Article\s+([0-9]+[a-z]*)\b/i.exec(heading);
  if (article) return `art_${article[1]!.toLowerCase()}`;
  const annex = /^ANNEX(?:\s+([0-9A-Z]+))?\b/i.exec(heading);
  if (annex) return `anx_${annex[1] ?? "1"}`;
  return null;
};

/** An older act, laid out before the ELI's anchors: cut on its article and annex headings. */
function byHeadings(html: string): Provision[] {
  const marks = [
    ...html.matchAll(/<p\b[^>]*class="(?:ti-art|doc-ti)"[^>]*>([\s\S]*?)<\/p>/gi),
  ].flatMap((m) => {
    const heading = eurlexText(m[1]!).replace(/\n/g, " ");
    const path = anchorOf(heading);
    return path ? [{ path, heading, at: m.index!, after: m.index! + m[0].length }] : [];
  });
  return marks.map((mark, i) => {
    let body = html.slice(mark.after, marks[i + 1]?.at ?? html.length);
    let heading = mark.heading;
    // An article's subject heading follows its number.
    const sub = /^\s*<p\b[^>]*class="sti-art"[^>]*>([\s\S]*?)<\/p>/i.exec(body);
    if (sub) {
      heading = `${heading} ${eurlexText(sub[1]!).replace(/\n/g, " ")}`;
      body = body.slice(sub[0].length);
    }
    return { path: mark.path, heading, text: eurlexText(body) };
  });
}

/**
 * Every path once: a consolidated text can carry an article twice (one
 * replaced and its replacement, both marked). The second is `art_5-2`.
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
 * The provisions of an act as EUR-Lex serves its HTML: the preamble, the
 * articles and the annexes under EUR-Lex's own anchors; an older act's
 * articles under the anchors EUR-Lex gives newer ones; and an act laid out in
 * neither way as one provision, `text`, so none of its words are lost.
 */
export function parseEurLexHtml(html: string): Provision[] {
  const body = html.replace(/^[\s\S]*?<body\b[^>]*>/i, "").replace(/<\/body>[\s\S]*$/i, "");
  const found = anchored(body);
  if (found.some((p) => p.path.startsWith("art_"))) return unique(found);
  const older = byHeadings(body);
  if (older.length > 0) return unique(older);
  const text = eurlexText(body);
  return text ? [{ path: WHOLE_ACT, heading: "", text }] : [];
}

/** True when the bytes are an act's page from EUR-Lex, not an error or a notice in its place. */
export function isActPage(html: string): boolean {
  return (
    /class="(?:[^"]*\s)?(?:eli-subdivision|oj-ti-art|ti-art|title-article-norm|oj-doc-ti|doc-ti)\b/.test(
      html,
    ) || /<div\b[^>]*\bid="(?:TexteOnly|document1|textTabContent)"/.test(html)
  );
}

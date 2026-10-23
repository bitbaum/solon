/**
 * Reads the Confederation's consolidated acts from Fedlex (design L1): which
 * version of each act applies on a day, and the text of that version.
 *
 * Two public, keyless services run by the Federal Chancellery: the SPARQL
 * endpoint, which names every consolidated version and where its HTML is, and
 * the file store that serves the HTML. No search engine sits in between.
 */
import { FEDLEX } from "@/lib/config/law";

const SPARQL = "https://fedlex.data.admin.ch/sparqlendpoint";
const USER_AGENT = "solon-law-text (cato@orangecat.ch)";

export interface FedlexVersion {
  /** https://fedlex.data.admin.ch/eli/cc/27/317_321_377 */
  eli: string;
  /** The systematic number (SR): 220. */
  sr: string;
  /** First day this consolidated version applies, YYYY-MM-DD. */
  date: string;
  /** Where the HTML is. */
  url: string;
}

export interface Provision {
  path: string;
  heading: string;
  text: string;
}

type Fetch = typeof fetch;

/**
 * The version of every act that applies on `day`, in `lang`: the latest that
 * began by then and had not ended (a repealed act's last version has ended). One query for the whole Classified Compilation (the
 * `eli/cc` acts; the Official Compilation's `eli/oc` entries share their numbers).
 */
export async function listVersionsOn(
  day: string,
  lang: string,
  doFetch: Fetch = fetch,
): Promise<FedlexVersion[]> {
  const code = FEDLEX.languages[lang];
  if (!code) throw new Error(`fedlex does not serve language ${lang}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error(`day must be an ISO date: ${day}`);
  const query = `PREFIX jolux: <http://data.legilux.public.lu/resource/ontology/jolux#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
SELECT ?cc ?n ?date ?url WHERE {
  ?cc jolux:classifiedByTaxonomyEntry/skos:notation ?n .
  FILTER(STRSTARTS(STR(?cc), "https://fedlex.data.admin.ch/eli/cc/"))
  ?cons jolux:isMemberOf ?cc ; jolux:dateApplicability ?date ; jolux:isRealizedBy ?expr .
  OPTIONAL { ?cons jolux:dateEndApplicability ?end }
  FILTER(?date <= "${day}"^^<http://www.w3.org/2001/XMLSchema#date>)
  FILTER(!BOUND(?end) || ?end >= "${day}"^^<http://www.w3.org/2001/XMLSchema#date>)
  ?expr jolux:language <http://publications.europa.eu/resource/authority/language/${code}> ;
        jolux:isEmbodiedBy ?m .
  ?m jolux:userFormat <https://fedlex.data.admin.ch/vocabulary/user-format/html> ; jolux:isExemplifiedBy ?url .
}`;
  const response = await doFetch(SPARQL, {
    method: "POST",
    headers: {
      accept: "application/sparql-results+json",
      "content-type": "application/x-www-form-urlencoded",
      "user-agent": USER_AGENT,
    },
    body: new URLSearchParams({ query }).toString(),
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) throw new Error(`fedlex sparql: HTTP ${response.status}`);
  const rows =
    ((await response.json()) as { results?: { bindings?: Record<string, { value: string }>[] } })
      .results?.bindings ?? [];
  const latest = new Map<string, FedlexVersion>();
  for (const row of rows) {
    const version = {
      eli: row.cc!.value,
      sr: row.n!.value,
      date: row.date!.value,
      url: row.url!.value,
    };
    const key = `${version.eli}|${version.sr}`;
    const kept = latest.get(key);
    if (!kept || kept.date < version.date) latest.set(key, version);
  }
  return [...latest.values()];
}

export async function fetchHtml(url: string, doFetch: Fetch = fetch): Promise<Uint8Array> {
  const response = await doFetch(url, {
    headers: { "user-agent": USER_AGENT },
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) throw new Error(`fedlex file store: HTTP ${response.status} for ${url}`);
  return new Uint8Array(await response.arrayBuffer());
}

/** A fragment of Fedlex HTML as plain text. Paragraph numbers stay; footnote marks go. */
function plain(fragment: string, keepBreaks = false): string {
  let s = fragment
    .replace(/<sup>\s*<a[\s\S]*?<\/a>\s*<\/sup>/g, "")
    .replace(/<sup>(\d+)<\/sup>/g, "$1 ")
    .replace(/<\/(p|dd|li|div|tr)>|<br\s*\/?>/g, keepBreaks ? "\n" : " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)));
  s = s.replace(/[ \t]+/g, " ");
  return keepBreaks
    ? s
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .join("\n")
    : s.replace(/\s+/g, " ").trim();
}

/** The path of the one provision of an act that has no articles. */
export const WHOLE_ACT = "text";

const ARTICLE = /<article id="([^"]+)"[^>]*>([\s\S]*?)<\/article>/g;

/**
 * The articles of a consolidated act, in order, each under the publisher's own
 * anchor. Preambles, annexes and transitional provisions that Fedlex does not
 * wrap in an article stay in the snapshot but are not provisions here.
 *
 * An act with no articles (an exchange of notes, a decree) is one provision,
 * `text`, holding the whole page as plain text, so its words are not lost.
 */
export function parseProvisions(html: string): Provision[] {
  const out: Provision[] = [];
  const seen = new Set<string>();
  for (const match of html.matchAll(ARTICLE)) {
    const path = match[1]!;
    if (seen.has(path)) continue;
    seen.add(path);
    const block = match[2]!;
    const heading = /<h6[^>]*>([\s\S]*?)<\/h6>/.exec(block)?.[1] ?? "";
    const headingEnd = block.indexOf("</h6>");
    const body = headingEnd < 0 ? block : block.slice(headingEnd + 5);
    out.push({ path, heading: plain(heading), text: plain(body, true) });
  }
  if (out.length === 0) {
    const start = html.indexOf('<div id="lawcontent"');
    if (start >= 0) {
      const body = html.slice(start);
      const title = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(body)?.[1] ?? "";
      const text = plain(body, true);
      if (text) out.push({ path: WHOLE_ACT, heading: plain(title), text });
    }
  }
  return out;
}

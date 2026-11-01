/**
 * Reads Luxembourg's consolidated acts from Legilux (design: law-as-data,
 * "Luxembourg"): every act in force with its applicable consolidated version,
 * and the text of that version, cut into its articles.
 *
 * Legilux marks the version that applies today `applicable`; each act has
 * exactly one. Its HTML wraps each article in `<div class="richtext_article"
 * id="art_…">` with the number as `Art. 100-1.`.
 */
import { LEGILUX } from "@/lib/config/law";
import type { Provision } from "./fedlex";

const USER_AGENT = "solon-law-text (cato@orangecat.ch)";
const PAGE = 1000;

export interface LegiluxVersion {
  /** The act: http://data.legilux.public.lu/eli/etat/leg/loi/1915/08/10/n1 */
  work: string;
  /** This consolidated version. */
  consolidation: string;
  /** First day it applies, YYYY-MM-DD. */
  date: string;
  /** The act's title, without "Version consolidée applicable au …:". */
  title: string;
  /** Legilux's document type: LOI, RGD, CODE … */
  type: string;
  /** Where the HTML is. */
  url: string;
}

const query = (
  offset: number,
) => `PREFIX jolux: <http://data.legilux.public.lu/resource/ontology/jolux#>
SELECT ?work ?cons ?date ?title ?type ?url WHERE {
  ?cons a jolux:Consolidation ; jolux:isMemberOf ?work ; jolux:dateApplicability ?date ;
        jolux:typeDocument ?type ; jolux:isRealizedBy ?e ;
        jolux:inForceStatus <http://data.legilux.public.lu/resource/authority/application-status/applicable> .
  ?e jolux:title ?title ; jolux:isEmbodiedBy ?m .
  ?m jolux:format <http://publications.europa.eu/resource/authority/file-type/HTML> ; jolux:isExemplifiedBy ?url .
} ORDER BY ?cons LIMIT ${PAGE} OFFSET ${offset}`;

/** "Version consolidée applicable au 02/06/2026 : Loi du 10 août 1915 …" → "Loi du 10 août 1915 …". */
export const actTitle = (title: string) =>
  title.replace(/^Version (?:consolidée|rectifiée)[^:]*:\s*/i, "").trim();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function sparql(
  body: string,
  doFetch: typeof fetch,
): Promise<Record<string, { value: string }>[]> {
  let last: unknown;
  // The endpoint drops a connection now and then; a page is asked again, at most three times.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await doFetch(LEGILUX.sparql, {
        method: "POST",
        headers: {
          accept: "application/sparql-results+json",
          "content-type": "application/x-www-form-urlencoded",
          "user-agent": USER_AGENT,
        },
        body: new URLSearchParams({ query: body }).toString(),
        signal: AbortSignal.timeout(180_000),
      });
      if (!response.ok) throw new Error(`legilux sparql: HTTP ${response.status}`);
      const json = (await response.json()) as {
        results?: { bindings?: Record<string, { value: string }>[] };
      };
      return json.results?.bindings ?? [];
    } catch (error) {
      last = error;
      await sleep(3000 * (attempt + 1));
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}

/** Every act's applicable consolidated version, one per act, page by page. */
export async function listApplicable(doFetch: typeof fetch = fetch): Promise<LegiluxVersion[]> {
  const out = new Map<string, LegiluxVersion>();
  for (let offset = 0; ; offset += PAGE) {
    const rows = await sparql(query(offset), doFetch);
    for (const row of rows) {
      const version: LegiluxVersion = {
        work: row.work!.value,
        consolidation: row.cons!.value,
        date: row.date!.value.slice(0, 10),
        title: actTitle(row.title!.value),
        type: row.type!.value.split("/").pop()!,
        url: row.url!.value.replace(/^http:/, "https:"),
      };
      const kept = out.get(version.work);
      if (!kept || kept.date < version.date) out.set(version.work, version);
    }
    if (rows.length < PAGE) break;
  }
  return [...out.values()];
}

export async function fetchLegilux(
  url: string,
  doFetch: typeof fetch = fetch,
): Promise<Uint8Array> {
  const host = new URL(url).hostname;
  if (!(LEGILUX.hosts as readonly string[]).includes(host))
    throw new Error(`not a Legilux address: ${url}`);
  const response = await doFetch(url, {
    headers: { "user-agent": USER_AGENT },
    signal: AbortSignal.timeout(180_000),
  });
  if (!response.ok) throw new Error(`legilux file store: HTTP ${response.status} for ${url}`);
  return new Uint8Array(await response.arrayBuffer());
}

const text = (fragment: string) =>
  fragment
    .replace(/<span[^>]*display:\s*none[^>]*>[\s\S]*?<\/span>/gi, "")
    .replace(/<sup[^>]*>\s*(\d+)\s*<\/sup>/g, "$1")
    .replace(/<\/(p|div|li|tr)>|<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/​/g, "")
    .replace(/&nbsp;| /g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");

/**
 * The articles of a consolidated act, each under Legilux's own anchor
 * (`art_100-1`), headed by its number ("Art. 100-1."). An article's text runs
 * to the next article; titles and chapters between them are dropped from the
 * text, as Fedlex's are. An act with no articles is one provision, `text`.
 */
export function parseLegiluxProvisions(html: string): Provision[] {
  const starts = [...html.matchAll(/<div id="(art_[^"]+)" class="richtext_article"[^>]*>/g)];
  if (starts.length === 0) {
    const body = text(html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ""));
    return body ? [{ path: "text", heading: "", text: body }] : [];
  }
  const out: Provision[] = [];
  const seen = new Set<string>();
  starts.forEach((m, i) => {
    const path = m[1]!;
    if (seen.has(path)) return;
    seen.add(path);
    const end = starts[i + 1]?.index ?? html.length;
    const block = html.slice(m.index! + m[0].length, end);
    const number = /class="[^"]*richtext_num_article[^"]*"[^>]*>([\s\S]*?)<\/p>/.exec(block);
    // The number is the bold text; the buttons beside it ("Modifications 1") are not.
    const bold = number ? /<b[^>]*>([\s\S]*?)<\/b>/.exec(number[1]!) : null;
    const heading = (bold ? text(bold[1]!) : path).replace(/\s+/g, " ").replace(/\.$/, "");
    // Everything after the number; a chapter heading before the next article (a div that is not an alinea) is not this article's text.
    const after = number ? block.slice(number.index + number[0].length) : block;
    const own = after.split(
      /<div class="(?!richtext_alinea)[^"]*richtext_(?:titre|chapitre|section|livre|partie|sous)/,
    )[0]!;
    const body = text(own);
    out.push({ path, heading, text: body });
  });
  return out;
}

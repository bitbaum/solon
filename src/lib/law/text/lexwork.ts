/**
 * Reads a commune's LexWork collection (Sitrox; <commune>.tlex.ch) as data. The
 * app's own interface is open and needs no login: the list of acts, each act
 * by its systematic number with the dated versions and the article tree of the
 * version asked for. Nothing is solved or avoided; robots.txt on these hosts
 * blocks only the search endpoints, which are not used.
 */
import { LEXWORK } from "@/lib/config/law";
import { blockText, decodeEntities } from "./html-text";
import { WHOLE_ACT, type Provision } from "./fedlex";

const USER_AGENT = "solon-law-text (cato@orangecat.ch)";
const LANG = LEXWORK.locale;

export interface LexworkListed {
  systematicNumber: string;
  title: string;
  abrogated: boolean;
}

/** A version the collection names: its id and the day it took effect. */
export interface LexworkVersionRef {
  id: number;
  /** ISO day, or null when the collection words it in a way not read. */
  inForceFrom: string | null;
}

interface Node {
  uid?: string;
  type?: string;
  number?: Record<string, string>;
  text?: Record<string, string>;
  html_content?: Record<string, string>;
  children?: Node[];
}

export interface LexworkAct {
  text_of_law: {
    systematic_number: string;
    title: string;
    canonical_link: string;
    abrogated: boolean;
    current_version: { id: number; version_dates_str?: string };
    old_versions: { id: number; version_dates_str?: string }[];
    future_versions: { id: number; version_dates_str?: string }[];
    selected_version: {
      id: number;
      version_dates_str?: string;
      /** The version's PDF; older versions have only this, no article tree. */
      pdf_link_tol?: string | null;
      json_content?: { document?: { content?: Node } };
    };
  };
}

/** Only these hosts are read. */
export const lexworkHosts = (): string[] => LEXWORK.instances.map((i) => i.host);

async function getJson<T>(host: string, path: string, doFetch: typeof fetch): Promise<T | null> {
  if (!lexworkHosts().includes(host)) throw new Error(`${host} is not a configured LexWork host`);
  const response = await doFetch(`https://${host}${path}`, {
    headers: { "user-agent": USER_AGENT, accept: "application/json" },
    signal: AbortSignal.timeout(90_000),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`${host}${path}: HTTP ${response.status}`);
  return (await response.json()) as T;
}

/** The commune's acts, by systematic number. */
export async function fetchLexworkIndex(
  host: string,
  doFetch: typeof fetch = fetch,
): Promise<LexworkListed[]> {
  const grouped = await getJson<Record<string, Record<string, unknown>[]>>(
    host,
    `/api/${LANG}/texts_of_law/lightweight_index`,
    doFetch,
  );
  if (!grouped) throw new Error(`${host}: no list of acts`);
  const out = Object.values(grouped)
    .flat()
    .map((a) => ({
      systematicNumber: String(a.systematic_number),
      title: String(a.title),
      abrogated: Boolean(a.abrogated),
    }));
  // A list that comes back empty is a changed interface, never "no acts".
  if (out.length === 0) throw new Error(`${host}: the list of acts is empty`);
  return out;
}

/** One act as the collection serves it; with `versionId`, that earlier version's tree. */
export async function fetchLexworkAct(
  host: string,
  systematicNumber: string,
  versionId?: number,
  doFetch: typeof fetch = fetch,
): Promise<{ act: LexworkAct; bytes: Uint8Array } | null> {
  const path = `/api/${LANG}/texts_of_law/${encodeURIComponent(systematicNumber)}${
    versionId === undefined ? "" : `/versions/${versionId}`
  }/show_as_json`;
  const response = await doFetch(`https://${host}${path}`, {
    headers: { "user-agent": USER_AGENT, accept: "application/json" },
    signal: AbortSignal.timeout(90_000),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`${host}${path}: HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  return { act: JSON.parse(new TextDecoder().decode(bytes)) as LexworkAct, bytes };
}

/**
 * The day a version took effect, from the collection's words: "Aktuelle Version
 * in Kraft seit: 14.05.2024 (…)" or "Version in Kraft von: 14.05.2024 (…)".
 */
export function inForceFrom(versionDates: string | undefined): string | null {
  const m = /in Kraft (?:seit|von):\s*(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(versionDates ?? "");
  return m ? `${m[3]}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}` : null;
}

/**
 * The versions to hold, oldest first: one per day (a later correction of a
 * version that took effect on the same day replaces the earlier reading, as it
 * is the same version), none that has not yet taken effect.
 */
export function versionsToHold(act: LexworkAct, today: string): LexworkVersionRef[] {
  const t = act.text_of_law;
  const all = [...t.old_versions, t.current_version].map((v) => ({
    id: v.id,
    inForceFrom: inForceFrom(v.version_dates_str),
  }));
  const byDay = new Map<string, LexworkVersionRef>();
  for (const v of all) {
    if (!v.inForceFrom || v.inForceFrom > today) continue;
    const kept = byDay.get(v.inForceFrom);
    if (!kept || v.id > kept.id) byDay.set(v.inForceFrom, v);
  }
  return [...byDay.values()].sort((a, b) => a.inForceFrom!.localeCompare(b.inForceFrom!));
}

/** Table cells and rows as words and lines, then the page's own text rules. */
const textOf = (html: string | undefined): string =>
  blockText((html ?? "").replace(/<\/tr>/g, "</p>").replace(/<\/t[dh]>/g, " "));

const clean = (s: string | undefined): string =>
  decodeEntities(s ?? "")
    .replace(/ /g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** An article's body: its paragraphs and their lists, in order. */
function bodyOf(node: Node): string[] {
  const lines: string[] = [];
  for (const child of node.children ?? []) {
    const own = textOf(child.html_content?.[LANG]);
    if (own) lines.push(own);
    lines.push(...bodyOf(child));
  }
  return lines;
}

function collect(node: Node, out: Node[]): void {
  if (node.type === "article") out.push(node);
  else for (const child of node.children ?? []) collect(child, out);
}

/** The articles of a version, each under the path `art_<n>`; the whole text when it has none. */
export function parseLexworkProvisions(act: LexworkAct): Provision[] {
  const root = act.text_of_law.selected_version.json_content?.document?.content;
  if (!root) return [];
  const articles: Node[] = [];
  collect(root, articles);
  const out: Provision[] = [];
  const seen = new Set<string>();
  for (const article of articles) {
    const key = /(?:^|--)a-([^-].*)$/.exec(article.uid ?? "")?.[1] ?? String(out.length + 1);
    const path = `art_${key.replace(/[^\p{L}\p{N}]+/gu, "_")}`;
    if (seen.has(path)) continue;
    seen.add(path);
    const number = clean(article.number?.[LANG]);
    const title = clean(article.text?.[LANG]);
    const text = bodyOf(article).join("\n");
    out.push({ path, heading: [number, title].filter(Boolean).join(" "), text: text || title });
  }
  if (out.length > 0) return out;
  const whole = bodyOf(root).join("\n") || textOf(root.html_content?.[LANG]);
  return whole ? [{ path: WHOLE_ACT, heading: act.text_of_law.title, text: whole }] : [];
}

/** The PDF of a version, when the collection serves one on its own host. */
export async function fetchLexworkPdf(
  host: string,
  act: LexworkAct,
  doFetch: typeof fetch = fetch,
): Promise<Uint8Array | null> {
  const link = act.text_of_law.selected_version.pdf_link_tol;
  if (!link) return null;
  const url = new URL(link);
  if (url.hostname !== host) throw new Error(`${link} is not on ${host}`);
  const response = await doFetch(url, {
    headers: { "user-agent": USER_AGENT },
    signal: AbortSignal.timeout(180_000),
  });
  if (!response.ok) throw new Error(`${link}: HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  return new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-" ? bytes : null;
}

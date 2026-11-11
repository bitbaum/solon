/**
 * Checks held law against its publisher, so "loaded" can be told from "correct".
 *
 * A random sample of the acts in force for an authority is read again from the address each
 * was read from, and the words of the page are compared with the words of the provisions held.
 * A page's own furniture (menus, footers) shows up as a few words held nowhere; a provision cut
 * short, a table lost or an article skipped shows up as many. The report names the commonest
 * missing words of each act so a person can tell which it is.
 *
 * It reads HTML pages, and JSON that carries the act's HTML in one field (JSON_BODIES); a PDF or XML text has no page words to compare against.
 */
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import { legalActVersions, legalActs, legalProvisions } from "@/lib/db/law-schema";
import { sources } from "@/lib/db/places-schema";
import { read } from "../publishers/http";
import { newHeadings } from "../heading-path";

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  shy: "",
  auml: "ä",
  ouml: "ö",
  uuml: "ü",
  Auml: "Ä",
  Ouml: "Ö",
  Uuml: "Ü",
  szlig: "ß",
  sect: "§",
  eacute: "é",
  egrave: "è",
  agrave: "à",
  ccedil: "ç",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  laquo: "«",
  raquo: "»",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  euro: "€",
  deg: "°",
};

/** The text a reader sees on a page: no scripts, styles or tags, entities decoded. */
export function visibleText(
  html: string,
  ignoreClasses: readonly string[] = [],
  furnitureTables?: RegExp,
): string {
  if (furnitureTables) {
    html = html.replace(/<table\b[\s\S]*?<\/table>/gi, (table) =>
      furnitureTables.test(table) ? " " : table,
    );
  }
  const ignored = ignoreClasses.length
    ? new RegExp(`<div class="(?:${ignoreClasses.join("|")})"[^>]*>[\\s\\S]*?</div>`, "g")
    : null;
  return (
    (ignored ? html.replace(ignored, " ") : html)
      .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, " ")
      // The notes at the foot of a Liechtenstein page ("eingefügt durch LGBl. …") are the act's amendment
      // history, which the provisions do not carry on purpose.
      .replace(/<div class="fntext"[\s\S]*?<\/div>/g, " ")
      // The mark that points at a footnote ("<a href="#fn3"><sup>3</sup></a>") is not a word of the text.
      .replace(/<a href="#fn[^"]*"[^>]*>[\s\S]*?<\/a\s*>/g, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      // A tag inside a word ("CO<sub>2</sub>") does not split it; a block tag does.
      .replace(/<\/?(?:sub|sup|i|b|em|strong|u|span|small|abbr|font)\b[^>]*>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
      .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
      .replace(/&([a-zA-Z]+);/g, (m, name: string) => ENTITIES[name] ?? m)
  );
}

/** Lower-case words of two or more letters or digits. */
export function wordsOf(text: string): string[] {
  return text.toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) ?? [];
}

const counted = (words: string[]): Map<string, number> => {
  const m = new Map<string, number>();
  for (const w of words) m.set(w, (m.get(w) ?? 0) + 1);
  return m;
};

/** The words the provisions hold, in the act's order: each heading path where it first appears, then heading and text. */
export function storedWordsOf(
  provisions: readonly { heading: string; text: string; headingPath?: string[] }[],
): string[] {
  const parts: string[] = [];
  let previous: string[] | undefined;
  // A heading that has a body is held as a provision of its own: it is not a path word again.
  const held = new Set<string>();
  for (const p of provisions) {
    const path = p.headingPath ?? [];
    for (const h of newHeadings(previous, path)) if (!held.has(h)) parts.push(h);
    previous = path;
    held.add(p.heading);
    parts.push(p.heading, p.text);
  }
  return wordsOf(parts.join(" "));
}

export interface Sequence {
  /** Page words found in the stored text in the same order (longest common subsequence). */
  inOrder: number;
  /** inOrder / page words. */
  ratio: number;
  /** The longest stretch of page words with no match in order, and where it starts. */
  longestMissing: { words: number; at: number; text: string };
  /** Every page word is held, in the page's order. */
  wordForWord: boolean;
}

/**
 * How much of the page the stored text holds in the page's order. A Myers diff over the words:
 * quick when the two are alike, and gives up (null) when they differ by more than `maxEdits`
 * words, so a very different text is never called word for word.
 */
export function sequence(page: string[], stored: string[], maxEdits = 6000): Sequence | null {
  const ids = new Map<string, number>();
  const id = (w: string) => ids.get(w) ?? (ids.set(w, ids.size), ids.size - 1);
  const a = page.map(id);
  const b = stored.map(id);
  const n = a.length;
  const m = b.length;
  const max = Math.min(n + m, maxEdits);
  const offset = max + 1;
  let v = new Int32Array(2 * max + 3);
  const trace: Int32Array[] = [];
  let found = -1;
  for (let d = 0; d <= max && found < 0; d++) {
    trace.push(v.slice());
    for (let k = -d; k <= d; k += 2) {
      let x =
        k === -d || (k !== d && v[offset + k - 1]! < v[offset + k + 1]!)
          ? v[offset + k + 1]!
          : v[offset + k - 1]! + 1;
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) {
        x++;
        y++;
      }
      v[offset + k] = x;
      if (x >= n && y >= m) {
        found = d;
        break;
      }
    }
  }
  if (found < 0) return null;
  // Walk back through the trace: a page word matched on a diagonal is kept, one deleted from the page is missing.
  const kept = new Array<boolean>(n).fill(false);
  let x = n;
  let y = m;
  for (let d = found; d > 0; d--) {
    const vd = trace[d]!;
    const k = x - y;
    const down = k === -d || (k !== d && vd[offset + k - 1]! < vd[offset + k + 1]!);
    const pk = down ? k + 1 : k - 1;
    const px = vd[offset + pk]!;
    const py = px - pk;
    while (x > (down ? px : px + 1) && y > (down ? py + 1 : py)) {
      x--;
      y--;
      kept[x] = true;
    }
    x = px;
    y = py;
  }
  while (x > 0 && y > 0) {
    x--;
    y--;
    kept[x] = true;
  }
  let inOrder = 0;
  let best = { words: 0, at: 0 };
  let run = 0;
  for (let i = 0; i <= n; i++) {
    if (i < n && !kept[i]) {
      run++;
      if (run > best.words) best = { words: run, at: i - run + 1 };
      continue;
    }
    if (i < n) inOrder++;
    run = 0;
  }
  return {
    inOrder,
    ratio: n === 0 ? 1 : inOrder / n,
    longestMissing: {
      ...best,
      text: page.slice(best.at, best.at + Math.min(best.words, 30)).join(" "),
    },
    wordForWord: inOrder === n,
  };
}

export interface Coverage {
  pageWords: number;
  storedWords: number;
  /** Page words (counted with repeats) that the provisions also hold. */
  matched: number;
  /** matched / pageWords; 1 when the page has no words. */
  ratio: number;
  /** The words missing from the provisions, commonest first. */
  missing: { word: string; count: number }[];
}

/** How much of the page the stored text holds, counting every repeat. */
export function coverage(page: string[], stored: string[], top = 15): Coverage {
  const have = counted(stored);
  const want = counted(page);
  let matched = 0;
  const missing: { word: string; count: number }[] = [];
  for (const [word, count] of want) {
    const held = have.get(word) ?? 0;
    matched += Math.min(count, held);
    if (held < count) missing.push({ word, count: count - held });
  }
  missing.sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));
  return {
    pageWords: page.length,
    storedWords: stored.length,
    matched,
    ratio: page.length === 0 ? 1 : matched / page.length,
    missing: missing.slice(0, top),
  };
}

/**
 * Where the page has text the provisions lack, in the page's own order: the first runs of at least
 * `min` words in a row that are missing, each as the words themselves. A scattering of missing words
 * is page furniture or footnotes; a long run is a block of the act that was not kept.
 */
export function missingRuns(
  page: string[],
  stored: string[],
  min = 8,
  take = 3,
  show = 30,
): string[] {
  const left = counted(stored);
  const gone: boolean[] = page.map((w) => {
    const n = left.get(w) ?? 0;
    if (n > 0) {
      left.set(w, n - 1);
      return false;
    }
    return true;
  });
  const runs: string[] = [];
  let start = -1;
  for (let i = 0; i <= gone.length; i++) {
    if (i < gone.length && gone[i]) {
      if (start < 0) start = i;
      continue;
    }
    if (start >= 0 && i - start >= min && runs.length < take) {
      runs.push(`${i - start} words: ${page.slice(start, Math.min(i, start + show)).join(" ")}`);
    }
    start = -1;
  }
  return runs;
}

/** The commonest `<div class>` names on a page, so a block the cutter does not know shows up. */
export function divClasses(html: string, top = 10): string {
  const m = new Map<string, number>();
  for (const [, name] of html.matchAll(/<div\b[^>]*\bclass="([^"]+)"/g)) {
    m.set(name!, (m.get(name!) ?? 0) + 1);
  }
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([name, n]) => `${name}x${n}`)
    .join(" ");
}

/**
 * The raw HTML around the first place a long run of missing words begins: the run's first words
 * are looked for in the page, tags allowed between them, and about `width` characters either side
 * are returned with the tags kept, so the markup that hides the text can be read.
 */
export function htmlAround(html: string, run: string, width = 220): string {
  const words = run
    .replace(/^\d+ words: /, "")
    .split(" ")
    .slice(0, 3);
  if (words.length === 0) return "";
  const pattern = new RegExp(
    words
      .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("(?:\\s|<[^>]*>|&[a-z#0-9]+;)+"),
    "i",
  );
  const at = pattern.exec(html)?.index;
  if (at === undefined) return "";
  return html.slice(Math.max(0, at - width), at + width).replace(/\s+/g, " ");
}

/**
 * The blocks of a publisher's page that are the act's header, not its provisions: its title, its date
 * and the signatures of the promulgation are held as the act's title and dates, not as provisions.
 */
/**
 * Tables that are a publisher's masthead, not the act: the gazette's number, year and date line.
 * A table is furniture when its text matches.
 */
export const FURNITURE_TABLES: Record<string, RegExp> = {
  li: /Liechtensteinisches\s+Landesgesetzblatt/i,
};

export const HEADER_CLASSES: Record<string, readonly string[]> = {
  li: ["htit1", "htit2", "vom", "udat", "gezf", "gezr"],
};

/**
 * Where the act's own words are on a publisher's page, for pages whose menus, news and footers are
 * not the act: the markup that opens the body and the one that follows it. Pages of an authority
 * that is not here are read whole.
 */
export const PAGE_REGIONS: Record<string, { from: string; to: string }> = {
  rso: { from: 'property="content:encoded">', to: '<div class="field field-name-' },
};

/**
 * Authorities whose texts are kept as JSON that carries the act's HTML in one field (a WordPress
 * post's `content.rendered`): how to get that HTML out of the answer. Others are read as HTML pages.
 */
export const JSON_BODIES: Record<string, (json: unknown) => string> = {
  rso: (json) => {
    const body = (json as { content?: { rendered?: unknown } }).content?.rendered;
    if (typeof body !== "string") throw new Error("the post has no content");
    return body;
  },
};

/** The part of a page the act's words are in. */
export function regionOf(html: string, authority: string): string {
  const region = PAGE_REGIONS[authority];
  if (!region) return html;
  const from = html.indexOf(region.from);
  if (from < 0) return html;
  const start = from + region.from.length;
  const end = html.indexOf(region.to, start);
  return html.slice(start, end < 0 ? undefined : end);
}

export interface VerifyOptions {
  authority: string;
  /** How many acts to read again. */
  sample: number;
  /** Below this share of the page's words held, an act is reported as short. */
  threshold?: number;
  fetchImpl?: typeof fetch;
  onProgress?: (message: string) => void;
}

export interface VerifiedAct {
  title: string;
  url: string;
  provisions: number;
  coverage?: Coverage;
  /** The same words compared in the page's order; null when the two differ too much to align. */
  sequence?: Sequence | null;
  /** Long runs of page words the provisions lack, and the page's div classes. */
  runs?: string[];
  classes?: string;
  /** The raw HTML around the first long run. */
  around?: string;
  short: boolean;
  /** Every word of the page is held, in order: checked, not assumed. */
  wordForWord?: boolean;
  error?: string;
}

export interface VerifyReport {
  authority: string;
  inForceHtmlVersions: number;
  sampled: number;
  meanRatio: number;
  short: number;
  /** Acts whose every page word is held in the page's order. */
  wordForWord: number;
  failed: number;
  acts: VerifiedAct[];
}

export async function verifyAuthority(db: Database, options: VerifyOptions): Promise<VerifyReport> {
  const { authority, sample, threshold = 0.97 } = options;
  const doFetch = options.fetchImpl ?? fetch;
  const say = options.onProgress ?? (() => undefined);
  const where = and(
    eq(legalActs.authority, authority),
    isNull(legalActVersions.inForceTo),
    inArray(legalActVersions.format, JSON_BODIES[authority] ? ["html", "json"] : ["html"]),
  );
  const [{ n } = { n: 0 }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(legalActVersions)
    .innerJoin(legalActs, eq(legalActs.id, legalActVersions.actId))
    .where(where);
  const picked = await db
    .select({
      versionId: legalActVersions.id,
      actId: legalActs.id,
      url: sources.url,
      format: legalActVersions.format,
    })
    .from(legalActVersions)
    .innerJoin(legalActs, eq(legalActs.id, legalActVersions.actId))
    .innerJoin(sources, eq(sources.id, legalActVersions.sourceId))
    .where(where)
    .orderBy(sql`random()`)
    .limit(sample);

  const acts: VerifiedAct[] = [];
  for (const row of picked) {
    const provisions = await db
      .select({
        heading: legalProvisions.heading,
        text: legalProvisions.text,
        headingPath: legalProvisions.headingPath,
      })
      .from(legalProvisions)
      .where(eq(legalProvisions.versionId, row.versionId))
      .orderBy(legalProvisions.ord);
    const title = provisions[0]?.heading.slice(0, 80) ?? row.actId;
    const url = row.url ?? "";
    try {
      if (!url) throw new Error("the version has no source address");
      const page = await read(url, doFetch, [new URL(url).hostname]);
      const raw = new TextDecoder().decode(page.bytes);
      const html = row.format === "json" ? JSON_BODIES[authority]!(JSON.parse(raw)) : raw;
      const pageWords = wordsOf(
        visibleText(
          regionOf(html, authority),
          HEADER_CLASSES[authority] ?? [],
          FURNITURE_TABLES[authority],
        ),
      );
      const storedWords = storedWordsOf(provisions);
      const cov = coverage(pageWords, storedWords);
      const seq = sequence(pageWords, storedWords);
      const act: VerifiedAct = {
        title,
        url,
        provisions: provisions.length,
        coverage: cov,
        sequence: seq,
        wordForWord: seq?.wordForWord ?? false,
        runs: missingRuns(pageWords, storedWords),
        classes: divClasses(html),
        around: (() => {
          const runs = missingRuns(pageWords, storedWords);
          return runs[0] ? htmlAround(html, runs[0]) : undefined;
        })(),
        short: cov.ratio < threshold,
      };
      acts.push(act);
      say(
        `${(cov.ratio * 100).toFixed(1)}% bag, ${seq ? (seq.ratio * 100).toFixed(1) + "% in order, longest missing run " + seq.longestMissing.words : "order not compared"}${act.wordForWord ? ", word for word" : ""} ${title}`,
      );
    } catch (error) {
      acts.push({
        title,
        url,
        provisions: provisions.length,
        short: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  const checked = acts.filter((a) => a.coverage);
  return {
    authority,
    inForceHtmlVersions: n,
    sampled: acts.length,
    meanRatio: checked.length
      ? checked.reduce((sum, a) => sum + a.coverage!.ratio, 0) / checked.length
      : 0,
    short: acts.filter((a) => a.short).length,
    wordForWord: acts.filter((a) => a.wordForWord).length,
    failed: acts.filter((a) => a.error).length,
    acts,
  };
}

/**
 * Checks held law against its publisher, so "loaded" can be told from "correct".
 *
 * A random sample of the acts in force for an authority is read again from the address each
 * was read from, and the words of the page are compared with the words of the provisions held.
 * A page's own furniture (menus, footers) shows up as a few words held nowhere; a provision cut
 * short, a table lost or an article skipped shows up as many. The report names the commonest
 * missing words of each act so a person can tell which it is.
 *
 * It reads only HTML pages: a PDF or XML text has no page words to compare against.
 */
import { and, eq, isNull, sql } from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import { legalActVersions, legalActs, legalProvisions } from "@/lib/db/law-schema";
import { sources } from "@/lib/db/places-schema";
import { read } from "../publishers/http";

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
};

/** The text a reader sees on a page: no scripts, styles or tags, entities decoded. */
export function visibleText(html: string): string {
  return html
    .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&([a-zA-Z]+);/g, (m, name: string) => ENTITIES[name] ?? m);
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
  short: boolean;
  error?: string;
}

export interface VerifyReport {
  authority: string;
  inForceHtmlVersions: number;
  sampled: number;
  meanRatio: number;
  short: number;
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
    eq(legalActVersions.format, "html"),
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
      .select({ heading: legalProvisions.heading, text: legalProvisions.text })
      .from(legalProvisions)
      .where(eq(legalProvisions.versionId, row.versionId));
    const title = provisions[0]?.heading.slice(0, 80) ?? row.actId;
    const url = row.url ?? "";
    try {
      if (!url) throw new Error("the version has no source address");
      const page = await read(url, doFetch, [new URL(url).hostname]);
      const cov = coverage(
        wordsOf(visibleText(new TextDecoder().decode(page.bytes))),
        wordsOf(provisions.map((p) => `${p.heading} ${p.text}`).join(" ")),
      );
      const act = {
        title,
        url,
        provisions: provisions.length,
        coverage: cov,
        short: cov.ratio < threshold,
      };
      acts.push(act);
      say(`${(cov.ratio * 100).toFixed(1)}% ${title}`);
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
    failed: acts.filter((a) => a.error).length,
    acts,
  };
}

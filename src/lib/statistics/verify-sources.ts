/**
 * Does every source a record cites still say what the record relies on?
 *
 * The curated records name the pages they were read on, and each page may
 * name the words it must still contain (`expect`). This module collects those
 * pages once each, fetches them politely and checks the words. Links rot and
 * pages are rewritten; a record resting on one that changed should be found by
 * a program, not by a reader weeks later. Fetching is injected so the checks
 * run offline in tests.
 */
import { createHash } from "node:crypto";
import type { CuratedRecord } from "./records";

export interface EvidenceItem {
  url: string;
  publisher: string;
  /** Every word any record expects of this page, once each. */
  expect: string[];
  /** The records that cite it, so a failure says what rests on it. */
  citedBy: string[];
  /** Every citation of it says a program cannot read it: it is not fetched. */
  unchecked: boolean;
}

export interface PageResult {
  url: string;
  publisher: string;
  citedBy: string[];
  ok: boolean;
  /** HTTP status, or 0 when the request itself failed. */
  status: number;
  error?: string;
  /** The words expected and not found. */
  missing: string[];
  /** Not fetched: a page for people only (see `unchecked` in the record schema). */
  skipped?: boolean;
  sha256?: string;
  bytes?: number;
}

/** Every evidence object under a value, wherever it sits (process steps, votes, actors, wordings…). */
function* evidenceIn(
  value: unknown,
): Generator<{ url: string; publisher: string; expect: string[]; unchecked: boolean }> {
  if (Array.isArray(value)) {
    for (const v of value) yield* evidenceIn(v);
  } else if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    if (
      typeof o.url === "string" &&
      typeof o.publisher === "string" &&
      typeof o.read === "string"
    ) {
      yield {
        url: o.url,
        publisher: o.publisher,
        expect: Array.isArray(o.expect) ? (o.expect as string[]) : [],
        unchecked: o.unchecked === true,
      };
    }
    for (const v of Object.values(o)) yield* evidenceIn(v);
  }
}

/** The distinct pages the records rest on, with every expectation any of them makes. */
export function collectEvidence(records: readonly CuratedRecord[]): EvidenceItem[] {
  const byUrl = new Map<string, EvidenceItem>();
  for (const record of records) {
    for (const e of evidenceIn(record.body)) {
      const item = byUrl.get(e.url) ?? {
        url: e.url,
        publisher: e.publisher,
        expect: [],
        citedBy: [],
        unchecked: true,
      };
      // A page is skipped only when every citation of it says it cannot be read.
      item.unchecked &&= e.unchecked;
      for (const w of e.expect) if (!item.expect.includes(w)) item.expect.push(w);
      if (!item.citedBy.includes(record.key)) item.citedBy.push(record.key);
      byUrl.set(e.url, item);
    }
  }
  return [...byUrl.values()];
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  sect: "§",
};

/**
 * Page text as it is compared: HTML reduced to its text (scripts and styles
 * dropped, tags removed, entities decoded), then every kind of whitespace
 * removed and case folded, so a line break, a non-breaking space or a typeface
 * change never hides a match. Data formats (JSON, XML) are compared as they are.
 */
export function comparable(raw: string, contentType = ""): string {
  let text = raw;
  if (/html/i.test(contentType) || /^\s*<!doctype html|^\s*<html/i.test(raw)) {
    text = text
      .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ");
  }
  text = text
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name: string) => ENTITIES[name.toLowerCase()] ?? m);
  return text.replace(/[\s ​]+/g, "").toLowerCase();
}

/** The expected words that the page text does not contain. */
export function missingWords(raw: string, expect: readonly string[], contentType = ""): string[] {
  const haystack = comparable(raw, contentType);
  return expect.filter((w) => !haystack.includes(comparable(w)));
}

export interface VerifyOptions {
  fetchImpl?: typeof fetch;
  /** Wait between two requests to one host, so no publisher is hammered (default 1.5 s). */
  paceMs?: number;
  /** Identifies this reader to the publisher. */
  userAgent?: string;
  /** The first wait before asking again after a 429 or a server error, doubling each time (default 5 s). */
  retryMs?: number;
}

const TIMEOUT_MS = 60_000;
const RETRIES = 3;

export async function verifyEvidence(
  items: readonly EvidenceItem[],
  {
    fetchImpl = fetch,
    paceMs = 1500,
    userAgent = "Solon source verifier (solon.orangecat.ch)",
    retryMs = 5000,
  }: VerifyOptions = {},
): Promise<PageResult[]> {
  const results: PageResult[] = [];
  const lastAt = new Map<string, number>();
  for (const item of items) {
    const host = new URL(item.url).host;
    const wait = (lastAt.get(host) ?? 0) + paceMs - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastAt.set(host, Date.now());
    const base = { url: item.url, publisher: item.publisher, citedBy: item.citedBy };
    if (item.unchecked) {
      results.push({ ...base, ok: true, status: 0, missing: [], skipped: true });
      continue;
    }
    try {
      // A fragment (#art_36) is for the browser; the server is asked for the page.
      // A publisher that says "too many requests" or is briefly down is asked again, politely.
      let response = await fetchImpl(item.url.replace(/#.*$/, ""), {
        headers: { "user-agent": userAgent },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      for (
        let attempt = 0;
        attempt < RETRIES && (response.status === 429 || response.status >= 500);
        attempt += 1
      ) {
        const asked = Number(response.headers.get("retry-after"));
        await new Promise((r) =>
          setTimeout(
            r,
            Math.min(
              60_000,
              (Number.isFinite(asked) && asked > 0 ? asked * 1000 : 0) || retryMs * 2 ** attempt,
            ),
          ),
        );
        response = await fetchImpl(item.url.replace(/#.*$/, ""), {
          headers: { "user-agent": userAgent },
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      const text = new TextDecoder().decode(bytes);
      const missing = response.ok
        ? missingWords(text, item.expect, response.headers.get("content-type") ?? "")
        : [...item.expect];
      results.push({
        ...base,
        ok: response.ok && missing.length === 0,
        status: response.status,
        missing,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        bytes: bytes.length,
      });
    } catch (error) {
      results.push({
        ...base,
        ok: false,
        status: 0,
        error: error instanceof Error ? error.message : String(error),
        missing: [...item.expect],
      });
    }
  }
  return results;
}

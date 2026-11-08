/**
 * Polite reading shared by every publisher adapter: who we are, a deadline, only
 * the publisher's own hosts. Law is public, so when the publisher's site refuses
 * an automated reader (403, 429, 503, or a bot check in place of the page), the
 * text is read from the newest good public copy the Internet Archive holds, and the
 * copy's own address is what the text records as its source (`archive-copy.ts`).
 * Solon never disguises itself to get past a refusal: it says who it is, and
 * takes the honest route around.
 */
import { archiveCopyOf, rawCaptureUrl, type ArchiveCopy } from "../archive-copy";

export const USER_AGENT = "solon-law-text (cato@orangecat.ch)";

/** What was read, and from where: the publisher's address, or a dated copy of it. */
export interface Read {
  bytes: Uint8Array;
  /** The address the bytes came from: the publisher's, or the archive's copy. */
  url: string;
  /** Set when the publisher refused and the bytes are the archive's copy. */
  copy: ArchiveCopy | null;
}

/** Statuses that mean "not to you", not "not here": the page exists and a copy may stand in. */
const REFUSAL_STATUSES = new Set([403, 429, 503]);

/** A page that is a challenge for robots, not the publisher's content. */
const CHALLENGE_TITLE =
  /bot verification|just a moment|attention required|are you a (?:robot|human)|captcha|ddos-guard|security check|access denied/i;
const CHALLENGE_MARK = /lsrecaptcha|cf_chl_|challenge-platform|cf-challenge/i;

/** The page's words when it is a bot check ("Bot Verification"), else null. Only HTML can be one. */
export function botCheckOf(bytes: Uint8Array, contentType: string | null): string | null {
  const head = new TextDecoder().decode(bytes.subarray(0, 65_536));
  const html = /html/i.test(contentType ?? "") || /^\s*</.test(head);
  if (!html || head.startsWith("%PDF")) return null;
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(head)?.[1]?.replace(/\s+/g, " ").trim();
  if (title && CHALLENGE_TITLE.test(title)) return title;
  if (CHALLENGE_MARK.test(head)) return title || "a bot check";
  return null;
}

const fetchOptions = () => ({
  headers: { "user-agent": USER_AGENT },
  signal: AbortSignal.timeout(120_000),
});

/** The timestamp of the newest capture of `url` the Wayback Machine holds, or null when it holds none. */
export async function newestCapture(url: string, doFetch: typeof fetch): Promise<string | null> {
  const response = await doFetch(
    `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`,
    fetchOptions(),
  );
  if (!response.ok) throw new Error(`the Internet Archive answered ${response.status}`);
  const body = (await response.json()) as {
    archived_snapshots?: {
      closest?: { available?: boolean; timestamp?: string; status?: string };
    };
  };
  const closest = body.archived_snapshots?.closest;
  if (!closest?.available || !closest.timestamp || !/^\d{14}$/.test(closest.timestamp)) return null;
  // A capture of an error page is not a copy of the law.
  if (closest.status && closest.status !== "200") return null;
  return closest.timestamp;
}

/** How many distinct captures are tried, newest first, before giving up. */
const CAPTURES_TRIED = 8;

/**
 * The timestamps of the Wayback Machine's captures of `url` that answered
 * 200, newest first, one per distinct content (`collapse=digest`), so a run of
 * identical bot-check captures counts once. Empty when it holds none.
 */
export async function captures(url: string, doFetch: typeof fetch): Promise<string[]> {
  const query = new URLSearchParams({
    url,
    output: "json",
    fl: "timestamp",
    filter: "statuscode:200",
    collapse: "digest",
    limit: `-${CAPTURES_TRIED}`,
  });
  const response = await doFetch(`https://web.archive.org/cdx/search/cdx?${query}`, fetchOptions());
  if (!response.ok) throw new Error(`the Internet Archive answered ${response.status}`);
  const rows = (await response.json()) as string[][];
  // The first row names the fields.
  return rows
    .slice(1)
    .map((row) => row[0] ?? "")
    .filter((stamp) => /^\d{14}$/.test(stamp))
    .reverse();
}

/**
 * The archive's copy of a page the publisher refused, or an error that says
 * why there is none. The newest capture first; when it is a bot check too (the
 * site put one up and the archive saved it), the captures before it, newest
 * first, until one is the page itself.
 */
async function readCopy(url: string, refusal: string, doFetch: typeof fetch): Promise<Read> {
  let stamps: string[];
  try {
    // The capture index first; when it cannot be read, the newest capture alone.
    stamps = await captures(url, doFetch).catch(() => []);
    if (stamps.length === 0) {
      const newest = await newestCapture(url, doFetch);
      stamps = newest ? [newest] : [];
    }
  } catch (error) {
    const why = error instanceof Error ? error.message : String(error);
    throw new Error(`${refusal} for ${url}; the Internet Archive could not be asked (${why})`);
  }
  if (stamps.length === 0) {
    throw new Error(`${refusal} for ${url}; the Internet Archive holds no copy of it`);
  }
  let checks = 0;
  for (const stamp of stamps) {
    const raw = rawCaptureUrl(stamp, url);
    const response = await doFetch(raw, fetchOptions());
    if (!response.ok) continue;
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (botCheckOf(bytes, response.headers.get("content-type"))) {
      checks++;
      continue;
    }
    // The archive may answer from a capture a moment apart; the address it ends on is the one read.
    const copy = archiveCopyOf(response.url) ?? archiveCopyOf(raw)!;
    return { bytes, url: copy.url, copy: { ...copy, original: url } };
  }
  throw new Error(
    checks === stamps.length
      ? `${refusal} for ${url}; the Internet Archive's copy is a bot check too`
      : `${refusal} for ${url}; none of the Internet Archive's ${stamps.length} copies could be read`,
  );
}

/** The bytes at `url`, from the publisher; from the archive's newest copy when the publisher refuses. */
export async function read(
  url: string,
  doFetch: typeof fetch,
  hosts: readonly string[],
): Promise<Read> {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || !hosts.includes(parsed.hostname)) {
    throw new Error(`not a publisher address: ${url}`);
  }
  const response = await doFetch(url, fetchOptions());
  if (REFUSAL_STATUSES.has(response.status)) {
    return readCopy(url, String(response.status), doFetch);
  }
  if (!response.ok) throw new Error(`${response.status} for ${url}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const check = botCheckOf(bytes, response.headers.get("content-type"));
  if (check) return readCopy(url, `a bot check ("${check}")`, doFetch);
  return { bytes, url, copy: null };
}

export async function getText(
  url: string,
  doFetch: typeof fetch,
  hosts: readonly string[],
): Promise<string> {
  const bytes = await getBytes(url, doFetch, hosts);
  return new TextDecoder().decode(bytes);
}

export async function getBytes(
  url: string,
  doFetch: typeof fetch,
  hosts: readonly string[],
): Promise<Uint8Array> {
  return (await read(url, doFetch, hosts)).bytes;
}

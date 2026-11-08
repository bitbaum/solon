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

/**
 * A page that is a challenge for robots, or a firewall's refusal served in the
 * page's place ("Web Page Blocked", as New Hampshire's General Court answers),
 * not the publisher's content.
 */
const CHALLENGE_TITLE =
  /bot verification|just a moment|attention required|are you a (?:robot|human)|captcha|ddos-guard|security check|access denied|web page blocked|web filter violation|request rejected/i;
const CHALLENGE_MARK =
  /lsrecaptcha|cf_chl_|challenge-platform|cf-challenge|>\s*web page blocked!?\s*</i;

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

/** A PDF that arrived whole: its header, and its end-of-file mark near the end. */
export function wholePdf(bytes: Uint8Array): boolean {
  const head = new TextDecoder().decode(bytes.subarray(0, 1024));
  const tail = new TextDecoder().decode(bytes.subarray(Math.max(0, bytes.length - 2048)));
  return head.includes("%PDF-") && tail.includes("%%EOF");
}

/** An address that names a PDF, so what comes back must be one. */
const namesPdf = (url: string) => /\.pdf(?:[?#]|$)/i.test(url);

/** Pauses before asking the archive again after it dropped the connection (it throttles bursts). */
export const ARCHIVE_RETRY_MS = [5_000, 20_000];

/** `doFetch`, asked again after a dropped connection, never after an answer. */
async function patiently(
  url: string,
  doFetch: typeof fetch,
  waits: readonly number[] = ARCHIVE_RETRY_MS,
): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await doFetch(url, fetchOptions());
    } catch (error) {
      if (attempt >= waits.length) throw error;
      await new Promise((resolve) => setTimeout(resolve, waits[attempt]));
    }
  }
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

/** A capture older than this may no longer be the law in force: a fresh one is asked for first. */
export const STALE_AFTER_DAYS = 365;

const daysSince = (stamp: string, now: number) =>
  (now - Date.UTC(+stamp.slice(0, 4), +stamp.slice(4, 6) - 1, +stamp.slice(6, 8))) / 86_400_000;

/**
 * Asks the Internet Archive to capture `url` now (Save Page Now), from its
 * own network, which a site that refuses Solon may still answer. The new
 * capture's timestamp, or null when the archive would not or could not.
 */
export async function freshCapture(
  url: string,
  doFetch: typeof fetch,
  retryWaits: readonly number[] = ARCHIVE_RETRY_MS,
): Promise<string | null> {
  try {
    const response = await patiently(`https://web.archive.org/save/${url}`, doFetch, retryWaits);
    if (!response.ok) return null;
    // The archive answers from the new capture; its address names the timestamp.
    const where = `${response.url} ${response.headers.get("content-location") ?? ""}`;
    return /\/web\/(\d{14})/.exec(where)?.[1] ?? null;
  } catch {
    return null;
  }
}

/** How many distinct captures are tried, newest first, before giving up. */
const CAPTURES_TRIED = 8;

/**
 * The timestamps of the Wayback Machine's captures of `url` that answered
 * 200, newest first, one per distinct content (`collapse=digest`), so a run of
 * identical bot-check captures counts once. Empty when it holds none.
 */
export async function captures(
  url: string,
  doFetch: typeof fetch,
  retryWaits: readonly number[] = ARCHIVE_RETRY_MS,
): Promise<string[]> {
  const query = new URLSearchParams({
    url,
    output: "json",
    fl: "timestamp",
    filter: "statuscode:200",
    collapse: "digest",
    limit: `-${CAPTURES_TRIED}`,
  });
  const response = await patiently(
    `https://web.archive.org/cdx/search/cdx?${query}`,
    doFetch,
    retryWaits,
  );
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
async function readCopy(
  url: string,
  refusal: string,
  doFetch: typeof fetch,
  retryWaits: readonly number[] = ARCHIVE_RETRY_MS,
): Promise<Read> {
  let stamps: string[];
  try {
    // The capture index first; when it cannot be read, the newest capture alone.
    stamps = await captures(url, doFetch, retryWaits).catch(() => []);
    if (stamps.length === 0) {
      const newest = await newestCapture(url, doFetch);
      stamps = newest ? [newest] : [];
    }
  } catch (error) {
    const why = error instanceof Error ? error.message : String(error);
    throw new Error(`${refusal} for ${url}; the Internet Archive could not be asked (${why})`);
  }
  // No copy, or only an old one: ask for one made today, and read it first when it comes.
  if (stamps.length === 0 || daysSince(stamps[0]!, Date.now()) > STALE_AFTER_DAYS) {
    const fresh = await freshCapture(url, doFetch, retryWaits);
    if (fresh) stamps = [fresh, ...stamps.filter((s) => s !== fresh)];
  }
  if (stamps.length === 0) {
    throw new Error(`${refusal} for ${url}; the Internet Archive holds no copy of it`);
  }
  let checks = 0;
  for (const stamp of stamps) {
    const raw = rawCaptureUrl(stamp, url);
    const response = await patiently(raw, doFetch, retryWaits).catch(() => null);
    if (!response?.ok) continue;
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (botCheckOf(bytes, response.headers.get("content-type"))) {
      checks++;
      continue;
    }
    // A capture of a PDF cut short, or of something else at that address, is not the document.
    if (namesPdf(url) && !wholePdf(bytes)) continue;
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
  /** How long to wait before asking the archive again; tests pass none. */
  retryWaits: readonly number[] = ARCHIVE_RETRY_MS,
): Promise<Read> {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || !hosts.includes(parsed.hostname)) {
    throw new Error(`not a publisher address: ${url}`);
  }
  let response: Response;
  try {
    response = await doFetch(url, fetchOptions());
  } catch (error) {
    // The site would not even answer (a dropped or refused connection): the copy stands in.
    const why = error instanceof Error ? error.message : String(error);
    return readCopy(url, `no answer (${why})`, doFetch, retryWaits);
  }
  if (REFUSAL_STATUSES.has(response.status)) {
    return readCopy(url, String(response.status), doFetch, retryWaits);
  }
  if (!response.ok) throw new Error(`${response.status} for ${url}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const check = botCheckOf(bytes, response.headers.get("content-type"));
  if (check) return readCopy(url, `a bot check ("${check}")`, doFetch, retryWaits);
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

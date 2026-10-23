/**
 * Reads an act from ZH-Lex, the Canton of Zürich's own collection (design L3):
 * the PDF of its current version and the day that version took effect.
 *
 * The act's page is a wrapper. It links the PDF on another of the canton's
 * hosts, and its address carries the dates: enacted, in force, and the number
 * of the amendment that produced this version. Only addresses on the canton's
 * two hosts are fetched, whatever a page links to.
 */
import { ZHLEX } from "@/lib/config/law";

const USER_AGENT = "solon-law-text (cato@orangecat.ch)";

export interface ZhlexAct {
  /** The canton's page for the version, as the register links it. */
  pageUrl: string;
  /** The PDF of the version. */
  pdfUrl: string;
  /** The day this version took effect, YYYY-MM-DD, from the address of its page. */
  inForceFrom: string;
}

/** `erlass-101-2005_02_27-2006_01_01-129.html` → the day it took effect, 2006-01-01. */
export function inForceFromUrl(pageUrl: string): string | null {
  const m =
    /\/erlass-[^/]*?-(\d{4})_(\d{2})_(\d{2})-(\d{4})_(\d{2})_(\d{2})-\d+\.html(?:$|[?#])/.exec(
      pageUrl,
    );
  return m ? `${m[4]}-${m[5]}-${m[6]}` : null;
}

/** The PDF a page links, only if it is on the canton's file host. */
export function pdfLink(html: string): string | null {
  for (const m of html.matchAll(/href="([^"]*OpenAttachment[^"]*)"/g)) {
    const url = m[1]!.replace(/&amp;/g, "&");
    try {
      const parsed = new URL(url);
      if (
        parsed.protocol === "https:" &&
        parsed.hostname === ZHLEX.fileHost &&
        /\.pdf$/i.test(parsed.searchParams.get("file") ?? "")
      ) {
        return parsed.toString();
      }
    } catch {
      // not an address
    }
  }
  return null;
}

/** Reads an act's page and finds its PDF; null when the page is not an act of ZH-Lex. */
export async function readZhlexPage(
  pageUrl: string,
  doFetch: typeof fetch = fetch,
): Promise<ZhlexAct | null> {
  // The register links some pages as http://; the canton serves the same page over https.
  const page = new URL(pageUrl.replace(/^http:\/\//, "https://"));
  if (page.protocol !== "https:" || page.hostname !== ZHLEX.pageHost) return null;
  pageUrl = page.toString();
  const inForceFrom = inForceFromUrl(pageUrl);
  if (!inForceFrom) return null;
  const response = await doFetch(pageUrl, {
    headers: { "user-agent": USER_AGENT },
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) return null;
  const pdfUrl = pdfLink(await response.text());
  return pdfUrl ? { pageUrl, pdfUrl, inForceFrom } : null;
}

/**
 * The canton's file host answers the attachment address with a one-line page that
 * sends the browser on to the file: `window.location="/appl/zhlex_r.nsf/WebView/.../x.pdf"`.
 * That is a plain redirect, and it is followed once, on the same host, to a file under the same path.
 */
export function redirectTarget(html: string, from: string): string | null {
  const to = /window\.location\s*=\s*"([^"]+)"/.exec(html)?.[1];
  if (!to || !to.startsWith("/appl/zhlex_r.nsf/WebView/")) return null;
  const target = new URL(to, from);
  return target.hostname === ZHLEX.fileHost && /\.pdf$/i.test(target.pathname)
    ? target.toString()
    : null;
}

export async function fetchZhlexPdf(
  pdfUrl: string,
  doFetch: typeof fetch = fetch,
): Promise<Uint8Array | null> {
  if (new URL(pdfUrl).hostname !== ZHLEX.fileHost) return null;
  const get = (url: string) =>
    doFetch(url, { headers: { "user-agent": USER_AGENT }, signal: AbortSignal.timeout(120_000) });
  let response = await get(pdfUrl);
  if (!response.ok) return null;
  let bytes = new Uint8Array(await response.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") {
    const next = redirectTarget(new TextDecoder().decode(bytes), pdfUrl);
    if (!next) return null;
    response = await get(next);
    if (!response.ok) return null;
    bytes = new Uint8Array(await response.arrayBuffer());
  }
  return new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-" ? bytes : null;
}

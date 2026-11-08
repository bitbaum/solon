/**
 * A copy of a page kept by the Internet Archive's Wayback Machine, named by its
 * own address: `https://web.archive.org/web/<YYYYMMDDhhmmss>[modifier]/<original>`.
 * The address says where the copy is, what it is a copy of and when it was
 * captured, so a text read from a copy records that address as its source and
 * nothing more needs storing. Free of I/O, so the reading pages can use it.
 */

export const ARCHIVE_HOSTS = ["web.archive.org", "archive.org"] as const;

export interface ArchiveCopy {
  /** The address the copy was read from. */
  url: string;
  /** The page it is a copy of: the publisher's own address. */
  original: string;
  /** When the archive captured it, YYYY-MM-DD. */
  capturedOn: string;
}

const CAPTURE = /^\/web\/(\d{14})(?:[a-z]{2}_)?\/(.+)$/;

/** The copy an address names, or null when it is not a Wayback capture. */
export function archiveCopyOf(url: string | null | undefined): ArchiveCopy | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.hostname !== "web.archive.org") return null;
  const match = CAPTURE.exec(parsed.pathname + parsed.search + parsed.hash);
  if (!match) return null;
  const stamp = match[1]!;
  let original = match[2]!;
  // The archive writes "https:/host" in some links; an address needs both slashes.
  original = original.replace(/^(https?):\/(?!\/)/, "$1://");
  if (!/^https?:\/\//.test(original)) original = `http://${original}`;
  return {
    url,
    original,
    capturedOn: `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}`,
  };
}

/** The publisher's address behind a link found in a captured page; any other address as it is. */
export function originalOf(url: string): string {
  return archiveCopyOf(url)?.original ?? url;
}

/** The raw capture of `original` at `timestamp`: the bytes the publisher served, without the archive's toolbar. */
export function rawCaptureUrl(timestamp: string, original: string): string {
  return `https://web.archive.org/web/${timestamp}id_/${original}`;
}

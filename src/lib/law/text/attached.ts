/**
 * A publisher that prints an act as a short page linking a document ("Текст
 * кодекса скачать тут": the text of the code, download here) holds the act in
 * that document. These read which document a page links and its text, so
 * Solon holds the act's articles and not the link to them. Format readers
 * only; which publisher does this is the caller's knowledge.
 */
import WordExtractor from "word-extractor";

/** Below this many characters of text, a page that links a document is the door to the act, not the act. */
export const STUB_CHARS = 600;

const DOCUMENT = /\.(docx?)(?:$|\?)/i;

/** How a publisher words the link to an act's own text, and the links that are something else (its contents). */
export interface DocumentLinkWords {
  text: RegExp;
  notText: RegExp;
}

/**
 * The document a page's body links as the act's text, on one of the publisher's
 * own hosts: the link worded as the text, else the only document left once the
 * links worded as something else are set aside. Null when it links none, or
 * several that its words do not tell apart: then nothing is guessed.
 */
export function attachedDocumentUrl(
  bodyHtml: string,
  pageUrl: string,
  hosts: readonly string[],
  words: DocumentLinkWords,
): string | null {
  const links: { url: string; label: string }[] = [];
  for (const [, href, label] of bodyHtml.matchAll(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
    let url: URL;
    try {
      url = new URL(href!, pageUrl);
    } catch {
      continue;
    }
    if (!hosts.includes(url.hostname) || !DOCUMENT.test(url.pathname)) continue;
    links.push({ url: url.toString(), label: label!.replace(/<[^>]+>/g, " ") });
  }
  const worded = links.filter((l) => words.text.test(l.label));
  if (worded.length === 1) return worded[0]!.url;
  const rest = links.filter((l) => !words.notText.test(l.label));
  return rest.length === 1 ? rest[0]!.url : null;
}

/** The text of a Word document (.doc or .docx), line by line as the document has it. */
export async function documentText(bytes: Uint8Array): Promise<string> {
  const document = await new WordExtractor().extract(Buffer.from(bytes));
  return document.getBody().replace(/\r\n?/g, "\n");
}

/** The format a version read from a document records. */
export const documentFormat = (url: string): "doc" | "docx" =>
  /\.docx(?:$|\?)/i.test(url) ? "docx" : "doc";

/**
 * Reading a scanned document: a PDF whose pages are pictures of paper has no
 * text to extract, so each page is drawn and read by OCR (tesseract.js, in
 * this process: nothing to install on the box, and no model is called).
 * A version read this way is marked so (`+ocr` on its importer version), since
 * OCR can misread a letter that the publisher's text would not.
 */
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getDocumentProxy, renderPageAsImage } from "unpdf";

/** Tesseract's names for the languages acts are published in; "de+fr+it" reads a page in any of them. */
const TESSERACT_LANG: Record<string, string> = { de: "deu", fr: "fra", it: "ita", en: "eng" };

/** Pages are drawn at about 216 dpi (PDF units are 1/72 in), enough for type set at 9 pt. */
const SCALE = 3;

/** The text of a scanned PDF, page after page. Empty when there are no pages. */
export async function ocrPdfText(
  bytes: Uint8Array,
  lang: string,
  options: { maxPages?: number; cachePath?: string } = {},
): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const pages = Math.min(pdf.numPages, options.maxPages ?? 200);
  const named = lang.split("+").map((l) => TESSERACT_LANG[l] ?? "deu");
  const worker = await createWorker(named.join("+"), 1, {
    // The language data is fetched once and kept; the default is the working directory.
    cachePath: options.cachePath ?? join(tmpdir(), "solon-tesseract"),
  });
  try {
    const out: string[] = [];
    for (let n = 1; n <= pages; n++) {
      const png = await renderPageAsImage(pdf, n, {
        canvasImport: () => import("@napi-rs/canvas"),
        scale: SCALE,
      });
      const { data } = await worker.recognize(Buffer.from(png));
      out.push(data.text);
    }
    return out.join("\n");
  } finally {
    await worker.terminate();
  }
}

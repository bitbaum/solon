/**
 * The provisions of a PDF act: its text layer cut into articles, or, when the
 * PDF is a scan with no text layer, the pages read by OCR. `scanned` says
 * which, so the version's source can record that a letter may be misread.
 */
import type { Provision } from "./fedlex";
import { cleanPdfText, documentText, parseCantonalProvisions } from "./cantonal";
import { ocrPdfText } from "./ocr";

export async function provisionsOfPdf(
  bytes: Uint8Array,
  lang: string,
  onScanned?: () => void,
): Promise<{ provisions: Provision[]; scanned: boolean }> {
  let text = cleanPdfText(await documentText(bytes, "pdf"));
  const scanned = text.replace(/\s+/g, "").length < 200;
  if (scanned) {
    onScanned?.();
    text = cleanPdfText(await ocrPdfText(bytes, lang));
  }
  return { provisions: parseCantonalProvisions(text), scanned };
}

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cleanPdfText, documentText, parseCantonalProvisions } from "../cantonal";
import { pdfWords, sequence, storedWordsOf } from "../verify";
import { tinyPdf } from "./tiny-pdf";

const WALD = new Uint8Array(readFileSync(join(__dirname, "fixtures", "eschen-waldreglement.pdf")));
const held = async (bytes: Uint8Array) =>
  parseCantonalProvisions(cleanPdfText(await documentText(bytes, "pdf")));

describe("verifying a held PDF act against its text layer, in order", () => {
  it("holds a commune's regulation word for word, its enacting formula included", async () => {
    const provisions = await held(WALD);
    // the legal basis before Art. 1 is a provision, not dropped
    expect(provisions[0]?.path).toBe("before_first");
    expect(provisions[0]?.text).toMatch(/Bürgergenossenschaften/);
    const pdf = await pdfWords(WALD);
    expect(pdf.scanned).toBe(false);
    const seq = sequence(pdf.words, storedWordsOf(provisions))!;
    expect(seq.longestMissing.text).toBe("");
    expect(seq.wordForWord).toBe(true);
  });

  it("is not word for word when an article is lost, and names the run", async () => {
    const provisions = await held(WALD);
    const cut = provisions.filter((p) => p.path !== "art_3");
    const seq = sequence((await pdfWords(WALD)).words, storedWordsOf(cut))!;
    expect(seq.wordForWord).toBe(false);
    expect(seq.afterTitleBlock).toBe(false);
    expect(seq.longestMissing.words).toBeGreaterThan(5);
  });

  it("says a PDF with no text layer is scanned: OCR is not compared with itself", async () => {
    const scan = new Uint8Array(
      readFileSync(join(__dirname, "fixtures", "balzers-statuten-ehrennadel-ccitt.pdf")),
    );
    expect((await pdfWords(scan)).scanned).toBe(true);
  });

  it("calls a short title block at the start a title block, never word for word", async () => {
    const lines = [
      "Reglement ueber die Benutzung des Gemeindesaals der Gemeinde Musterdorf, Fuerstentum Liechtenstein",
      "Art. 1 Zweck",
      "Dieses Reglement regelt die Benutzung des Gemeindesaals durch Vereine und Private.",
      "Art. 2 Gebuehren",
      "Die Gemeinde erhebt Gebuehren fuer die Benutzung des Saals nach dem Tarifblatt.",
    ];
    const bytes = tinyPdf(lines);
    const provisions = (await held(bytes)).filter((p) => p.path.startsWith("art_"));
    const pdf = await pdfWords(bytes);
    // the page has no 200 characters of text, so it reads as scanned: build the comparison on words
    const words = pdf.scanned
      ? lines
          .join(" ")
          .toLowerCase()
          .match(/[\p{L}\p{N}]{2,}/gu)!
      : pdf.words;
    const seq = sequence(words, storedWordsOf(provisions))!;
    expect(seq.wordForWord).toBe(false);
    expect(seq.leading).toBe(11);
    expect(seq.afterTitleBlock).toBe(true);
  });
});

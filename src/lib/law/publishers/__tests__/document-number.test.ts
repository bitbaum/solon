import { describe, expect, it } from "vitest";
import { numberPrintedIn } from "../document-number";
import { LI_AKTE_NUMBER, vaduz } from "../linked-documents";
import { zurichCity } from "../zurich-city";
import { PUBLISHERS } from "..";

describe("the number a commune's document prints for itself", () => {
  // The front pages of Vaduz's regulations as pdftotext reads them (downloaded 2026-11-10).
  const gemeindeordnung = `Gemeindeordnung
      der Gemeinde Vaduz

Erlassen durch die Gemeindeversammlung der Gemeinde Vaduz
Erstfassung:   26. Oktober 1997
Revision:      1. Juni 2015
Akte Nr.:      01.01.03
              GEMEINDEORDNUNG DER GEMEINDE VADUZ`;

  it("reads Akte Nr. from the front page, with or without the colon or the full stop", () => {
    expect(numberPrintedIn(gemeindeordnung, LI_AKTE_NUMBER)).toBe("01.01.03");
    expect(numberPrintedIn("Akte Nr      01.01.03 \n", LI_AKTE_NUMBER)).toBe("01.01.03");
    expect(numberPrintedIn("Akte Nr.:      177\nAbfallreglement", LI_AKTE_NUMBER)).toBe("177");
  });

  it("stops at the number, not at the next words on the line", () => {
    expect(
      numberPrintedIn("Akte Nr.:   04.02.05 1 Im Rahmen der Wasserversorgung", LI_AKTE_NUMBER),
    ).toBe("04.02.05");
    expect(numberPrintedIn("Akte Nr.: 01.01.03.\nText", LI_AKTE_NUMBER)).toBe("01.01.03");
  });

  it("says nothing when the head prints none, and ignores a number quoted further down", () => {
    expect(numberPrintedIn("Reglement\nArt. 1 Zweck", LI_AKTE_NUMBER)).toBeNull();
    const farDown = `${"Art. 1 Text. ".repeat(400)}\nGemäss Akte Nr.: 09.09.09`;
    expect(numberPrintedIn(farDown, LI_AKTE_NUMBER)).toBeNull();
  });

  it("is asked of every Liechtenstein commune's documents, and of no publisher whose listing states numbers", () => {
    expect(vaduz.numberInDocument).toBe(LI_AKTE_NUMBER);
    const asked = Object.values(PUBLISHERS)
      .filter((a) => a.numberInDocument)
      .map((a) => a.authority);
    expect(asked.length).toBeGreaterThan(5);
    expect(asked.every((authority) => /^li70\d\d$/.test(authority))).toBe(true);
    expect(zurichCity.numberInDocument).toBeUndefined();
  });
});

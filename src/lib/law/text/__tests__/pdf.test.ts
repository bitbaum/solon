/**
 * A scan compressed as CCITT fax or JBIG2, as most communes publish, must draw
 * as the page it is. Without PDF.js's WebAssembly decoders it drew blank and
 * was read as "no text in the PDF". The fixture is Balzers' one-page
 * "Statuten über die Auszeichnung Ehrennadel der Gemeinde Balzers" (a CCITT
 * scan at 300 dpi), read from balzers.li on 2026-11-08.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { renderPageAsImage } from "unpdf";
import { describe, expect, it } from "vitest";
import { openPdf, wasmFolder } from "../pdf";

const SCAN = join(__dirname, "fixtures", "balzers-statuten-ehrennadel-ccitt.pdf");

describe("opening a scanned PDF", () => {
  it("finds PDF.js's decoders", () => {
    expect(existsSync(join(wasmFolder(), "jbig2.wasm"))).toBe(true);
  });

  it("draws a fax-compressed scan as a page with writing on it, not a blank one", async () => {
    const pdf = await openPdf(new Uint8Array(readFileSync(SCAN)));
    expect(pdf.numPages).toBe(1);
    const png = await renderPageAsImage(pdf, 1, {
      canvasImport: () => import("@napi-rs/canvas"),
      scale: 2,
    });
    // A blank page at this size compresses to about 23 KB; this one is many times that.
    expect(png.byteLength).toBeGreaterThan(150_000);
  }, 60_000);
});

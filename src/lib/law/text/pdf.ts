/**
 * Opening a PDF, the one way every reader in Solon does it. unpdf's own
 * bundle of PDF.js ships without PDF.js's WebAssembly decoders, so a scanned
 * page compressed as JBIG2 or CCITT fax (most commune scans) drew blank and
 * read as "no text in the PDF". Here unpdf runs on the official PDF.js build,
 * and PDF.js is told where its decoders are (`pdfjs-dist/wasm/`).
 */
import { createRequire } from "node:module";
import { dirname, join, sep } from "node:path";
import { definePDFJSModule, getDocumentProxy } from "unpdf";

let ready: Promise<void> | null = null;

/** The folder PDF.js loads its decoders from, with the trailing separator it expects. */
export function wasmFolder(): string {
  const pkg = createRequire(import.meta.url).resolve("pdfjs-dist/package.json");
  return join(dirname(pkg), "wasm") + sep;
}

/** A PDF, opened with every decoder PDF.js has. */
export async function openPdf(bytes: Uint8Array) {
  ready ??= definePDFJSModule(() => import("pdfjs-dist/legacy/build/pdf.mjs"));
  await ready;
  return getDocumentProxy(new Uint8Array(bytes), { wasmUrl: wasmFolder() });
}

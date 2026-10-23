import { describe, expect, it } from "vitest";
import { fetchZhlexPdf, inForceFromUrl, pdfLink, readZhlexPage, redirectTarget } from "../zhlex";

const PAGE_URL =
  "https://www.zh.ch/de/politik-staat/gesetze-beschluesse/gesetzessammlung/zhlex-ls/erlass-101-2005_02_27-2006_01_01-129.html";
const PDF_URL =
  "https://www.notes.zh.ch/appl/zhlex_r.nsf/OpenAttachment?Open&docid=29614D695A87DA0DC1258C67004880D5&file=101_27.2.05_129.pdf";
const WRAPPER = `<html><body><h1>Verfassung des Kantons Zürich</h1>
<a href="/de/politik-staat/gesetze-beschluesse/gesetzessammlung/zhlex-ls/erlass-101-2005_02_27-2006_01_01-121.html">121 (in Kraft bis 01.07.2024)</a>
<a href="${PDF_URL.replace(/&/g, "&amp;")}">PDF</a></body></html>`;

describe("inForceFromUrl", () => {
  it("reads the day a version took effect from its page's address", () => {
    expect(inForceFromUrl(PAGE_URL)).toBe("2006-01-01");
    expect(inForceFromUrl(PAGE_URL.replace("2006_01_01-129", "2024_07_01-161"))).toBe("2024-07-01");
  });
  it("is null for an address that is not an act's", () => {
    expect(inForceFromUrl("https://www.zh.ch/de/politik-staat.html")).toBeNull();
  });
});

describe("pdfLink", () => {
  it("finds the PDF on the canton's file host", () => {
    expect(pdfLink(WRAPPER)).toBe(PDF_URL);
  });
  it("ignores a link to any other host, or to a file that is not a PDF", () => {
    expect(
      pdfLink(`<a href="https://evil.example/x?file=a.pdf&amp;OpenAttachment">x</a>`),
    ).toBeNull();
    expect(
      pdfLink(
        `<a href="https://www.notes.zh.ch/appl/zhlex_r.nsf/OpenAttachment?Open&amp;file=a.exe">x</a>`,
      ),
    ).toBeNull();
  });
});

describe("readZhlexPage and fetchZhlexPdf", () => {
  const serve = (body: string, status = 200) =>
    (async () => new Response(body, { status })) as unknown as typeof fetch;

  it("returns the PDF and the day the version took effect", async () => {
    expect(await readZhlexPage(PAGE_URL, serve(WRAPPER))).toEqual({
      pageUrl: PAGE_URL,
      pdfUrl: PDF_URL,
      inForceFrom: "2006-01-01",
    });
  });
  it("reads a page the register links as http:// over https", async () => {
    const act = await readZhlexPage(PAGE_URL.replace("https://", "http://"), serve(WRAPPER));
    expect(act?.pageUrl).toBe(PAGE_URL);
  });
  it("does not fetch an address outside the canton's page host", async () => {
    let asked = false;
    const spy = (async () => {
      asked = true;
      return new Response(WRAPPER);
    }) as unknown as typeof fetch;
    expect(await readZhlexPage(PAGE_URL.replace("www.zh.ch", "evil.example"), spy)).toBeNull();
    expect(asked).toBe(false);
  });
  it("returns nothing for a page with no PDF, a failing page, or bytes that are not a PDF", async () => {
    expect(await readZhlexPage(PAGE_URL, serve("<html>none</html>"))).toBeNull();
    expect(await readZhlexPage(PAGE_URL, serve("x", 500))).toBeNull();
    expect(await fetchZhlexPdf(PDF_URL, serve("<html>login</html>"))).toBeNull();
    expect(await fetchZhlexPdf(PDF_URL, serve("%PDF-1.4 ..."))).not.toBeNull();
  });
});

describe("the file host's redirect", () => {
  const redirect = `<html><script>window.location="/appl/zhlex_r.nsf/WebView/29614D/$File/101_27.2.05_129.pdf"</script></html>`;
  it("is followed once, to the file on the same host", () => {
    expect(redirectTarget(redirect, PDF_URL)).toBe(
      "https://www.notes.zh.ch/appl/zhlex_r.nsf/WebView/29614D/$File/101_27.2.05_129.pdf",
    );
  });
  it("is not followed anywhere else", () => {
    expect(
      redirectTarget(`<script>window.location="https://evil.example/a.pdf"</script>`, PDF_URL),
    ).toBeNull();
    expect(
      redirectTarget(`<script>window.location="/other/path.pdf"</script>`, PDF_URL),
    ).toBeNull();
    expect(redirectTarget("<html>login</html>", PDF_URL)).toBeNull();
  });
  it("fetches the PDF behind it", async () => {
    const seen: string[] = [];
    const doFetch = (async (input: string | URL | Request) => {
      seen.push(String(input));
      return String(input).includes("WebView")
        ? new Response("%PDF-1.4 ...")
        : new Response(redirect);
    }) as unknown as typeof fetch;
    expect(await fetchZhlexPdf(PDF_URL, doFetch)).not.toBeNull();
    expect(seen).toHaveLength(2);
  });
});

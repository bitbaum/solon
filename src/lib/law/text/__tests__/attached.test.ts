import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PARLIAMENTRSO } from "@/lib/config/law";
import { STUB_CHARS, attachedDocumentUrl, documentFormat, documentText } from "../attached";
import { cutProvisions, linesOf, parseNode } from "../so-text";

const fixture = (name: string) => readFileSync(join(__dirname, "fixtures", name));
const linked = (html: string) =>
  attachedDocumentUrl(
    html,
    "https://parliamentrso.org/node/1",
    PARLIAMENTRSO.hosts,
    PARLIAMENTRSO.documentLinks,
  );

describe("an act printed as a page that links its document", () => {
  // The Parliament's page for the Tax Code, Part Two (node 5469, read 2026-11-10).
  const page = fixture("parliamentrso-node-5469.fixture.html").toString("utf8");
  const node = parseNode(page)!;

  it("is a door, not the act: a few words and links to Word files, the text's worded as such", () => {
    expect(linesOf(node.bodyHtml).length).toBeLessThan(STUB_CHARS);
    // Two files: the contents ("Содержание кодекса читать тут") and the text ("Текст кодекса скачать тут").
    expect(linked(node.bodyHtml)).toBe(
      "https://parliamentrso.org/sites/default/files/sites/default/files/source_images/nalogovyy_kodeks_respubliki_yuzhnaya_osetiya_ch.2_ispr_parl_0.doc",
    );
  });

  it("follows only a document on the publisher's own hosts", () => {
    expect(
      linked('<a href="https://elsewhere.example/code.doc">Текст</a><a href="/p.html">y</a>'),
    ).toBeNull();
  });

  it("guesses nothing when several documents are worded alike, and takes the only one there is", () => {
    expect(linked('<a href="/a.doc">Часть 1</a><a href="/b.doc">Часть 2</a>')).toBeNull();
    expect(linked('<a href="/a.doc">Часть 1</a>')).toBe("https://parliamentrso.org/a.doc");
  });

  it("reads the document's text, which cuts into its articles", async () => {
    // A two-article code written for the test, saved as a Word 97 file by LibreOffice.
    const text = await documentText(new Uint8Array(fixture("so-code-cut.doc")));
    expect(text).toContain("Статья 2. Налоговые ставки");
    const provisions = cutProvisions(text);
    expect(provisions.map((p) => p.path)).toEqual(expect.arrayContaining(["art_1", "art_2"]));
    expect(provisions.find((p) => p.path === "art_2")?.text).toContain("12 процентов");
  });

  it("records the document's format", () => {
    expect(documentFormat("https://x.org/a.doc")).toBe("doc");
    expect(documentFormat("https://x.org/a.docx?x=1")).toBe("docx");
  });
});

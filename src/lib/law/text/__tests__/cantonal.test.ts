import { describe, expect, it } from "vitest";
import { WHOLE_ACT } from "../fedlex";
import { cleanPdfText, documentUrl, fetchDocument, parseCantonalProvisions } from "../cantonal";

describe("cleanPdfText", () => {
  it("drops page numbers and lines repeated on every page, and joins words broken at a line end", () => {
    const page = (n: number) =>
      `Kantonsverfassung 101\nArt. ${n} Steuer-\npflichtige zahlen ${n}.\n${n}`;
    const raw = Array.from({ length: 9 }, (_, i) => page(i + 1)).join("\n");
    const text = cleanPdfText(raw);
    expect(text).not.toContain("Kantonsverfassung 101");
    expect(text).toContain("Steuerpflichtige zahlen 1.");
    expect(text.split("\n").filter((l) => /^\d{1,4}$/.test(l))).toEqual([]);
  });
  it("keeps the hyphen before a conjunction", () => {
    expect(cleanPdfText("Einkommens-\nund Vermögenssteuern")).toBe(
      "Einkommens-\nund Vermögenssteuern",
    );
  });
});

describe("parseCantonalProvisions", () => {
  // As a two-column PDF gives it: margin notes before, or glued to, the heading.
  const text = [
    "1. Kapitel: Grundlagen",
    "Kanton ZürichArt. 1 1 Der Kanton Zürich ist ein souveräner Stand.",
    "2 Er gründet auf der Mitverantwortung, vgl. Art. 9 Abs. 2 und nach Art. 12 des Gesetzes.",
    "Zusammenarbeit",
    "Art. 2 Der Kanton arbeitet mit den Gemeinden zusammen.",
    "Subsidiarität Art. 3 1 Jede Person nimmt Verantwortung wahr.",
    "Art. 3a Eine Ergänzung.",
    "Art. 4 Schluss.",
  ].join("\n");
  const provisions = parseCantonalProvisions(text);

  it("finds the articles in the order the act numbers them, with a letter article between", () => {
    expect(provisions.map((p) => p.path)).toEqual(["art_1", "art_2", "art_3", "art_3a", "art_4"]);
  });
  it("titles an article with the margin note that comes before its heading", () => {
    expect(provisions[0]!.heading).toBe("Art. 1 Kanton Zürich");
    expect(provisions[1]!.heading).toBe("Art. 2 Zusammenarbeit");
    expect(provisions[2]!.heading).toBe("Art. 3 Subsidiarität");
  });
  it("keeps a margin note out of the article before it, and references inside an article", () => {
    expect(provisions[0]!.text).toContain("vgl. Art. 9 Abs. 2 und nach Art. 12 des Gesetzes.");
    expect(provisions[0]!.text).not.toContain("Zusammenarbeit");
    expect(provisions[1]!.text).toBe("Der Kanton arbeitet mit den Gemeinden zusammen.");
  });
  it("passes over a reference to a later article met before the real one", () => {
    const out = parseCantonalProvisions(
      "Art. 1 Zweck. Siehe Art. 3 Hinweis.\nArt. 2 Geltung.\nArt. 3 Schluss.",
    );
    expect(out.map((p) => p.path)).toEqual(["art_1", "art_2", "art_3"]);
  });
  it("reads §§ as well", () => {
    expect(parseCantonalProvisions("§ 1 Zweck\n§ 2 Geltung").map((p) => p.path)).toEqual([
      "par_1",
      "par_2",
    ]);
  });
  it("is one provision, the whole text, when there are no headings", () => {
    const out = parseCantonalProvisions("Ein Beschluss ohne Artikel.", "Beschluss");
    expect(out).toEqual([
      { path: WHOLE_ACT, heading: "Beschluss", text: "Ein Beschluss ohne Artikel." },
    ]);
  });
});

describe("fetchDocument", () => {
  const reply = (init: ResponseInit & { body: string }) =>
    (async () => new Response(init.body, init)) as unknown as typeof fetch;
  it("addresses the act's document by its register id", () => {
    expect(documentUrl("21736", "de")).toBe("https://www.lexfind.ch/tol/21736/de");
  });
  it("recognises a PDF by its bytes and an HTML page by its type, and returns nothing for the rest", async () => {
    expect((await fetchDocument("1", "de", reply({ body: "%PDF-1.4 ..." })))?.kind).toBe("pdf");
    expect(
      (
        await fetchDocument(
          "1",
          "de",
          reply({ body: "<p>x</p>", headers: { "content-type": "text/html" } }),
        )
      )?.kind,
    ).toBe("html");
    expect(
      await fetchDocument(
        "1",
        "de",
        reply({ body: "x", headers: { "content-type": "text/plain" } }),
      ),
    ).toBeNull();
    expect(await fetchDocument("1", "de", reply({ body: "gone", status: 404 }))).toBeNull();
  });
});

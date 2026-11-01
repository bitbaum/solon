import { describe, expect, it } from "vitest";
import { WHOLE_ACT } from "../fedlex";
import { cleanPdfText, documentUrl, fetchDocument, parseCantonalProvisions } from "../cantonal";

describe("cleanPdfText", () => {
  it("replaces a NUL, which a PDF holds for a glyph with no character and Postgres cannot store", () => {
    expect(cleanPdfText("weiterzuentwickeln \u0000 dies in Kooperation")).toBe(
      "weiterzuentwickeln dies in Kooperation",
    );
  });

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
  it("keeps what comes before a first heading that is not article 1, rather than drop it", () => {
    const sections =
      "1. Zweck\nDer Gemeindesaal kann an Vereine vermietet werden, zum Zwecke der Durchführung von Veranstaltungen.\n" +
      "2. Verwaltung\nDie Verwaltung obliegt der Gemeindeverwaltung im Rahmen der in diesem Reglement festgelegten Bestimmungen.\n";
    const provisions = parseCantonalProvisions(
      `${sections}3. Art. 3 Verpflichtung\nMit der Bewilligung untersteht der Inhaber diesem Reglement.`,
    );
    expect(provisions.map((p) => p.path)).toEqual(["before_first", "art_3"]);
    expect(provisions[0]!.text).toContain("2. Verwaltung");
  });

  it("drops only a title before article 1", () => {
    const provisions = parseCantonalProvisions(
      "Reglement über den Gemeindesaal\nArt. 1 Zweck\nDer Saal wird vermietet.\nArt. 2 Verwaltung\nDie Gemeinde verwaltet ihn.",
    );
    expect(provisions.map((p) => p.path)).toEqual(["art_1", "art_2"]);
  });

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

describe("parseCantonalProvisions on what the cantons' PDFs do (measured 2026-11-01)", () => {
  const paths = (text: string) => parseCantonalProvisions(text).map((p) => p.path);

  it("reads a paragraph number glued to the text (Neuchâtel, Ticino)", () => {
    const ne = [
      "Art. 1 1Le présent règlement règle l'exécution de la loi.",
      "Art. 2 1Le présent arrêté entre en vigueur avec effet immédiat.",
      "2Il sera publié dans la Feuille officielle.",
    ].join("\n");
    expect(paths(ne)).toEqual(["art_1", "art_2"]);
  });

  it("reads an article whose number has a footnote glued to it, by the act's order", () => {
    const ti = [
      "Scopo",
      "Art. 13 La presente legge disciplina l’applicazione delle norme federali.",
      "Provvedimento sostitutivo",
      "Art. 2 1Può essere ordinato un provvedimento sostitutivo.",
      "Art. 3 Esecuzione.",
    ].join("\n");
    const out = parseCantonalProvisions(ti);
    expect(out.map((p) => p.path)).toEqual(["art_1", "art_2", "art_3"]);
    expect(out[0]!.heading).toBe("Art. 1 Scopo");
    const ne =
      "Art. 1 Objet.\nArt. 23) Le service informatique est l'exploitant.\nArt. 3 1La commission est nommée.";
    expect(paths(ne)).toEqual(["art_1", "art_2", "art_3"]);
  });

  it("keeps a real two-digit article when the act has reached it", () => {
    const text = Array.from({ length: 14 }, (_, i) => `Art. ${i + 1} Text ${i + 1}.`).join("\n");
    expect(paths(text).slice(-3)).toEqual(["art_12", "art_13", "art_14"]);
  });

  it("reads a § followed by a numbered title (Schwyz) and a starred article (St. Gallen)", () => {
    const sz =
      "I. Allgemeine Bestimmungen\n§ 1 1. Gegenstand\nDieses Gesetz regelt die Finanzen.\n§ 2 2. Geltungsbereich\n1 Dieses Gesetz gilt für die Gemeinden.\n§ 3 3 3. Begriffe\nText.";
    expect(paths(sz)).toEqual(["par_1", "par_2", "par_3"]);
    const sg =
      "Art. 1* Arbeitsverhältnis\n1 In ein unbefristetes Arbeitsverhältnis tritt, wer die Voraussetzungen von Art. 49 des Gesetzes erfüllt.\nArt. 2 Lohn\nText.";
    expect(paths(sg)).toEqual(["art_1", "art_2"]);
  });

  it("reads French and Italian signs and capitals", () => {
    expect(paths("Article 1 Écoles.\nArticle 2 À Genève.\nArticolo 3 Entrata in vigore.")).toEqual([
      "art_1",
      "art_2",
      "art_3",
    ]);
  });

  it("still passes over a reference, and keeps bis articles", () => {
    expect(
      paths(
        "Art. 1 Gestützt auf Art. 5 des Gesetzes und Art. 7 Abs. 2.\nArt. 2 Text.\nArt. 2bis Mehr.\nArt. 3 Ende.",
      ),
    ).toEqual(["art_1", "art_2", "art_2bis", "art_3"]);
  });
});

describe("the first article by its name", () => {
  it("reads 'Article premier', with a note glued to it, as article 1 (Neuchâtel, Geneva, Vaud, Jura)", () => {
    const ne =
      "arrête:\nArticle premier2) Le département est compétent.\nArt. 23) Le service informatique est l'exploitant.\nArt. 3 1La commission est nommée.";
    const out = parseCantonalProvisions(ne);
    expect(out.map((p) => p.path)).toEqual(["art_1", "art_2", "art_3"]);
    expect(out[0]!.text).toBe("Le département est compétent.");
  });
});

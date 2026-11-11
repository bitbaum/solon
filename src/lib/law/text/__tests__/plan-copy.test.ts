import { describe, expect, it } from "vitest";
import {
  cutArticles,
  editionToFollow,
  subpagesOf,
  latestYear,
  refuseCopy,
  wikisourceRestUrl,
  wikisourceText,
  wikisourceTitle,
} from "../plan-copy";

const articles = (n: number, word = "Статья") =>
  Array.from({ length: n }, (_, i) => `${word} ${i + 1}\nТекст статьи ${i + 1}.`).join("\n");

describe("a copy of a constitution", () => {
  it("asks Wikisource's REST API for the page and keeps the page's own title", () => {
    const url =
      "https://ru.wikisource.org/wiki/%D0%9A%D0%BE%D0%BD%D1%81%D1%82%D0%B8%D1%82%D1%83%D1%86%D0%B8%D1%8F";
    expect(wikisourceRestUrl(url)).toBe(
      "https://ru.wikisource.org/api/rest_v1/page/html/%D0%9A%D0%BE%D0%BD%D1%81%D1%82%D0%B8%D1%82%D1%83%D1%86%D0%B8%D1%8F",
    );
    expect(wikisourceTitle("https://de.wikisource.org/wiki/Grundgesetz_(1949)")).toBe(
      "Grundgesetz (1949)",
    );
  });

  it("drops what Wikisource adds, and reads an inserted article's superscript as its number", () => {
    const html = `<div class="headertemplate"><div>← Редакция № 5</div></div>
      <h4><b>Статья 67<sup id="x">1*</sup></b></h4><p>Российская Федерация является правопреемником.<sup class="mw-ref reference">[1]</sup></p>
      <div class="ws-noexport">Википедия</div>`;
    const text = wikisourceText(html);
    expect(text).not.toMatch(/Редакция|Википедия|\[1\]/);
    expect(cutArticles(`${articles(5)}\n${text}`).map((p) => p.path)).toContain("art_67_1");
  });

  it("cuts articles in many languages, a chapter between them a heading of its own", () => {
    for (const word of ["Стаття", "Artikel", "Art.", "Article", "Článek", "მუხლი"]) {
      const cut = cutArticles(`Преамбула\n${articles(3, word)}`);
      expect(
        cut.map((p) => p.path),
        word,
      ).toEqual(["preamble", "art_1", "art_2", "art_3"]);
    }
    expect(cutArticles("1. cikk\nA\n2. cikk\nB").map((p) => p.path)).toEqual(["art_1", "art_2"]);
    expect(cutArticles("Розділ I\nСтаття 1. Україна є суверенна").map((p) => p.path)).toEqual([
      "ch_i",
      "art_1",
    ]);
    // An amended article marked with an asterisk is still that article.
    expect(cutArticles("Статья 68*\nТекст").map((p) => p.path)).toEqual(["art_68"]);
  });

  it("refuses a copy with too few articles, or older than the last amendment the index records", () => {
    const old = `${articles(10)}\nзі змінами від 08.12.2004`;
    expect(latestYear(old)).toBe(2004);
    expect(refuseCopy(cutArticles(old), old, 2019)).toMatch(/older edition/);
    const current = `${old}\nЗакон від 7 лютого 2019 року`;
    expect(refuseCopy(cutArticles(current), current, 2019)).toBeNull();
    expect(refuseCopy(cutArticles(articles(2)), articles(2), null)).toMatch(/only 2 articles/);
  });

  it("reads the article headings of more languages and scripts", () => {
    const paths = (text: string) => cutArticles(text).map((p) => p.path);
    expect(paths("Art. 1º A República\nArt. 2º São Poderes")).toEqual(["art_1", "art_2"]);
    expect(paths("Article premier\nLa France\nArticle 2\nLa langue")).toEqual(["art_1", "art_2"]);
    expect(paths("Article I\nAll legislative Powers\nArticle XIV\nNo State")).toEqual([
      "art_1",
      "art_14",
    ]);
    expect(paths("§ 1\nKongeriget Norge\n§ 2\nVerdigrunnlaget")).toEqual(["art_1", "art_2"]);
    expect(paths("الفصل 1\nنص\nالفصل 2\nنص")).toEqual(["art_1", "art_2"]);
    // Where the text has articles, its sections are parts of them.
    expect(
      paths(
        "Article 1: Sovereignty\nSection 1: Self\nText\nSection 2: Person\nArticle 2: Property",
      ),
    ).toEqual(["art_1", "art_2"]);
    // A second printing of the same text after the first is not read.
    expect(paths("第一条 A\n第二条 B\n第一条 A\n第二条 B")).toEqual(["art_1", "art_2"]);
    expect(paths("第一条　天皇は\n第九十九条　天皇")).toEqual(["art_1", "art_99"]);
    expect(paths("المادة 1\nنص\nالمادة ٢\nنص")).toEqual(["art_1", "art_2"]);
  });

  it("follows an index of editions to a full text, else to the latest edition", () => {
    const link = (target: string, label: string) =>
      `<a rel="mw:WikiLink" href="./${target}">${label}</a>`;
    expect(
      editionToFollow(
        `${link("Grondwet_(2023)/Gehele_tekst", "Gehele tekst")}${link("Grondwet_(2023)/Hoofdstuk_1", "1")}`,
        "Grondwet (2023)",
      ),
    ).toBe("Grondwet (2023)/Gehele tekst");
    expect(
      editionToFollow(
        `${link("Constitution_(version_initiale)", "version initiale")}${link("Constitution_(à_jour_2008)", "à jour 2008")}${link("Fichier:x.jpg", "")}`,
        "Constitution",
      ),
    ).toBe("Constitution (à jour 2008)");
    expect(editionToFollow(link("Auteur:Someone", "Someone"), "Constitution")).toBeNull();
  });

  it("never follows a link to another document, and reads a constitution split into subpages whole", () => {
    const link = (target: string, label: string) =>
      `<a rel="mw:WikiLink" href="./${target}">${label}</a>`;
    // A page that cites a 2000 copyright law: not an edition of the constitution.
    expect(
      editionToFollow(
        link("Loi_n°_2-00_relative_aux_droits_d'auteur", "loi 2-00"),
        "Constitution du Maroc",
      ),
    ).toBeNull();
    const html = ["Preamble", "Part_I", "Part_II", "Part_III"]
      .map((p) => link(`Constitution_of_India_(2020)/${p}`, p))
      .join("");
    expect(subpagesOf(html, "Constitution of India (2020)")).toEqual([
      "Constitution of India (2020)/Preamble",
      "Constitution of India (2020)/Part I",
      "Constitution of India (2020)/Part II",
      "Constitution of India (2020)/Part III",
    ]);
  });
});

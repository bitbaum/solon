import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseLilexProvisions } from "../lilex";
import { headingsAbove, newHeadings } from "../../heading-path";
import {
  FURNITURE_TABLES,
  HEADER_CLASSES,
  sequence,
  storedWordsOf,
  visibleText,
  wordsOf,
} from "../verify";

const page = (name: string) =>
  readFileSync(new URL(`./fixtures/lilex/${name}`, import.meta.url), "utf8");
const pageWords = (html: string) =>
  wordsOf(visibleText(html, HEADER_CLASSES.li, FURNITURE_TABLES.li));

describe("chapter headings on the provisions under them (saved gesetze.li pages)", () => {
  it("attaches tit1/tit2/tit3 to the articles that follow, replacing a level and ending the deeper ones", () => {
    const html = page("waffengesetz-2008275000-excerpt.fixture.html");
    const provisions = parseLilexProvisions(html);
    const articles = provisions.filter((p) => p.path.startsWith("art_"));
    expect(articles.length).toBeGreaterThan(10);
    expect(articles.some((p) => (p.headingPath ?? []).length > 1)).toBe(true);
    // a path is outermost first and never repeats a level
    for (const a of articles)
      expect(new Set(a.headingPath).size).toBe((a.headingPath ?? []).length);
    // every word of the page, the chapter headings and "CO2" included, is held in the page's order
    const seq = sequence(pageWords(html), storedWordsOf(provisions))!;
    expect(seq.longestMissing.text).toBe("");
    expect(seq.wordForWord).toBe(true);
  });

  it("holds the heading above an annex under its own title (a `tits` block, Waffengesetz)", () => {
    const html = page("waffengesetz-2008275000-end.fixture.html");
    const provisions = parseLilexProvisions(html);
    const annex = provisions.find((p) => p.path.startsWith("part_") && p.headingPath?.length);
    expect(annex?.headingPath).toEqual(["Übergangs- und Inkrafttretensbestimmungen"]);
    const seq = sequence(pageWords(html), storedWordsOf(provisions))!;
    expect(seq.longestMissing.text).toBe("");
    expect(seq.wordForWord).toBe(true);
  });

  it("shows a heading once, above the first article under it", () => {
    expect(newHeadings(undefined, ["I. A", "1. B"])).toEqual(["I. A", "1. B"]);
    expect(newHeadings(["I. A", "1. B"], ["I. A", "1. B"])).toEqual([]);
    expect(newHeadings(["I. A", "1. B"], ["I. A", "2. C"])).toEqual(["2. C"]);
    expect(newHeadings(["I. A", "1. B"], ["II. D"])).toEqual(["II. D"]);
  });
});

describe("which headings are printed above a provision", () => {
  it("shows an annex's headings every time, an article's only when they changed", () => {
    const art = (path: string, headingPath: string[]) => ({ path, headingPath });
    expect(headingsAbove(art("art_1", ["I."]), art("art_2", ["I."]))).toEqual([]);
    expect(headingsAbove(art("art_1", ["I."]), art("art_2", ["I.", "A."]))).toEqual(["A."]);
    expect(headingsAbove(art("part_1", ["II."]), art("part_2", ["II."]))).toEqual(["II."]);
    expect(
      headingsAbove({ ...art("part_1", ["II."]), heading: "II." }, art("part_2", ["II."])),
    ).toEqual([]);
  });
});

describe("gazette masthead is furniture, not the act", () => {
  const html = page("kundmachung-2022308000.fixture.html");
  it("leaves the Landesgesetzblatt table out of the page's words", () => {
    const words = pageWords(html);
    expect(words).not.toContain("landesgesetzblatt");
    expect(words).not.toContain("jahrgang");
    expect(words).toContain("landtag");
    // only the table: another table stays
    expect(
      visibleText("<table><tr><td>Tarif</td></tr></table>", [], FURNITURE_TABLES.li),
    ).toContain("Tarif");
  });
  it("holds the whole Kundmachung word for word", () => {
    const provisions = parseLilexProvisions(html);
    const seq = sequence(pageWords(html), storedWordsOf(provisions));
    expect(seq?.wordForWord).toBe(true);
  });
});

describe("the check against the page is order-aware", () => {
  it("every page word held in order is word for word", () => {
    const a = wordsOf("eins zwei drei vier");
    const s = sequence(a, wordsOf("vorwort eins zwei drei vier")!)!;
    expect(s.wordForWord).toBe(true);
    expect(s.ratio).toBe(1);
  });
  it("the same words in another order are not word for word, though the bag matches", () => {
    const s = sequence(
      wordsOf("eins zwei drei vier fünf sechs"),
      wordsOf("fünf sechs eins zwei drei vier"),
    )!;
    expect(s.wordForWord).toBe(false);
    expect(s.inOrder).toBe(4);
    expect(s.longestMissing.words).toBe(2);
    expect(s.longestMissing.text).toBe("fünf sechs");
  });
  it("names the longest missing run and where it starts", () => {
    const s = sequence(wordsOf("a1 b2 c3 d4 e5 f6 g7 h8"), wordsOf("a1 b2 g7 h8"))!;
    expect(s.inOrder).toBe(4);
    expect(s.longestMissing).toEqual({ words: 4, at: 2, text: "c3 d4 e5 f6" });
  });
  it("gives up rather than call a very different text word for word", () => {
    expect(sequence(wordsOf("a1 b2 c3 d4"), wordsOf("w1 x2 y3 z4"), 3)).toBeNull();
  });
  it("a missing chapter heading is caught (the saved pages before this change)", () => {
    const html = page("aifmv-2026092000-excerpt.fixture.html");
    const provisions = parseLilexProvisions(html).map((p) => ({ ...p, headingPath: [] }));
    const without = sequence(pageWords(html), storedWordsOf(provisions))!;
    expect(without.wordForWord).toBe(false);
    const withPaths = sequence(pageWords(html), storedWordsOf(parseLilexProvisions(html)))!;
    expect(withPaths.ratio).toBeGreaterThan(without.ratio);
  });
});

describe("shapes of gesetze.li pages found by checking 24 more acts", () => {
  const wrap = (body: string) =>
    `<html><body><div class="htit1">Gesetz</div><div class="vom">vom 1. Mai 2020</div>${body}</body></html>`;
  const wordForWord = (html: string) => {
    const seq = sequence(pageWords(html), storedWordsOf(parseLilexProvisions(html)))!;
    expect(seq.longestMissing.text).toBe("");
    expect(seq.wordForWord).toBe(true);
  };

  it("holds a footnote-marked word in an annex and in a page that is one block", () => {
    wordForWord(
      wrap(
        `<div class="art"><a name="art:1"></a>Art. 1<div class="abs">Text.</div></div>` +
          `<div class="tit1"><a name="tit1:1"></a>II.</div><div class="tit1ue">Übergang</div>` +
          `<div class="abs">Vor Inkrafttreten<a href="#fn1" name="fr1"><sup>1</sup></a> gilt dies.</div>`,
      ),
    );
    wordForWord(
      wrap(`<div class="abs">Fassung<a href="#fn2" name="fr2"><sup>220</sup></a> gilt.</div>`),
    );
  });

  it("lists the same numeral heading again above each annex that the page prints it over", () => {
    const html = wrap(
      `<div class="art"><a name="art:1"></a>Art. 1<div class="abs">Eins.</div></div>` +
        `<div class="tit1">II.</div><div class="tit1ue">Übergang</div><div class="abs">Erster Anhang.</div>` +
        `<div class="tit1">II.</div><div class="tit1ue">Inkrafttreten</div><div class="abs">Zweiter Anhang.</div>`,
    );
    wordForWord(html);
    const parts = parseLilexProvisions(html).filter((p) => p.path.startsWith("part_"));
    expect(parts.map((p) => p.headingPath)).toEqual([["II."], ["II."]]);
  });

  it("holds the title that stands above a single article, and not on the ones after it", () => {
    const html = wrap(
      `<div class="sacht" style="margin-top:23pt"><a name="vorart:2;sacht:1"></a>Kündigung</div>` +
        `<div class="art"><a name="art:2"></a>Art. 2<div class="sacht">a) Form</div><div class="abs">Eins.</div></div>` +
        `<div class="art"><a name="art:3"></a>Art. 3<div class="sacht">b) Frist</div><div class="abs">Zwei.</div></div>`,
    );
    wordForWord(html);
    const [two, three] = parseLilexProvisions(html);
    expect(two?.headingPath).toEqual(["Kündigung"]);
    expect(three?.headingPath).toEqual([]);
  });

  it("keeps every heading of a run that has no text between them, even one a later heading replaced", () => {
    wordForWord(
      wrap(
        `<div class="art"><a name="art:1"></a>Art. 1<div class="abs">Eins.</div></div>` +
          `<div class="tit1">Anlage</div><div class="tits">Voranschlag<br>für 2021</br></div>` +
          `<div class="tit1">Erfolgsrechnung</div><div class="tit1">Investitionsrechnung</div>` +
          `<table><tr><td>Konto</td><td>Aufwand</td></tr></table>`,
      ),
    );
  });
});

import { describe, expect, it } from "vitest";
import { coverage, divClasses, htmlAround, missingRuns, visibleText, wordsOf } from "../verify";

describe("verifying held text against the page it came from", () => {
  it("reads a page as its visible words", () => {
    const html =
      "<html><head><style>p{}</style><script>var a=1</script></head><body><p>Art. 1 &Uuml;berschrift&nbsp;und&#160;Text &amp; mehr</p><!-- hidden --></body></html>";
    expect(wordsOf(visibleText(html))).toEqual(["art", "überschrift", "und", "text", "mehr"]);
  });

  it("leaves the page's footnotes out: they are amendment history, not the law's text", () => {
    const html =
      '<div class="art">Art. 1 Zweck</div><div class="fntext"><a href="#fr1">1</a> eingefügt durch LGBl. 2024 Nr. 416.</div>';
    expect(wordsOf(visibleText(html))).toEqual(["art", "zweck"]);
  });

  it("counts every repeat, so a skipped article shows up", () => {
    const page = wordsOf("Die Gemeinde erhebt Gebühren. Die Gebühren sind geschuldet.");
    const whole = coverage(page, page);
    expect(whole.ratio).toBe(1);
    expect(whole.missing).toEqual([]);

    const cut = coverage(page, wordsOf("Die Gemeinde erhebt Gebühren."));
    expect(cut.matched).toBe(4);
    expect(cut.ratio).toBeCloseTo(4 / 8);
    expect(cut.missing.map((m) => m.word)).toEqual(["die", "gebühren", "geschuldet", "sind"]);
  });

  it("does not count words held but not on the page against the page", () => {
    const c = coverage(wordsOf("eins zwei"), wordsOf("eins zwei drei vier"));
    expect(c.ratio).toBe(1);
  });

  it("treats an empty page as fully covered rather than dividing by zero", () => {
    expect(coverage([], wordsOf("text")).ratio).toBe(1);
  });

  it("shows a long block that was not kept, not a scatter of missing words", () => {
    const page = wordsOf(
      "art 1 zweck anhang eins diese liste nennt die rechtsakte der union nummer eins nummer zwei nummer drei art 2 schluss",
    );
    const stored = wordsOf("art 1 zweck art 2 schluss");
    const runs = missingRuns(page, stored, 5);
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatch(/^\d+ words: anhang eins diese liste/);
    expect(missingRuns(page, page, 5)).toEqual([]);
  });

  it("names the div classes a page is built from, commonest first", () => {
    expect(
      divClasses('<div class="art"></div><div class="art"></div><div class="anh x"></div>'),
    ).toBe("artx2 anh xx1");
  });

  it("decodes the entities a page uses for § and quotation marks, so they are not counted as missing", () => {
    expect(wordsOf(visibleText("&sect; 12 &lsquo;Haus&rsquo; caf&eacute;"))).toEqual([
      "12",
      "haus",
      "café",
    ]);
  });

  it("shows the raw markup where a missing run begins", () => {
    const html =
      '<div class="x">vorher</div><div class="ab">Liste <b>der</b> Staaten</div><div>nachher</div>';
    expect(htmlAround(html, "5 words: liste der staaten", 20)).toContain('<div class="ab">Liste');
    expect(htmlAround(html, "5 words: gibtesnicht", 20)).toBe("");
  });
});

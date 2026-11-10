import { describe, expect, it } from "vitest";
import { coverage, visibleText, wordsOf } from "../verify";

describe("verifying held text against the page it came from", () => {
  it("reads a page as its visible words", () => {
    const html =
      "<html><head><style>p{}</style><script>var a=1</script></head><body><p>Art. 1 &Uuml;berschrift&nbsp;und&#160;Text &amp; mehr</p><!-- hidden --></body></html>";
    expect(wordsOf(visibleText(html))).toEqual(["art", "überschrift", "und", "text", "mehr"]);
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
});

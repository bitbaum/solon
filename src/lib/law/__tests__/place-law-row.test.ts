import { describe, expect, it } from "vitest";
import { lawRowText } from "../place-law-row";

describe("what a place's law row says", () => {
  it("South Ossetia: 1,849 acts registered, none with text: the count, and that texts are not held yet", () => {
    expect(lawRowText({ acts: 0, registered: 1849 })).toEqual({
      label: { key: "registered", count: 1849 },
      detail: { key: "textsNotHeld", count: 0 },
    });
  });

  it("Liechtenstein: every registered act has its text: the count, and nothing to qualify", () => {
    expect(lawRowText({ acts: 3412, registered: 3412 })).toEqual({
      label: { key: "count", count: 3412 },
      detail: null,
    });
  });

  it("some texts held: says how many more are registered without a text", () => {
    expect(lawRowText({ acts: 40, registered: 100 })).toEqual({
      label: { key: "count", count: 40 },
      detail: { key: "moreRegistered", count: 60 },
    });
  });

  it("nothing registered: says nothing is held, not that texts are missing", () => {
    expect(lawRowText({ acts: 0, registered: 0 })).toEqual({
      label: { key: "nothing", count: 0 },
      detail: null,
    });
  });

  it("never says texts are missing when there are no acts they could belong to", () => {
    for (const acts of [0, 5]) {
      const row = lawRowText({ acts, registered: acts });
      expect(row.detail?.key).not.toBe("textsNotHeld");
    }
  });
});

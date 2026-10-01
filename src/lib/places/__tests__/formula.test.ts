import { describe, expect, it } from "vitest";
import { parseFormula } from "../adapters/formula";

describe("parseFormula", () => {
  it("reduces Basel-Landschaft's formulas to constant, linear and x·ln x terms", () => {
    expect(
      parseFormula("-0.328481* $wert$ + 0.043109 * $wert$ * (log $wert$ - 1) + (-1248.266121)"),
    ).toEqual({
      constant: -1248.266121,
      linear: expect.closeTo(-0.328481 - 0.043109, 12),
      xLnX: 0.043109,
    });
    expect(parseFormula("0.49 * $wert$ / 100")).toEqual({
      constant: 0,
      linear: 0.0049,
      xLnX: 0,
    });
    expect(parseFormula("235484.5479+ 0.1862 * ($wert$ - 1265000)")).toEqual({
      constant: expect.closeTo(235484.5479 - 0.1862 * 1265000, 6),
      linear: 0.1862,
      xLnX: 0,
    });
  });

  it("refuses what the shape cannot hold, instead of approximating it", () => {
    expect(() => parseFormula("$wert$ * $wert$")).toThrow(/not of the form/);
    expect(() => parseFormula("log $wert$")).toThrow(/bare ln x/);
    expect(() => parseFormula("log (2 * $wert$)")).toThrow(/log of something other/);
    expect(() => parseFormula("$wert$ / $wert$")).toThrow(/divides by/);
    expect(() => parseFormula("exp $wert$")).toThrow(/cannot read/);
    expect(() => parseFormula("(1 + 2")).toThrow(/expected \)/);
  });
});

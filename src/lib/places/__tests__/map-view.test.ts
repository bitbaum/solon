import { describe, expect, it } from "vitest";
import { classOf, quantileBreaks } from "../map-view";

describe("quantileBreaks and classOf", () => {
  it("puts about as many places in each class", () => {
    const values = Array.from({ length: 70 }, (_, i) => i);
    const breaks = quantileBreaks(values, 7);
    expect(breaks).toEqual([10, 20, 30, 40, 50, 60]);
    const counts = Array.from({ length: 7 }, () => 0);
    for (const v of values) {
      counts[classOf(v, breaks)]! += 1;
    }
    expect(counts).toEqual([10, 10, 10, 10, 10, 10, 10]);
  });

  it("gives fewer classes when values repeat, and none for one value", () => {
    expect(quantileBreaks([5, 5, 5, 5, 9, 9], 7)).toEqual([9]);
    expect(quantileBreaks([3, 3, 3], 7)).toEqual([]);
    expect(quantileBreaks([], 7)).toEqual([]);
    expect(classOf(3, [])).toBe(0);
  });

  it("classes the lowest value first and the highest last", () => {
    const breaks = quantileBreaks([100, 200, 300, 400], 4);
    expect(classOf(100, breaks)).toBe(0);
    expect(classOf(400, breaks)).toBe(breaks.length);
  });
});

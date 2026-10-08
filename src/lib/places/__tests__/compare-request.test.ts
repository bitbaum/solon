import { describe, expect, it } from "vitest";
import { comparedDay, comparedPaths } from "../compare-request";

describe("comparedPaths", () => {
  it("takes one path or many, trimmed, without blanks or repeats, in order", () => {
    expect(comparedPaths(" switzerland/zurich ", 4)).toEqual(["switzerland/zurich"]);
    expect(comparedPaths(["a", " ", "b", "a", "c"], 4)).toEqual(["a", "b", "c"]);
  });

  it("stops at the compare limit", () => {
    expect(comparedPaths(["a", "b", "c", "d", "e"], 3)).toEqual(["a", "b", "c"]);
  });

  it("asks for nothing when given nothing", () => {
    expect(comparedPaths(undefined, 4)).toEqual([]);
    expect(comparedPaths(null, 4)).toEqual([]);
    expect(comparedPaths([], 4)).toEqual([]);
  });
});

describe("comparedDay", () => {
  it("defaults to today and accepts an ISO date", () => {
    expect(comparedDay(null, "2026-10-08")).toBe("2026-10-08");
    expect(comparedDay("2025-01-01", "2026-10-08")).toBe("2025-01-01");
  });

  it("refuses anything that is not one", () => {
    expect(comparedDay("yesterday", "2026-10-08")).toBeNull();
    expect(comparedDay("2026-1-1", "2026-10-08")).toBeNull();
  });
});

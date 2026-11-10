import { describe, expect, it } from "vitest";
import { globeActs } from "../globe";

const communes = Array.from({ length: 11 }, (_, i) => `li${7001 + i}`);

describe("what the globe says a country holds", () => {
  const held = new Map<string, number>([
    ["li", 3412],
    ...communes.map((key, i) => [key, i === 0 ? 37 : 30] as const),
    ["ch", 100],
    ["zg", 50],
  ]);

  it("counts a country's own law apart from what lies below it", () => {
    const { own, below, acts } = globeActs(held, "li");
    expect(own).toBe(3412);
    expect(below).toBe(37 + 10 * 30);
    expect(acts).toBe(own + below);
  });

  it("does not take Liechtenstein's communes into Switzerland's count", () => {
    expect(globeActs(held, "ch")).toEqual({ acts: 150, own: 100, below: 50 });
  });

  it("counts a state or a canton only by its own acts", () => {
    expect(globeActs(held, "zg")).toEqual({ acts: 50, own: 50, below: 0 });
  });

  it("holds nothing for a place nothing is held for", () => {
    expect(globeActs(new Map(), "li")).toEqual({ acts: 0, own: 0, below: 0 });
  });
});

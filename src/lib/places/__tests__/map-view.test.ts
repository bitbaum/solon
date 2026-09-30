import { describe, expect, it } from "vitest";
import {
  areaBounds,
  areaHolds,
  classColour,
  classOf,
  findPlaces,
  quantileBreaks,
  type AreaGeometry,
  type MapPlace,
} from "../map-view";

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

describe("classColour", () => {
  const scale = ["c1", "c2", "c3", "c4", "c5", "c6", "c7"];

  it("spreads fewer classes over the whole scale, lowest to highest", () => {
    expect([0, 1, 2].map((k) => classColour(k, 3, scale))).toEqual(["c1", "c4", "c7"]);
    expect(classColour(6, 7, scale)).toBe("c7");
  });

  it("draws a single class in the highest colour", () => {
    expect(classColour(0, 1, scale)).toBe("c7");
  });
});

describe("findPlaces", () => {
  const place = (name: string): MapPlace => ({
    feature: name,
    slugPath: name.toLowerCase(),
    name,
    parentName: null,
    groups: [],
  });
  const places = ["Zürich", "Winterthur", "Oberrieden", "Rüschlikon", "Zug"].map(place);

  it("folds accents and case, and puts names that start with the text first", () => {
    expect(findPlaces(places, "zu", 5).map((p) => p.name)).toEqual(["Zürich", "Zug"]);
    expect(findPlaces(places, "RIED", 5).map((p) => p.name)).toEqual(["Oberrieden"]);
    expect(findPlaces(places, "ru", 5).map((p) => p.name)).toEqual(["Rüschlikon"]);
  });

  it("waits for two letters and keeps to the limit", () => {
    expect(findPlaces(places, "z", 5)).toEqual([]);
    expect(findPlaces(places, "  ", 5)).toEqual([]);
    expect(findPlaces(places, "r", 5)).toEqual([]);
    expect(findPlaces(places, "er", 1)).toHaveLength(1);
  });
});

describe("areaHolds and areaBounds", () => {
  const square = (x: number, y: number, size: number) => [
    [x, y],
    [x + size, y],
    [x + size, y + size],
    [x, y + size],
    [x, y],
  ];
  // A 10×10 square with a 2×2 hole, and a separate island to the east.
  const area: AreaGeometry = {
    type: "MultiPolygon",
    coordinates: [[square(0, 0, 10), square(4, 4, 2)], [square(20, 0, 2)]],
  };

  it("holds a position inside an outer ring and outside every hole", () => {
    expect(areaHolds(area, [1, 1])).toBe(true);
    expect(areaHolds(area, [5, 5])).toBe(false);
    expect(areaHolds(area, [21, 1])).toBe(true);
    expect(areaHolds(area, [15, 5])).toBe(false);
  });

  it("works on a single polygon", () => {
    const polygon: AreaGeometry = { type: "Polygon", coordinates: [square(0, 0, 1)] };
    expect(areaHolds(polygon, [0.5, 0.5])).toBe(true);
    expect(areaHolds(polygon, [1.5, 0.5])).toBe(false);
  });

  it("bounds every polygon's outer ring", () => {
    expect(areaBounds(area)).toEqual([0, 0, 22, 10]);
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { evaluate, typoCases, words } from "@bitbaum/searchkit";
import { describe, expect, it } from "vitest";
import {
  areaBounds,
  areaHolds,
  classColour,
  classOf,
  placeFinder,
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

describe("placeFinder", () => {
  const place = (name: string): MapPlace => ({
    feature: name,
    slugPath: name.toLowerCase(),
    name,
    parentName: null,
    groups: [],
  });
  const names = (found: { place: MapPlace }[]) => found.map((f) => f.place.name);
  const find = placeFinder(
    ["Zürich", "Winterthur", "Oberrieden", "Rüschlikon", "Zug", "St. Gallen", "Genève"].map(place),
  );

  it("folds accents and case, and finds a name from its first letters", () => {
    expect(names(find("zu", 5)).sort()).toEqual(["Zug", "Zürich"]);
    expect(names(find("RUSCH", 5))).toEqual(["Rüschlikon"]);
    expect(names(find("geneve", 5))).toEqual(["Genève"]);
  });

  it("reads an umlaut spelled out as the umlaut", () => {
    expect(names(find("Zuerich", 5))).toEqual(["Zürich"]);
    expect(names(find("rueschlikon", 5))).toEqual(["Rüschlikon"]);
  });

  it("still finds a name with one slip in it", () => {
    expect(names(find("zurihc", 5))[0]).toBe("Zürich");
    expect(names(find("winterhur", 5))[0]).toBe("Winterthur");
    expect(names(find("oberiedn", 5))[0]).toBe("Oberrieden");
    expect(names(find("geneev", 5))[0]).toBe("Genève");
  });

  it("finds St. Gallen however the saint is written", () => {
    for (const typed of ["st gallen", "St. Gallen", "sankt gallen", "gallen"]) {
      expect(names(find(typed, 5))[0], typed).toBe("St. Gallen");
    }
  });

  it("marks where the typed words landed, for the list to show", () => {
    expect(find("zur", 5)[0]?.ranges).toEqual([{ start: 0, end: 3 }]);
  });

  it("waits for two letters and keeps to the limit", () => {
    expect(find("z", 5)).toEqual([]);
    expect(find("  ", 5)).toEqual([]);
    expect(find("r", 5)).toEqual([]);
    expect(find("zu", 1)).toHaveLength(1);
  });

  it("finds every real place name in the fixtures after any one slip", async () => {
    // The communes, districts and cantons of the Swiss fixtures, and the city
    // quarters: the names a reader of the map actually types.
    const fixtures = join(__dirname, "fixtures", "switzerland");
    const csvNames = ["communes-2021-01-01.csv", "communes-2026-09-29.csv"].flatMap((file) =>
      readFileSync(join(fixtures, file), "utf8")
        .trim()
        .split("\n")
        .slice(1)
        .map((line) => line.split(",")[6]!),
    );
    const quarters = (
      JSON.parse(readFileSync(join(fixtures, "statistical-quarters.json"), "utf8")) as {
        features: { properties: { qname: string } }[];
      }
    ).features.map((f) => f.properties.qname);
    const all = [...new Set([...csvNames, ...quarters, "St. Gallen", "Genève", "Neuchâtel"])];
    const finder = placeFinder(all.map(place));
    const cases = typoCases(
      all.map((name) => ({ id: name, name })),
      { fold: words },
    );
    const report = await evaluate(cases, (q) => names(finder(q, 6)));
    expect(cases.length).toBeGreaterThan(1000);
    expect(report.misses).toEqual([]);
    expect(report.successAt1).toBe(1);
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

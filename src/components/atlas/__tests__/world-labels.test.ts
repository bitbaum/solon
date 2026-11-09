import { describe, expect, it } from "vitest";
import {
  countriesNear,
  townLabels,
  townLevel,
  worldLabels,
  zoomOfLevel,
  type WorldIndex,
  type WorldLabels,
} from "../world-labels";

const index: WorldIndex = {
  countries: {
    CH: { file: "admin1/CH.json", bounds: [6, 45.82, 10.5, 47.8], count: 26 },
    LI: { file: "admin1/LI.json", bounds: [9.47, 47.05, 9.64, 47.27], count: 11 },
    RU: { file: "admin1/RU.json", bounds: [19.6, 41.19, -169, 81.86], count: 83 },
    FJ: { file: "admin1/FJ.json", bounds: [174.6, -21.71, -178.2, -12.48], count: 5 },
  },
};

describe("zoom levels", () => {
  it("turns a web-map level into the globe's zoom: double per level, the whole world at about 1", () => {
    expect(zoomOfLevel(1, 280) / zoomOfLevel(0, 280)).toBeCloseTo(2);
    expect(zoomOfLevel(2.8, 280)).toBeGreaterThan(0.8);
    expect(zoomOfLevel(2.8, 280)).toBeLessThan(1.2);
  });

  it("names a city of a million before a town of ten thousand, and a seat earlier than its size", () => {
    expect(townLevel(1_000_000, 0)).toBe(3);
    expect(townLevel(10_000, 0)).toBeGreaterThan(townLevel(100_000, 0));
    expect(townLevel(10_000, 1)).toBeLessThan(townLevel(10_000, 0));
    expect(townLevel(10, 0)).toBeLessThanOrEqual(11);
  });
});

describe("which countries' files a view needs", () => {
  it("finds the countries around Switzerland, nearest first", () => {
    expect(countriesNear(index, [8.2, 46.8], 2)).toEqual(["CH", "LI"]);
  });

  it("does not load Russia or Fiji for Switzerland, though their boxes cross the antimeridian", () => {
    expect(countriesNear(index, [8.2, 46.8], 5)).not.toContain("RU");
    expect(countriesNear(index, [8.2, 46.8], 5)).not.toContain("FJ");
  });

  it("finds Russia from its far east, and Fiji from either side of 180°", () => {
    expect(countriesNear(index, [160, 60], 5)).toContain("RU");
    expect(countriesNear(index, [179.5, -17], 2)).toContain("FJ");
    expect(countriesNear(index, [-179.5, -17], 2)).toContain("FJ");
  });
});

describe("labels", () => {
  const data: WorldLabels = {
    countries: [{ a2: "CH", n3: "756", at: [8.2, 46.8], rank: 4, z: 3, name: "Switzerland" }],
    regions: [
      {
        a2: "CH",
        code: "CH-BE",
        at: [7.6, 46.8],
        rank: 2,
        z: 6,
        name: "Bern",
        names: { fr: "Berne" },
        type: "Canton",
      },
    ],
    towns: [{ at: [7.45, 46.95], name: "Bern", a2: "CH", rank: 1, z: 4, pop: 120_000, capital: 2 }],
  };

  it("names countries in the reader's language and regions where Natural Earth has it", () => {
    const fr = worldLabels(data, "fr", 280);
    expect(fr.find((l) => l.id === "c:CH")?.text).toBe("Suisse");
    expect(fr.find((l) => l.id === "r:CH-BE")?.text).toBe("Berne");
    expect(worldLabels(data, "en", 280).find((l) => l.id === "r:CH-BE")?.text).toBe("Bern");
  });

  it("drops a country's regions when its own places are drawn, and the world's towns when its own are loaded", () => {
    const labels = worldLabels(data, "en", 280, new Set(["CH"]), new Set(["CH"]));
    expect(labels.map((l) => l.id)).toEqual(["c:CH"]);
  });

  it("ranks a town over a region named after it, and a capital over both", () => {
    const [bern, koeniz] = townLabels(
      "CH",
      [
        [7.45, 46.95, "Bern", 134_000, 2],
        [7.41, 46.92, "Köniz", 42_000, 0],
      ],
      280,
    );
    const region = worldLabels(data, "en", 280).find((l) => l.id === "r:CH-BE")!;
    expect(bern!.rank!).toBeLessThan(koeniz!.rank!);
    expect(koeniz!.rank!).toBeLessThan(region.rank!);
    expect(bern!.dot).toBe(true);
  });
});

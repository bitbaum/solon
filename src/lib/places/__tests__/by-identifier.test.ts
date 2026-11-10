import { describe, expect, it } from "vitest";
import { placesConfig } from "@/lib/config/places";
import { WORLD } from "@/lib/config/world";
import { checkIdentifier, pickHolder } from "../by-identifier";

describe("checkIdentifier", () => {
  it("accepts a registered scheme with a value that fits it in full", () => {
    expect(checkIdentifier(placesConfig, "iso_3166_1", "LI")).toEqual({
      scheme: "iso_3166_1",
      value: "LI",
    });
  });

  it("refuses an unknown scheme, a value that only partly fits, and an empty or huge one", () => {
    expect(checkIdentifier(placesConfig, "nope", "LI")).toBeNull();
    expect(checkIdentifier(placesConfig, "iso_3166_1", "LIE")).toBeNull();
    expect(checkIdentifier(placesConfig, "iso_3166_1", "xLI")).toBeNull();
    expect(checkIdentifier(placesConfig, "iso_3166_1", "")).toBeNull();
    expect(checkIdentifier(placesConfig, "iso_3166_1", "L".repeat(101))).toBeNull();
  });
});

describe("pickHolder", () => {
  const old = { slugPath: "p/old", validFrom: null, validTo: "2020-01-01" };
  const now = { slugPath: "p/new", validFrom: "2020-01-01", validTo: null };

  it("takes the place that carries the code on the day", () => {
    expect(pickHolder([old, now], "2026-11-10")?.slugPath).toBe("p/new");
    expect(pickHolder([old, now], "2019-06-01")?.slugPath).toBe("p/old");
  });

  it("falls back to the last holder when none carries it on the day", () => {
    expect(pickHolder([old], "2026-11-10")?.slugPath).toBe("p/old");
  });

  it("finds nothing when nobody ever held it", () => {
    expect(pickHolder([], "2026-11-10")).toBeNull();
  });
});

/**
 * `/places/by/…`, `/places/world`, `/places/coverage` and `/places/tax` are
 * fixed segments, and `/api/v1/places/atlas` and `/map` likewise: a place whose
 * first path segment is one of them could never be reached.
 */
const RESERVED = ["by", "world", "coverage", "tax", "atlas", "map", "compare", "geography"];

describe("reserved path segments", () => {
  it("no pack key or country slug is one", () => {
    const first = [...placesConfig.packs.map((p) => p.key), ...WORLD.map((w) => w.slug)];
    expect(first.filter((segment) => RESERVED.includes(segment))).toEqual([]);
  });
});

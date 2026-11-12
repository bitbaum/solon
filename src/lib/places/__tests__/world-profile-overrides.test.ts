import { describe, expect, it } from "vitest";
import { FACT_OVERRIDES, overrideProblem, type FactOverride } from "@/lib/config/world/overrides";
import { WORLD } from "@/lib/config/world";
import type { Database } from "@/lib/db/client";
import { readFileSync } from "node:fs";
import { WORLD_PROFILES_FILE } from "@/lib/config/world/kinds";
import { applyOverrides, loadWorldProfile } from "../world-profile";

const made = [
  {
    place: "northland",
    fact: "languages" as const,
    value: ["xx"],
    source: { title: "Constitution, Art. 1", url: "https://example.org/c" },
  },
];

describe("a cited override beats Wikidata for its place and fact only", () => {
  it("replaces the codes and carries the citation", () => {
    expect(applyOverrides("northland", "languages", ["aa", "bb"], made)).toEqual({
      value: ["xx"],
      source: made[0]!.source,
    });
  });

  it("leaves another place, or another fact, with Wikidata's", () => {
    expect(applyOverrides("elsewhere", "languages", ["aa"], made)).toEqual({ value: ["aa"] });
    expect(applyOverrides("northland", "currencies", ["CHF"], made)).toEqual({ value: ["CHF"] });
  });

  it("the table names real places, once each per fact, each well formed and cited", () => {
    const slugs = new Set(
      Object.keys(
        (JSON.parse(readFileSync(WORLD_PROFILES_FILE, "utf8")) as { places: object }).places,
      ),
    );
    const seen = new Set<string>();
    for (const o of FACT_OVERRIDES) {
      const key = `${o.place}/${o.fact}`;
      expect(seen.has(key), key).toBe(false);
      seen.add(key);
      expect(slugs.has(o.place), o.place).toBe(true);
      expect(overrideProblem(o), key).toBeNull();
    }
  });

  it("South Ossetia's languages are the constitution's two, not Wikidata's", () => {
    expect(applyOverrides("south-ossetia", "languages", ["ka", "ru"]).value).toEqual(["os", "ru"]);
  });
});

const cite = { title: "Official table, row 3", url: "https://example.org/t" };
describe("every fact the card shows from Wikidata can be overridden, for any place", () => {
  const region = WORLD.find((r) => r.slug === "afghanistan")!;
  /** No database is reached for a place whose constitution Solon does not hold; this answers none. */
  const db = { execute: async () => ({ rows: [] }) } as unknown as Database;
  const load = (overrides: readonly FactOverride[]) =>
    loadWorldProfile(
      db,
      region,
      "en",
      () => undefined,
      (r) => r.slug,
      overrides,
    );

  it("replaces the value and prints the citation beside it, leaving the rest Wikidata's", async () => {
    const plain = (await load([]))!;
    const overrides: FactOverride[] = [
      { place: "afghanistan", fact: "capital", value: [{ en: "Testville" }], source: cite },
      { place: "afghanistan", fact: "headOfState", value: [{ en: "A. Person" }], source: cite },
      {
        place: "afghanistan",
        fact: "population",
        value: { value: 1234567, year: 2025 },
        source: cite,
      },
      { place: "afghanistan", fact: "areaKm2", value: 1000, source: cite },
      { place: "afghanistan", fact: "website", value: "https://www.example.gov", source: cite },
    ];
    const cited = (await load(overrides))!;
    const fact = (view: typeof cited, key: string) => view.facts.find((f) => f.key === key);
    expect(fact(cited, "capital")).toMatchObject({ value: "Testville", source: cite });
    expect(fact(cited, "headOfState")).toMatchObject({ value: "A. Person", source: cite });
    expect(fact(cited, "population")).toMatchObject({ value: "1,234,567 (2025)", source: cite });
    expect(fact(cited, "area")).toMatchObject({ value: "1,000 km²", source: cite });
    expect(fact(cited, "website")).toMatchObject({
      value: "example.gov",
      href: "https://www.example.gov",
      source: cite,
    });
    // What no override names stays exactly as Wikidata has it, with no citation.
    for (const key of ["government", "languages", "currency"]) {
      expect(fact(cited, key), key).toEqual(fact(plain, key));
      expect(fact(cited, key)?.source, key).toBeUndefined();
    }
    for (const key of ["capital", "headOfState", "population", "area", "website"])
      expect(fact(plain, key)?.source, key).toBeUndefined();
  });

  it("says a fact Wikidata has none of, when a source does", async () => {
    const view = (await load([
      {
        place: "afghanistan",
        fact: "headOfGovernment",
        value: [{ en: "B. Person" }],
        source: cite,
      },
    ]))!;
    expect(view.facts.find((f) => f.key === "headOfGovernment")).toMatchObject({
      value: "B. Person",
      source: cite,
    });
  });

  it("refuses a malformed value for its fact", () => {
    const bad = (o: FactOverride) => overrideProblem(o);
    expect(bad({ place: "x", fact: "languages", value: ["Ossetian"], source: cite })).toMatch(
      /BCP 47/,
    );
    expect(bad({ place: "x", fact: "currencies", value: ["rub"], source: cite })).toMatch(/4217/);
    expect(bad({ place: "x", fact: "capital", value: [], source: cite })).toMatch(/English/);
    expect(
      bad({ place: "x", fact: "population", value: { value: -1, year: 2020 }, source: cite }),
    ).toMatch(/positive/);
    expect(bad({ place: "x", fact: "areaKm2", value: 0, source: cite })).toMatch(/positive/);
    expect(bad({ place: "x", fact: "inception", value: "1990", source: cite })).toMatch(/YYYY/);
    expect(bad({ place: "x", fact: "website", value: "http://a.b", source: cite })).toMatch(
      /https/,
    );
    expect(
      bad({
        place: "x",
        fact: "capital",
        value: [{ en: "Y" }],
        source: { title: "t", url: "http://a" },
      }),
    ).toMatch(/https/);
    expect(bad({ place: "x", fact: "capital", value: [{ en: "Y" }], source: cite })).toBeNull();
  });
});

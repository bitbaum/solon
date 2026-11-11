import { describe, expect, it } from "vitest";
import { FACT_OVERRIDES } from "@/lib/config/world/overrides";
import { readFileSync } from "node:fs";
import { WORLD_PROFILES_FILE } from "@/lib/config/world/kinds";
import { applyOverrides } from "../world-profile";

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

  it("the table names real places, once each per fact, each with an https citation", () => {
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
      expect(o.source.url).toMatch(/^https:\/\//);
      expect(o.value.length).toBeGreaterThan(0);
    }
  });

  it("South Ossetia's languages are the constitution's two, not Wikidata's", () => {
    expect(applyOverrides("south-ossetia", "languages", ["ka", "ru"]).value).toEqual(["os", "ru"]);
  });
});

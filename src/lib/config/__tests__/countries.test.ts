import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LAW_AUTHORITIES } from "@/lib/config/law";
import { placesConfig } from "@/lib/config/places";
import { STATISTIC_RECORDS } from "@/lib/config/statistics/records";
import { alpha3Of, COUNTRIES, countryOf, numericOf } from "@/lib/config/world/countries";

/** Every country code Solon names anywhere in its configuration. */
function namedCountries(): Map<string, string> {
  const named = new Map<string, string>();
  for (const a of LAW_AUTHORITIES)
    if (a.place?.scheme === "iso_3166_1") named.set(a.place.value, `law authority ${a.key}`);
  for (const p of placesConfig.packs) if (p.region) named.set(p.region, `pack ${p.key}`);
  for (const s of placesConfig.sources) {
    // A source whose place is read from a column (a table of one country's figures) states no value here.
    const place = (s.options as { place?: { scheme: string; value?: string } } | undefined)?.place;
    if (place?.scheme === "iso_3166_1" && place.value) named.set(place.value, `source ${s.key}`);
  }
  for (const r of STATISTIC_RECORDS) {
    const place = (r.body as { place?: { scheme: string; value: string } }).place;
    if (place?.scheme === "iso_3166_1") named.set(place.value, `record ${r.key}`);
  }
  return named;
}

describe("the country registry", () => {
  it("holds every country the law, the places, the sources and the statistics name", () => {
    const missing = [...namedCountries()].filter(([a2]) => !countryOf(a2));
    expect(missing).toEqual([]);
  });

  it("draws every one of them: its numeric code is a shape in the world outlines", () => {
    const world = JSON.parse(
      readFileSync("node_modules/world-atlas/countries-50m.json", "utf8"),
    ) as {
      objects: { countries: { geometries: { id?: string }[] } };
    };
    const ids = new Set(world.objects.countries.geometries.map((g) => g.id));
    // Too small for the 1:50m outlines (Gibraltar, Tuvalu, the US minor outlying islands) or
    // without an ISO numeric code (Kosovo): named in the lists, found on the globe by label only.
    const KNOWN_UNDRAWN = ["GI", "TV", "UM", "XK"];
    const undrawn = [...namedCountries().keys()]
      .filter((a2) => !ids.has(numericOf(a2) ?? ""))
      .filter((a2) => !KNOWN_UNDRAWN.includes(a2));
    expect(undrawn).toEqual([]);
  });

  it("gives each country one set of codes, and knows the usual ones", () => {
    expect(COUNTRIES.length).toBeGreaterThan(200);
    expect(alpha3Of("CH")).toBe("CHE");
    expect(numericOf("US")).toBe("840");
    expect(countryOf("fr")?.name).toBe("France");
    expect(numericOf("XK")).toBeNull();
    expect(() => alpha3Of("ZZ")).toThrow(/no alpha-3 code for ZZ/);
  });
});

describe("the world pack", () => {
  it("holds every registry country no other pack holds, with its series sources, and nothing twice", () => {
    const world = placesConfig.packs.find((p) => p.key === "world")!;
    const held = new Set(
      placesConfig.packs.filter((p) => p.key !== "world" && p.region).map((p) => p.region!),
    );
    const sourceKeys = new Set(world.sources);
    expect(sourceKeys.size).toBe(world.sources.length);
    // One World Bank source reads every such country at once, and no country a pack holds.
    expect(sourceKeys.has("worldbank-wdi-world")).toBe(true);
    const source = placesConfig.sources.find((s) => s.key === "worldbank-wdi-world")!;
    const read = (source.options as { countries: { code: string }[] }).countries.map((c) => c.code);
    expect(read.sort()).toEqual(
      COUNTRIES.filter((c) => !held.has(c.a2))
        .map((c) => c.a2)
        .sort(),
    );
  });

  it("spreads the OECD's sources so none starts within two minutes of another", () => {
    const cadences = placesConfig.sources
      .filter((s) => s.key.startsWith("oecd-tax-") && s.packs.includes("world"))
      .map((s) => s.cadence.split(" "))
      .map(([min, hour]) => Number(hour) * 60 + Number(min));
    expect(cadences.length).toBeGreaterThan(30);
    const sorted = [...cadences].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++)
      expect(sorted[i]! - sorted[i - 1]!).toBeGreaterThanOrEqual(2);
  });
});

describe("the world pack's data", () => {
  it("has one root, the Earth, every country part of it, and a country once", () => {
    const data = JSON.parse(readFileSync("data/places/world/countries.json", "utf8")) as {
      jurisdictions: { ref: { scheme: string; value: string }; levelKey: string }[];
      relations: { from: { value: string }; to: { value: string }; relation: string }[];
    };
    const roots = data.jurisdictions.filter((j) => j.levelKey === "world");
    expect(roots.map((r) => r.ref)).toEqual([{ scheme: "world_root", value: "earth" }]);
    const nations = data.jurisdictions
      .filter((j) => j.levelKey === "nation")
      .map((j) => j.ref.value);
    expect(new Set(nations).size).toBe(nations.length);
    expect(data.relations.map((r) => r.from.value).sort()).toEqual([...nations].sort());
    expect(data.relations.every((r) => r.to.value === "earth" && r.relation === "part_of")).toBe(
      true,
    );
  });
});

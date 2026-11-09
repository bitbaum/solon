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
    const place = (s.options as { place?: { scheme: string; value: string } } | undefined)?.place;
    if (place?.scheme === "iso_3166_1") named.set(place.value, `source ${s.key}`);
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
    const undrawn = [...namedCountries().keys()].filter((a2) => !ids.has(numericOf(a2) ?? ""));
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

/**
 * Writes the United States pack's places and county boundaries as import
 * batches, from US Census Bureau data (public domain, 17 U.S.C. § 105):
 *
 *   pnpm exec tsx scripts/places-us-census.ts WY [CO …]
 *
 * - the nation, every state and the District of Columbia, by state FIPS code,
 *   with each one's ISO 3166-2 code (`US-` and its USPS code), from the Census
 *   Bureau's state code list (`state.txt`);
 * - the counties of the states named on the command line, by five-digit
 *   county FIPS code, named as the Census Bureau's 2020 county code list
 *   names them ("Laramie County");
 * - those counties' outlines, from the Census Bureau's cartographic boundary
 *   file (2017 edition) as the `us-atlas` package redistributes it as
 *   TopoJSON (node_modules/us-atlas/counties-10m.json, WGS84).
 *
 * Adding a state's counties is running this again with its postal code: the
 * pack, its levels and its sources stay as they are.
 *
 * Output: data/places/united-states/administrative-units.json and
 * county-boundaries.json, imported by `us-census-units` and
 * `us-census-county-boundaries` (src/lib/config/places/sources.ts).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { feature, quantize } from "topojson-client";
import { topology } from "topojson-server";
import type { GeometryCollection, Objects, Topology } from "topojson-specification";
import type { ImportBatchInput } from "@/lib/places/importer/batch";

const CENSUS = "https://www2.census.gov/geo/docs/reference";
const OUT = join(process.cwd(), "data/places/united-states");
const PACK = "united_states";
/** The edition of the boundary file us-atlas 3 redistributes (its README). */
const BOUNDARY_EDITION = "2017";
/** State FIPS codes above this are the outlying areas, not states. */
const LAST_STATE = 56;

const NATION = { scheme: "iso_3166_1", value: "US" };
const state = (fips: string) => ({ scheme: "us_state_fips", value: fips });
const county = (fips: string) => ({ scheme: "us_county_fips", value: fips });

async function censusRows(path: string): Promise<Record<string, string>[]> {
  const response = await fetch(`${CENSUS}/${path}`);
  if (!response.ok) {
    throw new Error(`${path}: HTTP ${response.status}`);
  }
  const [header, ...lines] = (await response.text()).trim().split(/\r?\n/);
  const columns = header!.split("|");
  return lines.map((line) => Object.fromEntries(line.split("|").map((v, i) => [columns[i], v])));
}

async function main(): Promise<void> {
  const wanted = process.argv.slice(2).map((code) => code.toUpperCase());
  const states = (await censusRows("state.txt")).filter((r) => Number(r.STATE) <= LAST_STATE);
  const byPostal = new Map(states.map((r) => [r.STUSAB!, r]));
  for (const code of wanted) {
    if (!byPostal.has(code)) {
      throw new Error(`${code} is not a state's postal code`);
    }
  }

  // The nation's name in each language the pack is shown in, from CLDR.
  const nationNames = (["en", "de", "fr", "it"] as const).map((locale) => ({
    locale,
    name: new Intl.DisplayNames([locale], { type: "region" }).of("US")!,
    nameType: locale === "en" ? ("self" as const) : ("common" as const),
  }));

  const counties: { fips: string; name: string; state: string }[] = [];
  for (const code of wanted) {
    const row = byPostal.get(code)!;
    const path = `codes2020/cou/st${row.STATE}_${code.toLowerCase()}_cou2020.txt`;
    for (const c of await censusRows(path)) {
      counties.push({ fips: `${c.STATEFP}${c.COUNTYFP}`, name: c.COUNTYNAME!, state: c.STATEFP! });
    }
  }

  const units: ImportBatchInput = {
    pack: PACK,
    jurisdictions: [
      { ref: NATION, levelKey: "nation", names: nationNames },
      ...states.map((r) => ({
        ref: state(r.STATE!),
        levelKey: "state",
        identifiers: [{ scheme: "iso_3166_2", value: `US-${r.STUSAB}` }],
        names: [{ locale: "en", name: r.STATE_NAME!, nameType: "self" as const }],
      })),
      ...counties.map((c) => ({
        ref: county(c.fips),
        levelKey: "county",
        names: [{ locale: "en", name: c.name, nameType: "self" as const }],
      })),
    ],
    relations: [
      ...states.map((r) => ({ from: state(r.STATE!), to: NATION, relation: "part_of" as const })),
      ...counties.map((c) => ({
        from: county(c.fips),
        to: state(c.state),
        relation: "part_of" as const,
      })),
    ],
  };

  const atlas = JSON.parse(
    readFileSync(join(process.cwd(), "node_modules/us-atlas/counties-10m.json"), "utf8"),
  ) as Topology<{ counties: GeometryCollection<{ name: string }> }>;
  const all = feature(atlas, atlas.objects.counties) as FeatureCollection<Polygon | MultiPolygon>;
  const codes = new Set(counties.map((c) => c.fips));
  const drawn: FeatureCollection<Polygon | MultiPolygon, {}> = {
    type: "FeatureCollection",
    features: all.features
      .filter((f) => codes.has(String(f.id)))
      .map((f) => ({ type: "Feature", id: String(f.id), properties: {}, geometry: f.geometry })),
  };
  const missing = [...codes].filter((code) => !drawn.features.some((f) => f.id === code));
  if (missing.length > 0) {
    throw new Error(`no outline in us-atlas for ${missing.join(", ")}`);
  }
  const boundaries: ImportBatchInput = {
    pack: PACK,
    jurisdictions: [],
    areas: drawn.features.map((f) => ({ place: county(String(f.id)), feature: String(f.id) })),
    geometry: {
      levelKey: "county",
      datasetVersion: BOUNDARY_EDITION,
      topology: JSON.stringify(quantize(topology({ county: drawn }) as Topology<Objects<{}>>, 1e5)),
    },
  };

  writeFileSync(join(OUT, "administrative-units.json"), `${JSON.stringify(units, null, 2)}\n`);
  writeFileSync(join(OUT, "county-boundaries.json"), `${JSON.stringify(boundaries, null, 2)}\n`);
  console.log(
    `${states.length} states and districts, ${counties.length} counties (${wanted.join(", ")}), ${drawn.features.length} outlines`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

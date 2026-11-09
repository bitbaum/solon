/**
 * The world under the atlas, beyond countries: every first-level subdivision
 * (states, provinces, cantons, counties) and the world's towns and cities,
 * from Natural Earth 1:10m, version 5.1.2 (public domain: "No permission is
 * needed to use Natural Earth"). Downloads the three files at a pinned tag,
 * checks each against its SHA-256, and writes to public/geography/world/:
 *
 *   labels.json        country, subdivision and town label points, with ranks and names
 *   admin1/<A2>.json   one TopoJSON per country, simplified for the screen, loaded on demand
 *   index.json         per country: its file, bounds, size and hash
 *   towns/<A2>.json    every place of 1,000 people or more, from GeoNames
 *                      (cities1000, CC BY 4.0, "GeoNames"), loaded when the
 *                      reader zooms into a country; set GEONAMES to the
 *                      downloaded cities1000.zip or .txt
 *
 *   pnpm run geography:world        rebuild (needs the network)
 *   pnpm run geography:world --check   rebuild in memory and fail if any file differs
 *
 * Solon's own places (communes of the countries it holds) stay in the places
 * pipeline; these are the base map for everywhere else.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { topology } from "topojson-server";
import { presimplify, simplify } from "topojson-simplify";
import type { Feature, FeatureCollection, Geometry } from "geojson";

const TAG = "v5.1.2";
const BASE = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${TAG}/geojson`;
const FILES = {
  countries: {
    name: "ne_10m_admin_0_countries.geojson",
    sha256: "239eec57ac17f100a11e2536cffc56752c318b50ae765b0918ff7aab4ce8f255",
  },
  admin1: {
    name: "ne_10m_admin_1_states_provinces.geojson",
    sha256: "22d0e3ad85eb3e27f17cabf8ba2d50e554fbc27a87796ff891d958185da62fb5",
  },
  towns: {
    name: "ne_10m_populated_places_simple.geojson",
    sha256: "fd3fa867a320cbd5c5b6bb5bc550afeec2939fb2cef688e508007282a55ac42f",
  },
} as const;
const OUT = path.join(process.cwd(), "public/geography/world");
const LOCALES = ["en", "de", "fr", "it", "ru"] as const;
/**
 * Vertices whose triangle is smaller than this many square degrees are dropped:
 * about 20 km² at mid latitudes, a few pixels when a country fills the screen.
 * One threshold for every country, so a small one keeps its detail.
 */
const MIN_AREA = 0.002;
const check = process.argv.includes("--check");

type Props = Record<string, unknown>;

async function fetchVerified(file: {
  name: string;
  sha256: string;
}): Promise<FeatureCollection<Geometry, Props>> {
  const cache = path.join(process.env.NE_CACHE ?? "/tmp/ne", file.name);
  let bytes: Buffer;
  try {
    bytes = await readFile(cache);
  } catch {
    const res = await fetch(`${BASE}/${file.name}`);
    if (!res.ok) throw new Error(`${file.name}: ${res.status}`);
    bytes = Buffer.from(await res.arrayBuffer());
    await mkdir(path.dirname(cache), { recursive: true });
    await writeFile(cache, bytes);
  }
  const sha = createHash("sha256").update(bytes).digest("hex");
  if (sha !== file.sha256) throw new Error(`${file.name}: sha256 ${sha}, expected ${file.sha256}`);
  return JSON.parse(bytes.toString("utf8")) as FeatureCollection<Geometry, Props>;
}

const str = (v: unknown) => (typeof v === "string" && v.trim() && v !== "-99" ? v.trim() : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const round = (n: number) => Math.round(n * 100) / 100;
/** A country's two-letter code: Natural Earth's ISO_A2, or its "EH" fallback for France, Norway, Kosovo and the like. */
const a2Of = (p: Props) => str(p.ISO_A2) ?? str(p.ISO_A2_EH);

function names(p: Props, keys: (l: string) => string[], fallback: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const l of LOCALES) {
    const v = keys(l)
      .map((k) => str(p[k]))
      .find(Boolean);
    if (v && v !== fallback) out[l] = v;
  }
  return out;
}

/**
 * West, south, east, north of a set of coordinates. Longitudes are taken
 * round the widest empty gap, so a country across the antimeridian (Russia,
 * Fiji, the United States with the Aleutians) gets west > east rather than a
 * box round the whole Earth.
 */
function bboxOfPoints(points: [number, number][]): [number, number, number, number] {
  if (points.length === 0) return [-180, -90, 180, 90];
  const lons = [...new Set(points.map((p) => Math.round(p[0] * 10) / 10))].sort((a, b) => a - b);
  let gap = 360 - (lons.at(-1)! - lons[0]!);
  let west = lons[0]!;
  let east = lons.at(-1)!;
  for (let i = 1; i < lons.length; i++) {
    const g = lons[i]! - lons[i - 1]!;
    if (g > gap) {
      gap = g;
      west = lons[i]!;
      east = lons[i - 1]!;
    }
  }
  let south = 90;
  let north = -90;
  for (const p of points) {
    south = Math.min(south, p[1]);
    north = Math.max(north, p[1]);
  }
  return [round(west), round(south), round(east), round(north)];
}

function bboxOf(features: Feature[]): [number, number, number, number] {
  const points: [number, number][] = [];
  const walk = (c: unknown): void => {
    if (Array.isArray(c) && typeof c[0] === "number") points.push([c[0] as number, c[1] as number]);
    else if (Array.isArray(c)) c.forEach(walk);
  };
  for (const f of features) walk((f.geometry as { coordinates?: unknown }).coordinates);
  return bboxOfPoints(points);
}

async function main() {
  const [countries, admin1, towns] = await Promise.all([
    fetchVerified(FILES.countries),
    fetchVerified(FILES.admin1),
    fetchVerified(FILES.towns),
  ]);
  const outputs = new Map<string, string>();

  // Labels. Ranks are Natural Earth's own (lower is more important); minZoom is its web zoom.
  const countryLabels = countries.features.flatMap((f) => {
    const p = f.properties;
    const a2 = a2Of(p);
    const x = num(p.LABEL_X),
      y = num(p.LABEL_Y);
    if (!a2 || x === null || y === null) return [];
    return [
      {
        a2,
        n3: str(p.ISO_N3) ?? str(p.ISO_N3_EH),
        at: [round(x), round(y)],
        rank: num(p.LABELRANK) ?? 6,
        z: num(p.MIN_LABEL) ?? 3,
        name: str(p.NAME) ?? a2,
      },
    ];
  });
  const regionLabels = admin1.features.flatMap((f) => {
    const p = f.properties;
    const a2 = str(p.iso_a2);
    const code = str(p.iso_3166_2) ?? str(p.adm1_code);
    const x = num(p.longitude),
      y = num(p.latitude);
    const name = str(p.name);
    if (!a2 || !code || x === null || y === null || !name) return [];
    return [
      {
        a2,
        code,
        at: [round(x), round(y)],
        rank: num(p.labelrank) ?? 6,
        z: num(p.min_label) ?? num(p.min_zoom) ?? 6,
        name,
        names: names(p, (l) => [`name_${l}`], name),
        type: str(p.type_en),
      },
    ];
  });
  const townLabels = towns.features.flatMap((f) => {
    const p = f.properties;
    const x = num(p.longitude),
      y = num(p.latitude);
    const name = str(p.name);
    if (x === null || y === null || !name) return [];
    const capital = num(p.adm0cap) === 1 ? 2 : /Admin-1 capital/.test(String(p.featurecla)) ? 1 : 0;
    return [
      {
        at: [round(x), round(y)],
        name,
        a2: str(p.iso_a2),
        rank: num(p.scalerank) ?? 10,
        z: num(p.min_zoom) ?? 8,
        pop: num(p.pop_max) ?? 0,
        capital,
      },
    ];
  });
  outputs.set(
    "labels.json",
    JSON.stringify({
      source: `Natural Earth 1:10m ${TAG}, public domain`,
      countries: countryLabels,
      regions: regionLabels,
      towns: townLabels.sort((a, b) => a.rank - b.rank || b.pop - a.pop),
    }),
  );

  // Subdivision shapes, one file per country.
  const byCountry = new Map<string, Feature<Geometry, Props>[]>();
  for (const f of admin1.features) {
    const a2 = str(f.properties.iso_a2);
    const code = str(f.properties.iso_3166_2) ?? str(f.properties.adm1_code);
    if (!a2 || !code || !f.geometry) continue;
    const list = byCountry.get(a2) ?? [];
    list.push({ type: "Feature", id: code, properties: {}, geometry: f.geometry });
    byCountry.set(a2, list);
  }
  const index: Record<
    string,
    {
      file: string;
      bounds: number[];
      count: number;
      bytes: number;
      sha256: string;
      towns?: { file: string; count: number; bytes: number };
    }
  > = {};
  for (const [a2, features] of [...byCountry].sort(([a], [b]) => a.localeCompare(b))) {
    const topo = simplify(
      presimplify(
        topology({ admin1: { type: "FeatureCollection", features } as never }, 1e4) as never,
      ),
      MIN_AREA,
    );
    const json = JSON.stringify(topo);
    const file = `admin1/${a2}.json`;
    outputs.set(file, json);
    index[a2] = {
      file,
      bounds: bboxOf(features),
      count: features.length,
      bytes: Buffer.byteLength(json),
      sha256: createHash("sha256").update(json).digest("hex"),
    };
  }
  // Every town of 1,000 people or more, per country (GeoNames). The file changes daily
  // upstream, so the edition is its own hash and the day it was read, kept in the index.
  const geonames = process.env.GEONAMES;
  let townsSource: { file: string; sha256: string; read: string } | null = null;
  if (geonames) {
    const raw = await readFile(geonames);
    const text = geonames.endsWith(".zip")
      ? execFileSync("unzip", ["-p", geonames, "cities1000.txt"], { maxBuffer: 1 << 30 }).toString(
          "utf8",
        )
      : raw.toString("utf8");
    townsSource = {
      file: path.basename(geonames),
      sha256: createHash("sha256").update(raw).digest("hex"),
      read: process.env.GEONAMES_READ ?? new Date().toISOString().slice(0, 10),
    };
    const perCountry = new Map<string, [number, number, string, number, number][]>();
    for (const line of text.split("\n")) {
      const c = line.split("\t");
      if (c.length < 15) continue;
      const [lat, lon, a2, pop] = [Number(c[4]), Number(c[5]), c[8]!, Number(c[14])];
      if (!a2 || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      // 2: a national capital, 1: a seat of a first-level subdivision, 0: any other place.
      const seat = c[7] === "PPLC" ? 2 : c[7] === "PPLA" ? 1 : 0;
      const list = perCountry.get(a2) ?? [];
      list.push([round(lon), round(lat), c[1]!, Number.isFinite(pop) ? pop : 0, seat]);
      perCountry.set(a2, list);
    }
    for (const [a2, list] of perCountry) {
      list.sort((a, b) => b[4] - a[4] || b[3] - a[3]);
      const json = JSON.stringify(list);
      outputs.set(`towns/${a2}.json`, json);
      // A country with towns and no subdivisions in Natural Earth (a small island) is bounded by its towns.
      const entry = index[a2] ?? {
        file: "",
        bounds: bboxOfPoints(list.map((t) => [t[0], t[1]])),
        count: 0,
        bytes: 0,
        sha256: "",
      };
      Object.assign(entry, {
        towns: { file: `towns/${a2}.json`, count: list.length, bytes: Buffer.byteLength(json) },
      });
      index[a2] = entry;
    }
  }
  outputs.set(
    "index.json",
    JSON.stringify({
      source: `Natural Earth 1:10m ${TAG}, public domain`,
      towns: townsSource && { ...townsSource, source: "GeoNames cities1000, CC BY 4.0" },
      countries: index,
    }),
  );

  let differ = 0;
  let total = 0;
  for (const [file, body] of outputs) {
    total += Buffer.byteLength(body);
    const target = path.join(OUT, file);
    if (check) {
      const was = await readFile(target, "utf8").catch(() => null);
      if (was !== body) {
        differ += 1;
        console.error(`differs: ${file}`);
      }
    } else {
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, body);
    }
  }
  console.log(
    `${outputs.size} files, ${(total / 1e6).toFixed(1)} MB; ${countryLabels.length} countries, ${regionLabels.length} subdivisions, ${townLabels.length} towns`,
  );
  if (check && differ > 0) process.exit(1);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(2);
});

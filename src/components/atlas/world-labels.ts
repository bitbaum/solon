/**
 * Names and subdivisions for the whole world, from Natural Earth (public
 * domain), built by scripts/build-world-geography.ts into
 * public/geography/world/. The labels file comes once, after the globe is on
 * screen; a country's subdivisions come when the reader zooms close enough to
 * see them, a country at a time.
 */
import type { LabelStyles, MapFeature, MapLabel } from "@bitbaum/geo-kit/map";
import { feature as topologyFeatures } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import { COUNTRIES, type Country } from "@/lib/config/world/countries";

const ROOT = "/geography/world";

interface RegionLabel {
  a2: string;
  code: string;
  at: [number, number];
  rank: number;
  z: number;
  name: string;
  names: Record<string, string>;
  type: string | null;
}
interface TownLabel {
  at: [number, number];
  name: string;
  a2: string | null;
  rank: number;
  z: number;
  pop: number;
  capital: 0 | 1 | 2;
}
export interface WorldLabels {
  regions: RegionLabel[];
  towns: TownLabel[];
}
export interface WorldIndex {
  countries: Record<
    string,
    {
      file: string;
      bounds: [number, number, number, number];
      count: number;
      towns?: { file: string; count: number };
    }
  >;
}

/** A town from GeoNames: [lon, lat, name, population, seat (2 capital, 1 regional seat, 0 other)]. */
export type Town = [number, number, string, number, 0 | 1 | 2];

const townCache = new Map<string, Promise<Town[]>>();
/** Every place of 1,000 people or more in one country (GeoNames, CC BY 4.0). */
export function loadTowns(a2: string, index: WorldIndex): Promise<Town[]> {
  const entry = index.countries[a2]?.towns;
  if (!entry) return Promise.resolve([]);
  let p = townCache.get(a2);
  if (!p) {
    p = fetch(`${ROOT}/${entry.file}`).then((r) => {
      if (!r.ok) throw new Error(`${a2} towns: ${r.status}`);
      return r.json() as Promise<Town[]>;
    });
    p.catch(() => townCache.delete(a2));
    townCache.set(a2, p);
  }
  return p;
}

/** A country's towns are fetched from this level; the world file names the biggest before that. */
export const TOWNS_FROM_LEVEL = 5.5;

/**
 * The zoom level a town of this many people is named from: a million from 3,
 * then about a level for every factor of three fewer, down to a village of a
 * thousand at about 10, so a valley's villages appear as the reader reaches it.
 */
export const townLevel = (pop: number, seat: number) =>
  Math.min(11, Math.max(3, 3 + 1.9 * Math.log10(1e6 / Math.max(pop, 1000)))) - seat * 0.8;

/** One country's towns as labels; ranked by size so a city always wins over its suburbs. */
export function townLabels(a2: string, towns: readonly Town[], radius: number): MapLabel[] {
  return towns.map(([lon, lat, name, pop, seat], i) => ({
    id: `g:${a2}:${i}`,
    text: name,
    at: [lon, lat],
    rank: (seat === 2 ? 10 : 30) - Math.log10(Math.max(pop, 1)) - seat,
    kind: seat === 2 ? "capital" : "town",
    dot: true,
    minZoom: zoomOfLevel(Math.max(townLevel(pop, seat), TOWNS_FROM_LEVEL - 1), radius),
  }));
}

let labelsPromise: Promise<WorldLabels> | null = null;
export function loadWorldLabels(): Promise<WorldLabels> {
  labelsPromise ??= fetch(`${ROOT}/labels.json`).then((r) => {
    if (!r.ok) throw new Error(`labels: ${r.status}`);
    return r.json() as Promise<WorldLabels>;
  });
  return labelsPromise;
}

let indexPromise: Promise<WorldIndex> | null = null;
export function loadWorldIndex(): Promise<WorldIndex> {
  indexPromise ??= fetch(`${ROOT}/index.json`).then((r) => {
    if (!r.ok) throw new Error(`index: ${r.status}`);
    return r.json() as Promise<WorldIndex>;
  });
  return indexPromise;
}

/** A subdivision's shape id on the map. */
export const ADMIN1 = "a1:";

const admin1Cache = new Map<string, Promise<MapFeature[]>>();
/** One country's first-level subdivisions, as map features `a1:<ISO 3166-2>`. */
export function loadAdmin1(a2: string, index: WorldIndex): Promise<MapFeature[]> {
  const entry = index.countries[a2];
  if (!entry?.file) return Promise.resolve([]);
  let p = admin1Cache.get(a2);
  if (!p) {
    p = fetch(`${ROOT}/${entry.file}`)
      .then((r) => {
        if (!r.ok) throw new Error(`${a2}: ${r.status}`);
        return r.json() as Promise<Topology>;
      })
      .then((topo) => {
        const object = topo.objects.admin1 as GeometryCollection | undefined;
        if (!object) return [];
        return topologyFeatures(topo, object).features.flatMap((f) =>
          f.id !== undefined && f.geometry
            ? [{ id: `${ADMIN1}${String(f.id)}`, geometry: f.geometry, properties: {} }]
            : [],
        );
      });
    p.catch(() => admin1Cache.delete(a2));
    admin1Cache.set(a2, p);
  }
  return p;
}

/**
 * Natural Earth's zoom levels are web-map levels (the world 256 pixels wide
 * at 0, doubling each level); the atlas's zoom is a multiple of the resting
 * globe's radius. For a globe of radius R pixels at zoom k the world is
 * 2πRk pixels round, so level z is k = 256·2^z / (2πR).
 */
export const zoomOfLevel = (z: number, radius: number) => (256 * 2 ** z) / (2 * Math.PI * radius);

/** The subdivisions of a country seen at this zoom need its file; below it they are not drawn. */
export const ADMIN1_FROM_LEVEL = 3.6;

/**
 * Every label for the atlas, named in the reader's language where Natural
 * Earth or the browser knows it. Countries are the most important, then
 * capitals, subdivisions, and towns by Natural Earth's own rank, each from the
 * zoom Natural Earth shows it at.
 */
export function worldLabels(
  data: WorldLabels,
  locale: string,
  radius: number,
  hide: ReadonlySet<string> = new Set(),
  /** Countries whose own towns are loaded: the world file's towns there would be twice. */
  townsOf: ReadonlySet<string> = new Set(),
  /** The country registry; a test passes its own. */
  countries: readonly Country[] = COUNTRIES,
): MapLabel[] {
  const regionNames = new Intl.DisplayNames([locale], { type: "region" });
  const k = (z: number) => zoomOfLevel(z, radius);
  const out: MapLabel[] = [];
  for (const c of countries) {
    let text = c.name;
    try {
      text = regionNames.of(c.a2) ?? c.name;
    } catch {
      // A code the browser does not know (Natural Earth's Kosovo, Somaliland): Natural Earth's name.
    }
    out.push({
      id: `c:${c.a2}`,
      text,
      at: c.at,
      rank: c.rank,
      kind: "country",
      minZoom: k(Math.max(c.z - 0.6, 0)),
      // Close in, the country's own places name it better.
      maxZoom: k(9),
    });
  }
  for (const r of data.regions) {
    if (hide.has(r.a2)) continue;
    out.push({
      id: `r:${r.code}`,
      text: r.names[locale] ?? r.name,
      at: r.at,
      // After towns: close in, a municipality named after its town must not hide the town.
      rank: 40 + r.rank,
      kind: "region",
      minZoom: k(Math.max(r.z - 0.8, ADMIN1_FROM_LEVEL)),
      maxZoom: k(11),
    });
  }
  data.towns.forEach((t, i) => {
    if (t.a2 && townsOf.has(t.a2)) return;
    out.push({
      id: `t:${i}`,
      text: t.name,
      at: t.at,
      rank: t.capital === 2 ? 10 + t.rank : 30 + t.rank,
      kind: t.capital === 2 ? "capital" : "town",
      dot: true,
      minZoom: k(Math.max(t.z - (t.capital === 2 ? 1.5 : 0.8), 1.5)),
    });
  });
  return out;
}

/** The label styles, from the page's own type and colours. */
export function labelStyles(colours: {
  text: string;
  muted: string;
  halo: string;
  dot: string;
  font: string;
}): LabelStyles {
  const { text, muted, halo, dot, font } = colours;
  return {
    default: { font: `500 11px ${font}`, colour: text, halo, haloWidth: 3 },
    country: {
      font: `600 11px ${font}`,
      colour: text,
      halo,
      haloWidth: 3.5,
      uppercase: true,
      tracking: 1.2,
    },
    region: { font: `italic 500 11px ${font}`, colour: muted, halo, haloWidth: 3 },
    capital: { font: `600 12px ${font}`, colour: text, halo, haloWidth: 3, dot, dotRadius: 3.5 },
    town: { font: `500 11px ${font}`, colour: text, halo, haloWidth: 3, dot, dotRadius: 2.5 },
  };
}

/** The countries whose bounds meet a box around the centre, nearest first. */
export function countriesNear(
  index: WorldIndex,
  center: [number, number],
  reach: number,
  most = 8,
): string[] {
  const [lon, lat] = center;
  const dLon = Math.min(180, reach / Math.max(Math.cos((lat * Math.PI) / 180), 0.2));
  const box = [lon - dLon, lat - reach, lon + dLon, lat + reach];
  // A box across the antimeridian has west > east: unwrap it east.
  const unwrap = (b: [number, number, number, number]) =>
    b[0] > b[2] ? ([b[0], b[1], b[2] + 360, b[3]] as const) : b;
  const meets = (raw: [number, number, number, number]) => {
    const b = unwrap(raw);
    if (b[1] > box[3]! || b[3] < box[1]!) return false;
    const shifts = [-360, 0, 360];
    return shifts.some((s) => b[0] + s <= box[2]! && b[2] + s >= box[0]!);
  };
  const dist = (raw: [number, number, number, number]) => {
    const b = unwrap(raw);
    const cx = (b[0] + b[2]) / 2;
    const cy = (b[1] + b[3]) / 2;
    const dx = Math.min(Math.abs(cx - lon), 360 - Math.abs(cx - lon));
    return Math.hypot(dx, cy - lat);
  };
  return Object.entries(index.countries)
    .filter(([, c]) => meets(c.bounds))
    .sort(([, a], [, b]) => dist(a.bounds) - dist(b.bounds))
    .slice(0, most)
    .map(([a2]) => a2);
}

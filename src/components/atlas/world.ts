/**
 * The world under the atlas: every country's outline (Natural Earth, through
 * `world-atlas`) and the US states Solon holds law for (the Census Bureau's,
 * through `us-atlas`), both public domain. Loaded only once the atlas is on
 * screen, so a page without it never pays for them.
 */
import type { Feature, Geometry } from "geojson";
import { geoDistance, type GeoProjection } from "d3-geo";
import { fade, type MapFeature, type Palette } from "@bitbaum/geo-kit/map";
import type { MapColours } from "@/components/places/map-colours";

type Layer = { objects: Record<string, unknown> };

/** Every country, and the states listed (by FIPS code) on top of theirs. */
export async function loadWorld(stateIds: ReadonlySet<string>): Promise<MapFeature[]> {
  const [{ feature }, world, us] = await Promise.all([
    import("topojson-client"),
    import("world-atlas/countries-50m.json"),
    import("us-atlas/states-10m.json"),
  ]);
  const features = (topology: Layer, object: string) =>
    (
      feature(topology as never, topology.objects[object] as never) as unknown as {
        features: Feature<Geometry, { name?: string }>[];
      }
    ).features;
  const countries = features(world.default as Layer, "countries")
    .filter((f) => f.id !== undefined && f.geometry)
    .map((f) => ({ id: `countries:${f.id}`, geometry: f.geometry, properties: {} }));
  const states = features(us.default as Layer, "states")
    .filter((f) => stateIds.has(String(f.id)))
    .map((f) => ({ id: `states:${f.id}`, geometry: f.geometry, properties: {} }));
  return [...countries, ...states];
}

/**
 * The atlas's colours, from the design tokens the page carries, so it follows
 * the theme. The world is lit and has a sea; a country's places are drawn on
 * the same globe, so they share it.
 */
export function atlasPalette(colours: MapColours, extra: AtlasTokens): Palette {
  return {
    sphere: extra.sea,
    sphereLight: extra.seaLight,
    graticule: extra.graticule,
    land: colours.noData,
    border: colours.boundary,
    hover: fade(colours.selected, 0.6),
    selected: colours.selected,
    glow: [fade(colours.selected, 0.16), fade(colours.selected, 0)],
    limb: [fade(extra.page, 0), fade(extra.page, 0.45)],
    borderWidth: 0.5,
  };
}

export interface AtlasTokens {
  sea: string;
  seaLight: string;
  graticule: string;
  page: string;
}

/** A token as a colour: hex as it is, an HSL triplet as hsl(). */
function token(style: CSSStyleDeclaration, name: string): string {
  const value = style.getPropertyValue(name).trim();
  const triplet = /^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?%)\s+(\d+(?:\.\d+)?%)$/.exec(value);
  return triplet ? `hsl(${triplet[1]}, ${triplet[2]}, ${triplet[3]})` : value;
}

/** The surface tokens the sea and the limb are drawn in. */
export function readAtlasTokens(): AtlasTokens {
  const s = getComputedStyle(document.documentElement);
  return {
    sea: token(s, "--surface-raised"),
    seaLight: token(s, "--surface-hover"),
    graticule: token(s, "--border-subtle"),
    page: token(s, "--surface-page"),
  };
}

/** More law, a stronger shade: by order of magnitude, so ten acts show and ten thousand stand out. */
export const shadeOf = (acts: number, scale: readonly string[]) =>
  scale[Math.min(scale.length - 1, Math.max(0, Math.round(Math.log10(Math.max(acts, 1)) * 1.6)))]!;

/** Where a point stands on the canvas now, or null on the far side of the Earth. */
export function pointAt(
  point: [number, number],
  projection: GeoProjection,
): [number, number] | null {
  const [lambda, phi] = projection.rotate();
  if (geoDistance(point, [-lambda, -phi]) > Math.PI / 2 - 0.05) return null;
  return projection(point) ?? null;
}

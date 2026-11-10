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
  // Natural Earth draws a few places without an ISO code (Kosovo, Somaliland): those go by name.
  const countries = features(world.default as Layer, "countries")
    .filter((f) => f.geometry && (f.id !== undefined || f.properties?.name))
    .map((f) => ({
      id: f.id !== undefined ? `countries:${f.id}` : `countries:name:${f.properties.name}`,
      geometry: f.geometry,
      properties: {},
    }));
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
  // The sea is the map scale's deep blue, washed out over the page; the land is
  // the page's own surface, so land and sea read apart in both themes and the
  // countries Solon shades stand out on a quiet ground.
  const sea = colours.scale[1] ?? colours.boundary;
  return {
    sphere: fade(sea, extra.dark ? 0.32 : 0.16),
    sphereLight: fade(colours.scale[2] ?? sea, extra.dark ? 0.18 : 0.07),
    graticule: fade(sea, extra.dark ? 0.28 : 0.14),
    land: extra.land,
    border: fade(colours.boundary, 0.55),
    hover: fade(colours.selected, 0.75),
    hoverFill: fade(colours.selected, 0.1),
    selected: colours.selected,
    selectedFill: fade(colours.selected, 0.14),
    glow: [fade(sea, extra.dark ? 0.35 : 0.22), fade(sea, 0)],
    limb: [fade(sea, 0), fade(sea, extra.dark ? 0.35 : 0.18)],
    borderWidth: 0.6,
  };
}

export interface AtlasTokens {
  sea: string;
  seaLight: string;
  graticule: string;
  page: string;
  /** The land: the surface cards sit on. */
  land: string;
  text: string;
  muted: string;
  faint: string;
  font: string;
  dark: boolean;
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
    land: token(s, "--surface-base"),
    text: token(s, "--text-primary"),
    muted: token(s, "--text-secondary"),
    faint: token(s, "--text-tertiary"),
    font: s.getPropertyValue("--font-sans").trim() || "system-ui, sans-serif",
    dark: document.documentElement.classList.contains("dark"),
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

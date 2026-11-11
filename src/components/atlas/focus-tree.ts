/**
 * Where each place's own outline is, for geo-kit's focus rule (`createFocus`):
 * the one thing the atlas has to say, since which place is chosen, what frames
 * and what is drawn faintly round it are the package's. Pure, so the framing
 * of a commune, a county and a place with no outline can be tested.
 */
import { cameraFor, cameraForBounds, type Camera, type MapFeature } from "@bitbaum/geo-kit/map";
import type { Drawn } from "@/components/places/drawn";
import { ATLAS_LIMITS } from "./atlas-canvas";

/** A country's drawn places are drawn under this prefix, apart from the world's shapes. */
export const SUB = "sub:";
/** A place that has no outline in the world, only a dot where it is. */
export const BEYOND = "beyond:";
/** A country fills most of the map, however small (Liechtenstein stops short of one valley). */
export const COUNTRY_ZOOM = { fill: 0.85, most: 120 };

/** What the tree reads: the world's outlines, the country open and its drawn places. */
export interface FocusInputs {
  world: ReadonlyMap<string, MapFeature>;
  country: string | null;
  drawn: Drawn | null;
}

/**
 * The camera that faces a place's own outline, never a child's: a drawn place
 * by its bounds, a country by its mainland (so the United States is framed as
 * the United States although only Wyoming's counties are drawn). A place with
 * no outline (South Ossetia, a dot) has none, and the map stays where it is.
 */
export function focusCamera(t: FocusInputs, id: string): Camera | null {
  if (id.startsWith(SUB)) {
    const area = t.drawn?.areas.get(id.slice(SUB.length));
    return area ? cameraForBounds(area.bounds, ATLAS_LIMITS, 0.6) : null;
  }
  const shape = t.world.get(id);
  return shape ? cameraFor(shape.geometry, ATLAS_LIMITS, COUNTRY_ZOOM) : null;
}

/** The places drawn inside the open country; nothing is drawn inside a drawn place. */
export function focusChildren(t: FocusInputs, id: string): readonly string[] {
  if (id !== t.country || !t.drawn) return [];
  return [...t.drawn.areas.keys()].map((code) => SUB + code);
}

/** A drawn place is part of the open country; a country is part of the world. */
export function focusParent(t: FocusInputs, id: string): string | null {
  return id.startsWith(SUB) ? t.country : null;
}

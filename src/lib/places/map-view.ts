/**
 * What the map on /places draws (design §9.1), in the terms the browser needs.
 * Every place a current area is drawn for, at one level of a pack, with the
 * facts its pack's tax model reads along its chain; each estimate runs on the
 * reader's device, as on /compare, so their income never reaches Solon (§10).
 * Nothing in this file reads the database: the map component imports it.
 */
import type { Fact } from "@/lib/tax-model";
import {
  estimateColumn,
  type ColumnEstimate,
  type CompareTaxPack,
  type EstimateInput,
} from "./compare-view";
import { foldName } from "./fold";
import type { PlaceSource } from "./place-view";

export interface MapPlace {
  /** The feature that draws it in the boundary file. */
  feature: string;
  slugPath: string;
  name: string;
  /** The place it is part of, when it has one. */
  parentName: string | null;
  /** Indexes into `MapData.factGroups`: the facts each place in its chain holds. */
  groups: number[];
}

export interface MapData {
  packKey: string;
  levelKey: string;
  levelName: string;
  /** The boundary file, as the geography manifest at `manifest` lists it. */
  resource: { id: string; href: string; sha256: string; manifest: string };
  /** The day the places and their boundaries are current for. */
  on: string;
  /** The day whose figures are shown: `on`, or up to two years earlier (as /compare). */
  period: string;
  earlierYear: boolean;
  /** The pack's address search, asked from the browser; null when it has none. */
  addressSearch: { format: "geoadmin_search"; url: string; provider: string } | null;
  /** Null when the pack has no tax model: the map then draws places without colour. */
  taxPack: CompareTaxPack | null;
  /** The levels a place's chain reaches, so a missing figure can say why it is missing. */
  levels: string[];
  /** Facts shared by the places whose chains hold them (a canton's, the nation's). */
  factGroups: Fact[][];
  places: MapPlace[];
  sources: PlaceSource[];
}

/** The facts the tax model reads for one place: its chain's groups together. */
export function placeFacts(data: MapData, place: MapPlace): Fact[] {
  return place.groups.flatMap((i) => data.factGroups[i] ?? []);
}

export function estimatePlace(
  data: MapData,
  place: MapPlace,
  input: EstimateInput,
): ColumnEstimate {
  if (!data.taxPack) {
    return { kind: "no_model" };
  }
  return estimateColumn(
    { facts: placeFacts(data, place), levels: data.levels },
    data.taxPack,
    input,
  );
}

/**
 * Class breaks that put about as many places in each of `classes` classes,
 * ascending; fewer when values repeat. A place's class is the number of
 * breaks at or below its value (`classOf`).
 */
export function quantileBreaks(values: readonly number[], classes: number): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0 || classes < 2) {
    return [];
  }
  const breaks: number[] = [];
  for (let k = 1; k < classes; k++) {
    const value = sorted[Math.min(sorted.length - 1, Math.floor((k * sorted.length) / classes))]!;
    if (value > sorted[0]! && value !== breaks.at(-1)) {
      breaks.push(value);
    }
  }
  return breaks;
}

/** 0 for the lowest class, `breaks.length` for the highest. */
export function classOf(value: number, breaks: readonly number[]): number {
  let k = 0;
  while (k < breaks.length && value >= breaks[k]!) {
    k++;
  }
  return k;
}

/** Which of `colours` (lowest first) draws each of `classes` classes: spread over the whole scale. */
export function classColour(k: number, classes: number, colours: readonly string[]): string {
  const last = colours.length - 1;
  return colours[classes <= 1 ? last : Math.round((k * last) / (classes - 1))]!;
}

/** Places whose name holds the text, folded as search folds it; names starting with it first. */
export function findPlaces(places: readonly MapPlace[], text: string, limit: number): MapPlace[] {
  const query = foldName(text.trim());
  if (query.length < 2) {
    return [];
  }
  const starts: MapPlace[] = [];
  const holds: MapPlace[] = [];
  for (const place of places) {
    const name = foldName(place.name);
    if (name.startsWith(query)) {
      starts.push(place);
    } else if (name.includes(query)) {
      holds.push(place);
    }
  }
  return [...starts, ...holds].slice(0, limit);
}

type Ring = readonly (readonly number[])[];

/** A boundary as GeoJSON draws it, in WGS84. */
export type AreaGeometry =
  | { type: "Polygon"; coordinates: readonly Ring[] }
  | { type: "MultiPolygon"; coordinates: readonly (readonly Ring[])[] };

const polygonsOf = (geometry: AreaGeometry) =>
  geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;

function ringHolds(ring: Ring, x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    if (yi! > y !== yj! > y && x < ((xj! - xi!) * (y - yi!)) / (yj! - yi!) + xi!) {
      inside = !inside;
    }
  }
  return inside;
}

/** Whether a position (longitude, latitude) lies in the area: inside an outer ring and no hole. */
export function areaHolds(geometry: AreaGeometry, [x, y]: readonly [number, number]): boolean {
  return polygonsOf(geometry).some(
    ([outer, ...holes]) =>
      outer !== undefined && ringHolds(outer, x, y) && !holes.some((h) => ringHolds(h, x, y)),
  );
}

/** West, south, east, north. */
export function areaBounds(geometry: AreaGeometry): [number, number, number, number] {
  let [w, s, e, n] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const polygon of polygonsOf(geometry)) {
    for (const [x, y] of polygon[0] ?? []) {
      w = Math.min(w, x!);
      e = Math.max(e, x!);
      s = Math.min(s, y!);
      n = Math.max(n, y!);
    }
  }
  return [w, s, e, n];
}

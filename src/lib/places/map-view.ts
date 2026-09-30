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
  /** The boundary file, as the geography manifest lists it. */
  resource: { id: string; href: string; sha256: string };
  /** The day whose figures are shown: `on`, or up to two years earlier (as /compare). */
  period: string;
  earlierYear: boolean;
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

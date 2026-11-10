/**
 * What kind of place each entry of the world list is, said by what it does
 * and never by whether its claim is right (design:
 * docs/design/2026-11-world-of-jurisdictions.md):
 *
 *   state           a member of the United Nations (un.org's list)
 *   observer        a UN observer state
 *   self_governing  governs itself and is not a UN member
 *   territory       a territory of another state, or one whose status is disputed
 *   proclaimed      proclaimed as a state by its founders (the rule in ./extras.ts)
 *   special         a jurisdiction inside a state with law of its own
 *   project         a project for a new jurisdiction, at sea or on land, governing nothing yet
 */
import data from "./extras.json";
import { SELF_GOVERNING_CODES, SELF_GOVERNING_ITEMS, UN_OBSERVER_CODES } from "./extras";

export const PLACE_KINDS = [
  "state",
  "observer",
  "self_governing",
  "territory",
  "proclaimed",
  "special",
  "project",
] as const;
export type PlaceKind = (typeof PLACE_KINDS)[number];

export interface ExtraPlace {
  slug: string;
  wikidata: string;
  kind: "proclaimed" | "special" | "project";
  names: Readonly<Record<string, string>>;
  /** [longitude, latitude], to mark it by; none for a project. */
  point: [number, number] | null;
  /** The ISO code of the country it lies in, when Wikidata states one. */
  country: string | null;
}

export const UN_MEMBERS: ReadonlySet<string> = new Set(data.un);
export const EXTRA_PLACES = data.extras as readonly ExtraPlace[];
/** Points for the places that govern themselves, where the map's outlines draw none. */
export const SELF_GOVERNING_POINTS = data.points as unknown as Readonly<
  Record<string, [number, number]>
>;
/** Where `pnpm run world:profiles` writes every place's facts, read by place pages on the server. */
export const WORLD_PROFILES_FILE = "data/world/profiles.json";
/** Where `pnpm run places:photos` writes every place's photograph, read by place pages on the server. */
export const WORLD_PHOTOS_FILE = "data/world/photos.json";
/** The day the list and the extras were read. */
export const WORLD_READ = data.read;

/** The kind of a place of the world list. */
export function kindOf(place: { code?: string; slug: string; claimedBy?: string }): PlaceKind {
  const extra = EXTRA_PLACES.find((p) => p.slug === place.slug);
  if (extra) return extra.kind;
  if (place.code && UN_MEMBERS.has(place.code)) return "state";
  if (place.code && (UN_OBSERVER_CODES as readonly string[]).includes(place.code))
    return "observer";
  if (
    place.slug in SELF_GOVERNING_ITEMS ||
    (place.code && (SELF_GOVERNING_CODES as readonly string[]).includes(place.code))
  ) {
    return "self_governing";
  }
  return "territory";
}

/** Kinds that are not states of the UN: what the map's "beyond the UN" view shows. */
export const BEYOND_UN: ReadonlySet<PlaceKind> = new Set([
  "self_governing",
  "proclaimed",
  "special",
  "project",
]);

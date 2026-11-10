/**
 * Which jurisdictions carry a place's identifier (design:
 * docs/design/2026-11-place-navigation.md, "Invariants"). A law authority names
 * its place by an identifier, not by an ISO region, because not every place has
 * one: South Ossetia is known by its Wikidata item alone. So "an authority
 * resolves to exactly one jurisdiction" compares jurisdictions, found by the
 * identifier, never regions. Pure, so the same check runs on the repository's
 * data files and on a made-up case.
 */
export interface PlaceRef {
  scheme: string;
  value: string;
}

/** A jurisdiction as a batch states it: its pack, its level and every identifier it carries. */
export interface Holder {
  pack: string;
  levelKey: string;
  refs: readonly PlaceRef[];
}

interface BatchLike {
  pack: string;
  jurisdictions: readonly { ref: PlaceRef; identifiers?: readonly PlaceRef[]; levelKey: string }[];
}

export const holdersOf = (batches: readonly BatchLike[]): Holder[] =>
  batches.flatMap((batch) =>
    batch.jurisdictions.map((j) => ({
      pack: batch.pack,
      levelKey: j.levelKey,
      refs: [j.ref, ...(j.identifiers ?? [])],
    })),
  );

/** The jurisdictions that carry this identifier: an authority's place resolves when there is exactly one. */
export const resolveAuthority = (place: PlaceRef, holders: readonly Holder[]): Holder[] =>
  holders.filter((h) => h.refs.some((r) => r.scheme === place.scheme && r.value === place.value));

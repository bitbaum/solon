/**
 * The places on Solon's world map beyond the ISO list, and the rule that picks
 * the proclaimed ones, so nobody chooses by taste (design:
 * docs/design/2026-11-world-of-jurisdictions.md).
 *
 * Neutral by construction: each kind says what a place does, never whether
 * its claim is right.
 */

/** Places that govern themselves without UN membership, by their Wikidata items. */
export const SELF_GOVERNING_ITEMS: Readonly<Record<string, string>> = {
  abkhazia: "Q23334",
  "south-ossetia": "Q23427",
  transnistria: "Q907112",
  "northern-cyprus": "Q23681",
  somaliland: "Q34754",
};

/** ISO-coded places that govern themselves and are not UN members. */
export const SELF_GOVERNING_CODES = ["TW", "XK"] as const;

/** UN observer states (General Assembly resolutions; un.org lists them apart from members). */
export const UN_OBSERVER_CODES = ["PS", "VA"] as const;

/**
 * Proclaimed states: items Wikidata classes as a micronation (Q188443), not
 * dissolved, with an article in at least this many Wikipedias. Notability, not
 * merit: the threshold is the only judgment, and it is the same for every one.
 */
export const PROCLAIMED_MIN_WIKIPEDIAS = 30;

/**
 * Jurisdictions inside a state with their own law, and projects for new
 * jurisdictions at sea, named one by one with their items.
 */
export const NAMED_EXTRAS: readonly {
  slug: string;
  wikidata: string;
  kind: "special" | "project";
}[] = [
  { slug: "prospera", wikidata: "Q106541201", kind: "special" },
  { slug: "seasteading-institute", wikidata: "Q30274228", kind: "project" },
  { slug: "freedom-ship", wikidata: "Q2704160", kind: "project" },
  { slug: "blueseed", wikidata: "Q4930540", kind: "project" },
];

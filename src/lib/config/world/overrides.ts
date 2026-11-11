/**
 * A fact Solon states from the place's own law, where Wikidata says otherwise
 * or nothing. An override beats Wikidata for its place and fact, on every page
 * that shows the fact, and carries the citation the page prints beside it. The
 * mechanism knows no place: a place is a row here, and nothing else in code
 * names one (`applyOverrides`, src/lib/places/world-profile.ts).
 */
export interface FactOverride {
  /** The place's slug in the world list. */
  place: string;
  /** Which fact: a list of BCP 47 language codes, or of ISO 4217 currency codes. */
  fact: "languages" | "currencies";
  value: readonly string[];
  /** What states it: the instrument and article, and where to read it. */
  source: { title: string; url: string };
}

export const FACT_OVERRIDES: readonly FactOverride[] = [
  {
    place: "south-ossetia",
    fact: "languages",
    value: ["os", "ru"],
    source: {
      title: "Constitution, Art. 4",
      url: "https://parliamentrso.org/node/3567",
    },
  },
];

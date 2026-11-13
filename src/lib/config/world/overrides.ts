/**
 * A fact Solon states from the place's own law or an official publisher, where
 * Wikidata says otherwise or nothing. An override beats Wikidata for its place
 * and fact, on every page that shows the fact, and carries the citation the
 * page prints beside it. Any fact the profile card shows from Wikidata can be
 * overridden, for any place. The mechanism knows no place: a place is a row
 * here, and nothing else in code names one (`applyOverrides`,
 * src/lib/places/world-profile.ts).
 */

/** A name in each language it is written in, `en` at least: the shape Wikidata's labels have. */
export type OverrideName = Readonly<{ en: string } & Record<string, string>>;

/** What each fact's override holds, in the same shape the profile file holds Wikidata's. */
export interface OverrideValues {
  /** BCP 47 language codes. */
  languages: readonly string[];
  /** ISO 4217 currency codes. */
  currencies: readonly string[];
  capital: readonly OverrideName[];
  government: readonly OverrideName[];
  headOfState: readonly OverrideName[];
  headOfGovernment: readonly OverrideName[];
  /** The count, and the year it was counted (null when the source gives none). */
  population: { value: number; year: number | null };
  /** Square kilometres. */
  areaKm2: number;
  /** ISO date (YYYY-MM-DD) of founding or proclamation. */
  inception: string;
  /** The place's official website, https. */
  website: string;
}

export type OverriddenFact = keyof OverrideValues;

export type FactOverride = {
  [F in OverriddenFact]: {
    /** The place's slug in the world list. */
    place: string;
    fact: F;
    value: OverrideValues[F];
    /** What states it: the instrument and article, or the publisher's table, and where to read it. */
    source: { title: string; url: string };
  };
}[OverriddenFact];

/**
 * What is wrong with an override's value for its fact, or null. Pure, so the
 * table's test can hold every row to it and a new row cannot slip a malformed
 * value past the page.
 */
export function overrideProblem(o: FactOverride): string | null {
  if (!/^https:\/\//.test(o.source.url)) return "its source is not an https address";
  if (!o.source.title.trim()) return "its source has no title";
  switch (o.fact) {
    case "languages":
      return o.value.length && o.value.every((c) => /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(c))
        ? null
        : "languages must be BCP 47 codes";
    case "currencies":
      return o.value.length && o.value.every((c) => /^[A-Z]{3}$/.test(c))
        ? null
        : "currencies must be ISO 4217 codes";
    case "capital":
    case "government":
    case "headOfState":
    case "headOfGovernment":
      return o.value.length && o.value.every((n) => n.en.trim())
        ? null
        : "a name needs its English form";
    case "population":
      return Number.isInteger(o.value.value) &&
        o.value.value > 0 &&
        (o.value.year === null || (Number.isInteger(o.value.year) && o.value.year >= 1000))
        ? null
        : "a population is a positive whole count and a year";
    case "areaKm2":
      return o.value > 0 ? null : "an area is positive";
    case "inception":
      return /^\d{4}-\d{2}-\d{2}$/.test(o.value) && !Number.isNaN(Date.parse(o.value))
        ? null
        : "a founding date is YYYY-MM-DD";
    case "website":
      return /^https:\/\/[^\s/]+/.test(o.value) ? null : "a website is an https address";
  }
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

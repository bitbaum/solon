import type { CountryPackInput } from "../schema";

/**
 * The Principality of Liechtenstein: the nation, its two Landschaften and its
 * eleven communes. The Constitution makes the country "a union of two
 * Landschaften with eleven communes" and lists which communes form each
 * (Verfassung, LR 101, Art. 1); the Landschaften are also its two electoral
 * districts (Art. 46), so every commune lies in exactly one and the level is
 * full, not partial.
 *
 * No tax model yet: the country's tax and the communes' multipliers are not
 * imported. Its structure, names and postcodes are what other products
 * resolve places by.
 */
export const liechtenstein: CountryPackInput = {
  key: "liechtenstein",
  names: {
    de: "Liechtenstein",
    en: "Liechtenstein",
    fr: "Liechtenstein",
    it: "Liechtenstein",
  },
  currency: "CHF",
  region: "LI",
  fiscalYear: { startMonthDay: "01-01" },
  defaultLocales: ["de"],
  slug: { strategy: "official-name", transliterate: true },
  levels: [
    {
      key: "nation",
      parent: null,
      names: { en: "Principality", de: "Fürstentum", fr: "Principauté", it: "Principato" },
    },
    {
      // Oberland (Landschaft Vaduz) and Unterland (Landschaft Schellenberg).
      key: "landschaft",
      parent: "nation",
      names: { en: "Region", de: "Landschaft", fr: "région", it: "regione" },
    },
    {
      key: "municipality",
      parent: "landschaft",
      names: { en: "Municipality", de: "Gemeinde", fr: "commune", it: "comune" },
    },
  ],
  identifierSchemes: ["iso_3166_1", "li_landschaft", "li_municipality"],
  // Every Liechtenstein postcode in swisstopo's directory lies in 9485–9498;
  // no Swiss postcode starts 948 or 949.
  postcodePattern: "94[89][0-9]",
  sources: ["li-constitution-communes", "swisstopo-postcode-localities-li"],
};

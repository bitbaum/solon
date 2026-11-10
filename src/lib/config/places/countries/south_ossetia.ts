import type { CountryPackInput } from "../schema";

/**
 * The Republic of South Ossetia, as its own authorities describe it: a state
 * of five administrative-territorial units, the city of Tskhinvali and four
 * districts (Constitution, Art. 3 para. 2; capital Tskhinvali, Art. 3 para. 5).
 * Georgia and most states consider the territory part of Georgia; that, who
 * claims and who administers it, and which states recognise the Republic, are
 * rows between authorities (design `2026-09-places-and-jurisdictions.md` §7),
 * not words in this pack.
 *
 * The country has no ISO 3166-1 code, so the pack takes no `region`, and its
 * places are identified by Wikidata (the scheme every state authority is
 * expected to carry, §4.3). Its two state languages are Ossetian and Russian
 * (Constitution, Art. 4); the Russian forms are the authority's own names, the
 * rest are attributed as names others use. Its figures are in roubles, as its
 * statistics office publishes them.
 */
export const southOssetia: CountryPackInput = {
  key: "south_ossetia",
  names: {
    ru: "Южная Осетия",
    os: "Хуссар Ирыстон",
    en: "South Ossetia",
    de: "Südossetien",
    fr: "Ossétie du Sud",
    it: "Ossezia del Sud",
  },
  currency: "RUB",
  fiscalYear: { startMonthDay: "01-01" },
  defaultLocales: ["ru", "os"],
  slug: { strategy: "official-name", transliterate: true },
  levels: [
    {
      key: "nation",
      parent: null,
      names: {
        en: "Republic",
        ru: "Республика",
        de: "Republik",
        fr: "République",
        it: "Repubblica",
      },
    },
    {
      // The city of Tskhinvali and the Dzau, Znaur, Leningor and Tskhinvali
      // districts: the five units the Constitution names (Art. 3 para. 2).
      key: "administrative_unit",
      parent: "nation",
      names: {
        en: "Administrative-territorial unit",
        ru: "административно-территориальная единица",
        de: "Verwaltungseinheit",
        fr: "unité administrative",
        it: "unità amministrativa",
      },
    },
  ],
  identifierSchemes: ["wikidata"],
  sources: ["so-constitution-units"],
  instrumentKinds: [],
};

import { COUNTRIES } from "@/lib/config/world/countries";
import type { CountryPackInput } from "../schema";
import { EUROSTAT_GOV_COUNTRIES } from "@/lib/config/budgets/eurostat";
import {
  OECD_MEMBERS,
  WORLD_BANK_WORLD_KEY,
  WORLD_SUBDIVISIONS_KEY,
  eurostatKey,
  oecdKey,
} from "../world";

/**
 * The world: every country as a nation, and under it its ISO 3166-2
 * subdivisions by name and code alone. A country gets a
 * pack of its own when Solon holds its places, law or tax in depth, and
 * leaves this one (`scripts/places-world-countries.ts` regenerates the data).
 * Its figures are the World Bank's for every country and the OECD's tax series
 * for the OECD's members, Eurostat's government finance for the countries it covers: sources computed from the country registry in
 * ../world.ts, never listed by hand.
 *
 * The pack's sources are listed lazily by `worldPack` so that it can see which
 * countries the other packs hold without importing them (they import the config).
 */
/** The world pack's key, and its root place's path: every country no other pack holds sits under it. */
export const WORLD_PACK = "world";

export function worldPack(held: ReadonlySet<string>): CountryPackInput {
  const countries = COUNTRIES.filter((c) => !held.has(c.a2)).map((c) => c.a2);
  return {
    key: WORLD_PACK,
    names: {
      en: "The world",
      de: "Die Welt",
      fr: "Le monde",
      it: "Il mondo",
    },
    // The ISO 4217 code for "no currency": the world has none, and this pack holds no money.
    currency: "XXX",
    fiscalYear: { startMonthDay: "01-01" },
    defaultLocales: ["en"],
    slug: { strategy: "official-name", transliterate: true },
    levels: [
      {
        // One root, so a country's path is world/<name>, not a pack of 235 roots.
        key: "world",
        parent: null,
        names: { en: "World", de: "Welt", fr: "monde", it: "mondo" },
      },
      {
        key: "nation",
        parent: "world",
        names: { en: "Country", de: "Land", fr: "pays", it: "paese" },
      },
      {
        // An ISO 3166-2 subdivision directly under its country, whatever the country calls it
        // (a state, a region, a province); the tiers below hold the ones inside another.
        key: "subdivision",
        parent: "nation",
        names: {
          en: "Subdivision",
          de: "Gebietseinheit",
          fr: "subdivision",
          it: "suddivisione",
          ru: "административная единица",
        },
      },
      {
        // A subdivision inside another, where ISO lists both tiers (a French department in its
        // region, a Spanish province in its autonomous community).
        key: "subdivision_2",
        parent: "subdivision",
        names: {
          en: "Second-tier subdivision",
          de: "Gebietseinheit zweiter Stufe",
          fr: "subdivision de deuxième niveau",
          it: "suddivisione di secondo livello",
          ru: "административная единица второго уровня",
        },
      },
      {
        // A third tier, where ISO lists one (Alsace's departments within the European
        // Collectivity of Alsace, within Grand Est).
        key: "subdivision_3",
        parent: "subdivision_2",
        names: {
          en: "Third-tier subdivision",
          de: "Gebietseinheit dritter Stufe",
          fr: "subdivision de troisième niveau",
          it: "suddivisione di terzo livello",
          ru: "административная единица третьего уровня",
        },
      },
    ],
    identifierSchemes: ["world_root", "iso_3166_1", "iso_3166_2", "wikidata"],
    sources: [
      "world-country-registry",
      WORLD_SUBDIVISIONS_KEY,
      WORLD_BANK_WORLD_KEY,
      ...countries.filter((a2) => OECD_MEMBERS.includes(a2)).map(oecdKey),
      ...countries.filter((a2) => a2 in EUROSTAT_GOV_COUNTRIES).map(eurostatKey),
    ],
    instrumentKinds: [],
  };
}

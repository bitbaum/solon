import { COUNTRIES } from "@/lib/config/world/countries";
import type { CountryPackInput } from "../schema";
import { EUROSTAT_GOV_COUNTRIES } from "@/lib/config/budgets/eurostat";
import { OECD_MEMBERS, WORLD_BANK_WORLD_KEY, eurostatKey, oecdKey } from "../world";

/**
 * The world: every country as a nation, and nothing deeper. A country gets a
 * pack of its own when Solon holds its subdivisions, law or tax in depth, and
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
    ],
    identifierSchemes: ["world_root", "iso_3166_1"],
    sources: [
      "world-country-registry",
      WORLD_BANK_WORLD_KEY,
      ...countries.filter((a2) => OECD_MEMBERS.includes(a2)).map(oecdKey),
      ...countries.filter((a2) => a2 in EUROSTAT_GOV_COUNTRIES).map(eurostatKey),
    ],
    instrumentKinds: [],
  };
}

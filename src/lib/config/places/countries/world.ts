import { COUNTRIES } from "@/lib/config/world/countries";
import type { CountryPackInput } from "../schema";
import { OECD_MEMBERS, oecdKey, worldBankKey } from "../world";

/**
 * The world: every country as a nation, and nothing deeper. A country gets a
 * pack of its own when Solon holds its subdivisions, law or tax in depth, and
 * leaves this one (`scripts/places-world-countries.ts` regenerates the data).
 * Its figures are the World Bank's for every country and the OECD's tax series
 * for the OECD's members: sources computed from the country registry in
 * ../world.ts, never listed by hand.
 *
 * The pack's sources are listed lazily by `worldPack` so that it can see which
 * countries the other packs hold without importing them (they import the config).
 */
export function worldPack(held: ReadonlySet<string>): CountryPackInput {
  const countries = COUNTRIES.filter((c) => !held.has(c.a2)).map((c) => c.a2);
  return {
    key: "world",
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
        key: "nation",
        parent: null,
        names: { en: "Country", de: "Land", fr: "pays", it: "paese" },
      },
    ],
    identifierSchemes: ["iso_3166_1"],
    sources: [
      "world-country-registry",
      ...countries.map(worldBankKey),
      ...countries.filter((a2) => OECD_MEMBERS.includes(a2)).map(oecdKey),
    ],
    instrumentKinds: [],
  };
}

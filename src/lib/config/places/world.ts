/**
 * The countries Solon holds as places without a country pack of their own: the
 * nation level of every country in the registry (src/lib/config/world/countries.ts)
 * except those a pack holds in depth. Keys and membership are computed here,
 * once, so the pack, its sources and the data file never disagree.
 *
 * Every country gets the World Bank's indicators; the OECD's tax series are
 * asked of its members only (the Tax Database has no figures for the rest).
 */
import { COUNTRIES } from "@/lib/config/world/countries";

/** ISO 3166-1 alpha-2 codes of the OECD's 38 members (oecd.org/en/about/members-and-partners). */
export const OECD_MEMBERS: readonly string[] = [
  "AU",
  "AT",
  "BE",
  "CA",
  "CL",
  "CO",
  "CR",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IS",
  "IE",
  "IL",
  "IT",
  "JP",
  "KR",
  "LV",
  "LT",
  "LU",
  "MX",
  "NL",
  "NZ",
  "NO",
  "PL",
  "PT",
  "SK",
  "SI",
  "ES",
  "SE",
  "CH",
  "TR",
  "GB",
  "US",
];

export const worldBankKey = (a2: string) => `worldbank-wdi-${a2.toLowerCase()}`;
/** The one source that reads the World Bank's indicators for every country no pack holds. */
export const WORLD_BANK_WORLD_KEY = "worldbank-wdi-world";
export const oecdKey = (a2: string) => `oecd-tax-${a2.toLowerCase()}`;
export const eurostatKey = (a2: string) => `eurostat-gov-${a2.toLowerCase()}`;

/** Countries held by a pack of their own: given by the packs, so this file never lists them. */
export function worldCountries(held: ReadonlySet<string>): string[] {
  return COUNTRIES.filter((c) => !held.has(c.a2)).map((c) => c.a2);
}

/**
 * Subdivisions the world pack leaves out because the place has a page of its
 * own in the world list: ISO 3166-2 lists each under the state that regards it
 * as its territory, and that page says so, neutrally, with the comparison of
 * the two sets of law. By ISO 3166-2 code, to the world list's slug. (A
 * subdivision whose Wikidata item is itself a world entry, Greenland under
 * Denmark or Hong Kong under China, is left out by the generator's own rule.)
 */
export const SUBDIVISIONS_WITH_OWN_PAGE: Readonly<Record<string, string>> = {
  "CN-TW": "taiwan",
  "GE-AB": "abkhazia",
  "MD-SN": "transnistria",
  "RS-KM": "kosovo",
};

export const WORLD_SUBDIVISIONS_KEY = "world-subdivisions";

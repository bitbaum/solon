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
export const oecdKey = (a2: string) => `oecd-tax-${a2.toLowerCase()}`;
export const eurostatKey = (a2: string) => `eurostat-gov-${a2.toLowerCase()}`;

/** Countries held by a pack of their own: given by the packs, so this file never lists them. */
export function worldCountries(held: ReadonlySet<string>): string[] {
  return COUNTRIES.filter((c) => !held.has(c.a2)).map((c) => c.a2);
}

/**
 * Every country and territory, so each has a page of its own on Solon even
 * before Solon holds anything for it: the regions of ISO 3166-1, then the
 * places that govern themselves without being UN members. A region's name is
 * read from `Intl` in the reader's language; its slug is fixed here so a
 * shared link never changes when CLDR renames a country. Its codes and its
 * outline come from the country registry (./world/countries.ts), never from
 * here: this list says who a place is, the registry where it is. `mapName` is
 * the outline's name where Natural Earth draws it without a code.
 *
 * `claimedBy` states one fact, neutrally: the UN member that regards the place
 * as part of its territory. Nothing here ranks or judges a claim.
 */
import type { LocalizedText } from "./places/schema";
import { countryOf } from "./world/countries";

export interface WorldRegion {
  /** ISO 3166-1 alpha-2, or the user-assigned code CLDR names it by (XK). */
  code?: string;
  /** Its own names, where `Intl` has none. */
  names?: LocalizedText;
  slug: string;
  mapName?: string;
  claimedBy?: string;
  /**
   * The identifier Places knows a place by when it has no ISO code (South
   * Ossetia's Wikidata item), so pages about it can find its records.
   */
  ref?: { scheme: string; value: string };
}

export const WORLD: readonly WorldRegion[] = [
  { code: "AF", slug: "afghanistan" },
  { code: "AX", slug: "aland-islands" },
  { code: "AL", slug: "albania" },
  { code: "DZ", slug: "algeria" },
  { code: "AS", slug: "american-samoa" },
  { code: "AD", slug: "andorra" },
  { code: "AO", slug: "angola" },
  { code: "AI", slug: "anguilla" },
  { code: "AQ", slug: "antarctica" },
  { code: "AG", slug: "antigua-barbuda" },
  { code: "AR", slug: "argentina" },
  { code: "AM", slug: "armenia" },
  { code: "AW", slug: "aruba" },
  { code: "AU", slug: "australia" },
  { code: "AT", slug: "austria" },
  { code: "AZ", slug: "azerbaijan" },
  { code: "BS", slug: "bahamas" },
  { code: "BH", slug: "bahrain" },
  { code: "BD", slug: "bangladesh" },
  { code: "BB", slug: "barbados" },
  { code: "BY", slug: "belarus" },
  { code: "BE", slug: "belgium" },
  { code: "BZ", slug: "belize" },
  { code: "BJ", slug: "benin" },
  { code: "BM", slug: "bermuda" },
  { code: "BT", slug: "bhutan" },
  { code: "BO", slug: "bolivia" },
  { code: "BA", slug: "bosnia-herzegovina" },
  { code: "BW", slug: "botswana" },
  { code: "BV", slug: "bouvet-island" },
  { code: "BR", slug: "brazil" },
  { code: "IO", slug: "british-indian-ocean-territory" },
  { code: "VG", slug: "british-virgin-islands" },
  { code: "BN", slug: "brunei" },
  { code: "BG", slug: "bulgaria" },
  { code: "BF", slug: "burkina-faso" },
  { code: "BI", slug: "burundi" },
  { code: "KH", slug: "cambodia" },
  { code: "CM", slug: "cameroon" },
  { code: "CA", slug: "canada" },
  { code: "CV", slug: "cape-verde" },
  { code: "BQ", slug: "caribbean-netherlands" },
  { code: "KY", slug: "cayman-islands" },
  { code: "CF", slug: "central-african-republic" },
  { code: "TD", slug: "chad" },
  { code: "CL", slug: "chile" },
  { code: "CN", slug: "china" },
  { code: "CX", slug: "christmas-island" },
  { code: "CC", slug: "cocos-keeling-islands" },
  { code: "CO", slug: "colombia" },
  { code: "KM", slug: "comoros" },
  { code: "CG", slug: "congo-brazzaville" },
  { code: "CD", slug: "congo-kinshasa" },
  { code: "CK", slug: "cook-islands" },
  { code: "CR", slug: "costa-rica" },
  { code: "CI", slug: "cote-d-ivoire" },
  { code: "HR", slug: "croatia" },
  { code: "CU", slug: "cuba" },
  { code: "CW", slug: "curacao" },
  { code: "CY", slug: "cyprus" },
  { code: "CZ", slug: "czechia" },
  { code: "DK", slug: "denmark" },
  { code: "DJ", slug: "djibouti" },
  { code: "DM", slug: "dominica" },
  { code: "DO", slug: "dominican-republic" },
  { code: "EC", slug: "ecuador" },
  { code: "EG", slug: "egypt" },
  { code: "SV", slug: "el-salvador" },
  { code: "GQ", slug: "equatorial-guinea" },
  { code: "ER", slug: "eritrea" },
  { code: "EE", slug: "estonia" },
  { code: "SZ", slug: "eswatini" },
  { code: "ET", slug: "ethiopia" },
  { code: "FK", slug: "falkland-islands" },
  { code: "FO", slug: "faroe-islands" },
  { code: "FJ", slug: "fiji" },
  { code: "FI", slug: "finland" },
  { code: "FR", slug: "france" },
  { code: "GF", slug: "french-guiana" },
  { code: "PF", slug: "french-polynesia" },
  { code: "TF", slug: "french-southern-territories" },
  { code: "GA", slug: "gabon" },
  { code: "GM", slug: "gambia" },
  { code: "GE", slug: "georgia" },
  { code: "DE", slug: "germany" },
  { code: "GH", slug: "ghana" },
  { code: "GI", slug: "gibraltar" },
  { code: "GR", slug: "greece" },
  { code: "GL", slug: "greenland" },
  { code: "GD", slug: "grenada" },
  { code: "GP", slug: "guadeloupe" },
  { code: "GU", slug: "guam" },
  { code: "GT", slug: "guatemala" },
  { code: "GG", slug: "guernsey" },
  { code: "GN", slug: "guinea" },
  { code: "GW", slug: "guinea-bissau" },
  { code: "GY", slug: "guyana" },
  { code: "HT", slug: "haiti" },
  { code: "HM", slug: "heard-mcdonald-islands" },
  { code: "HN", slug: "honduras" },
  { code: "HK", slug: "hong-kong-sar-china" },
  { code: "HU", slug: "hungary" },
  { code: "IS", slug: "iceland" },
  { code: "IN", slug: "india" },
  { code: "ID", slug: "indonesia" },
  { code: "IR", slug: "iran" },
  { code: "IQ", slug: "iraq" },
  { code: "IE", slug: "ireland" },
  { code: "IM", slug: "isle-of-man" },
  { code: "IL", slug: "israel" },
  { code: "IT", slug: "italy" },
  { code: "JM", slug: "jamaica" },
  { code: "JP", slug: "japan" },
  { code: "JE", slug: "jersey" },
  { code: "JO", slug: "jordan" },
  { code: "KZ", slug: "kazakhstan" },
  { code: "KE", slug: "kenya" },
  { code: "KI", slug: "kiribati" },
  { code: "KW", slug: "kuwait" },
  { code: "KG", slug: "kyrgyzstan" },
  { code: "LA", slug: "laos" },
  { code: "LV", slug: "latvia" },
  { code: "LB", slug: "lebanon" },
  { code: "LS", slug: "lesotho" },
  { code: "LR", slug: "liberia" },
  { code: "LY", slug: "libya" },
  { code: "LI", slug: "liechtenstein" },
  { code: "LT", slug: "lithuania" },
  { code: "LU", slug: "luxembourg" },
  { code: "MO", slug: "macao-sar-china" },
  { code: "MG", slug: "madagascar" },
  { code: "MW", slug: "malawi" },
  { code: "MY", slug: "malaysia" },
  { code: "MV", slug: "maldives" },
  { code: "ML", slug: "mali" },
  { code: "MT", slug: "malta" },
  { code: "MH", slug: "marshall-islands" },
  { code: "MQ", slug: "martinique" },
  { code: "MR", slug: "mauritania" },
  { code: "MU", slug: "mauritius" },
  { code: "YT", slug: "mayotte" },
  { code: "MX", slug: "mexico" },
  { code: "FM", slug: "micronesia" },
  { code: "MD", slug: "moldova" },
  { code: "MC", slug: "monaco" },
  { code: "MN", slug: "mongolia" },
  { code: "ME", slug: "montenegro" },
  { code: "MS", slug: "montserrat" },
  { code: "MA", slug: "morocco" },
  { code: "MZ", slug: "mozambique" },
  { code: "MM", slug: "myanmar-burma" },
  { code: "NA", slug: "namibia" },
  { code: "NR", slug: "nauru" },
  { code: "NP", slug: "nepal" },
  { code: "NL", slug: "netherlands" },
  { code: "NC", slug: "new-caledonia" },
  { code: "NZ", slug: "new-zealand" },
  { code: "NI", slug: "nicaragua" },
  { code: "NE", slug: "niger" },
  { code: "NG", slug: "nigeria" },
  { code: "NU", slug: "niue" },
  { code: "NF", slug: "norfolk-island" },
  { code: "KP", slug: "north-korea" },
  { code: "MK", slug: "north-macedonia" },
  { code: "MP", slug: "northern-mariana-islands" },
  { code: "NO", slug: "norway" },
  { code: "OM", slug: "oman" },
  { code: "PK", slug: "pakistan" },
  { code: "PW", slug: "palau" },
  { code: "PS", slug: "palestinian-territories" },
  { code: "PA", slug: "panama" },
  { code: "PG", slug: "papua-new-guinea" },
  { code: "PY", slug: "paraguay" },
  { code: "PE", slug: "peru" },
  { code: "PH", slug: "philippines" },
  { code: "PN", slug: "pitcairn-islands" },
  { code: "PL", slug: "poland" },
  { code: "PT", slug: "portugal" },
  { code: "PR", slug: "puerto-rico" },
  { code: "QA", slug: "qatar" },
  { code: "RE", slug: "reunion" },
  { code: "RO", slug: "romania" },
  { code: "RU", slug: "russia" },
  { code: "RW", slug: "rwanda" },
  { code: "WS", slug: "samoa" },
  { code: "SM", slug: "san-marino" },
  { code: "ST", slug: "sao-tome-principe" },
  { code: "SA", slug: "saudi-arabia" },
  { code: "SN", slug: "senegal" },
  { code: "RS", slug: "serbia" },
  { code: "SC", slug: "seychelles" },
  { code: "SL", slug: "sierra-leone" },
  { code: "SG", slug: "singapore" },
  { code: "SX", slug: "sint-maarten" },
  { code: "SK", slug: "slovakia" },
  { code: "SI", slug: "slovenia" },
  { code: "SB", slug: "solomon-islands" },
  { code: "SO", slug: "somalia" },
  { code: "ZA", slug: "south-africa" },
  { code: "GS", slug: "south-georgia-south-sandwich-islands" },
  { code: "KR", slug: "south-korea" },
  { code: "SS", slug: "south-sudan" },
  { code: "ES", slug: "spain" },
  { code: "LK", slug: "sri-lanka" },
  { code: "BL", slug: "st-barthelemy" },
  { code: "SH", slug: "st-helena" },
  { code: "KN", slug: "st-kitts-nevis" },
  { code: "LC", slug: "st-lucia" },
  { code: "MF", slug: "st-martin" },
  { code: "PM", slug: "st-pierre-miquelon" },
  { code: "VC", slug: "st-vincent-grenadines" },
  { code: "SD", slug: "sudan" },
  { code: "SR", slug: "suriname" },
  { code: "SJ", slug: "svalbard-jan-mayen" },
  { code: "SE", slug: "sweden" },
  { code: "CH", slug: "switzerland" },
  { code: "SY", slug: "syria" },
  { code: "TW", slug: "taiwan" },
  { code: "TJ", slug: "tajikistan" },
  { code: "TZ", slug: "tanzania" },
  { code: "TH", slug: "thailand" },
  { code: "TL", slug: "timor-leste" },
  { code: "TG", slug: "togo" },
  { code: "TK", slug: "tokelau" },
  { code: "TO", slug: "tonga" },
  { code: "TT", slug: "trinidad-tobago" },
  { code: "TN", slug: "tunisia" },
  { code: "TR", slug: "turkiye" },
  { code: "TM", slug: "turkmenistan" },
  { code: "TC", slug: "turks-caicos-islands" },
  { code: "TV", slug: "tuvalu" },
  { code: "UM", slug: "u-s-outlying-islands" },
  { code: "VI", slug: "u-s-virgin-islands" },
  { code: "UG", slug: "uganda" },
  { code: "UA", slug: "ukraine" },
  { code: "AE", slug: "united-arab-emirates" },
  { code: "GB", slug: "united-kingdom" },
  { code: "US", slug: "united-states" },
  { code: "UY", slug: "uruguay" },
  { code: "UZ", slug: "uzbekistan" },
  { code: "VU", slug: "vanuatu" },
  { code: "VA", slug: "vatican-city" },
  { code: "VE", slug: "venezuela" },
  { code: "VN", slug: "vietnam" },
  { code: "WF", slug: "wallis-futuna" },
  { code: "EH", slug: "western-sahara" },
  { code: "YE", slug: "yemen" },
  { code: "ZM", slug: "zambia" },
  { code: "ZW", slug: "zimbabwe" },
  { code: "XK", slug: "kosovo", mapName: "Kosovo", claimedBy: "RS" },
  {
    slug: "abkhazia",
    names: { en: "Abkhazia", de: "Abchasien", fr: "Abkhazie", it: "Abcasia", ru: "Абхазия" },
    claimedBy: "GE",
  },
  {
    slug: "south-ossetia",
    // The item the South Ossetia pack identifies its nation by (its places data, `wikidata`).
    ref: { scheme: "wikidata", value: "Q23427" },
    names: {
      en: "South Ossetia",
      de: "Südossetien",
      fr: "Ossétie du Sud",
      it: "Ossezia del Sud",
      ru: "Южная Осетия",
    },
    claimedBy: "GE",
  },
  {
    slug: "transnistria",
    names: {
      en: "Transnistria",
      de: "Transnistrien",
      fr: "Transnistrie",
      it: "Transnistria",
      ru: "Приднестровье",
    },
    claimedBy: "MD",
  },
  {
    slug: "northern-cyprus",
    names: {
      en: "Northern Cyprus",
      de: "Nordzypern",
      fr: "Chypre du Nord",
      it: "Cipro del Nord",
      ru: "Северный Кипр",
    },
    mapName: "N. Cyprus",
    claimedBy: "CY",
  },
  {
    slug: "somaliland",
    names: {
      en: "Somaliland",
      de: "Somaliland",
      fr: "Somaliland",
      it: "Somaliland",
      ru: "Сомалиленд",
    },
    mapName: "Somaliland",
    claimedBy: "SO",
  },
];

/**
 * The world entry a place pack is about: the one with its ISO code, or, for a
 * place with none, the one whose slug is the pack's key with hyphens (the
 * pack root's canonical path, migration 0025).
 */
export const worldEntryOfPack = (
  pack: { key: string; region?: string | null },
  world: readonly WorldRegion[] = WORLD,
): WorldRegion | undefined =>
  world.find((w) =>
    pack.region ? w.code === pack.region : w.slug === pack.key.replace(/_/g, "-"),
  );

/** The region whose slug this is. */
export const worldRegion = (slug: string) => WORLD.find((r) => r.slug === slug);

/** The region with this ISO code. */
export const worldRegionByCode = (code: string) => WORLD.find((r) => r.code === code);

/** Its name in the reader's language: CLDR's for a coded region, else its own. */
export function regionName(region: WorldRegion, locale: string): string {
  if (region.names) {
    return region.names[locale] ?? region.names.en ?? region.slug;
  }
  return new Intl.DisplayNames([locale], { type: "region" }).of(region.code!) ?? region.code!;
}

/** The outline it is drawn as on the atlas, when Natural Earth draws it. */
export function regionFeature(region: WorldRegion): string | null {
  const n3 = region.code ? countryOf(region.code)?.n3 : null;
  if (n3) return `countries:${n3}`;
  if (region.mapName) return `countries:name:${region.mapName}`;
  return null;
}

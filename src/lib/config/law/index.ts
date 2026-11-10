/**
 * The law register's configuration (design: docs/design/2026-10-law-as-data.md).
 * Every authority, act kind and identifier scheme the register knows is a row
 * here, never a literal in the code that reads the register. Application code
 * under src/lib/law names none of them.
 */

import { WORLD } from "@/lib/config/world";
import { countryOf as registryCountry } from "@/lib/config/world/countries";

/** What an act is. A register's category maps onto one of these (below). */
export const ACT_KINDS = [
  "constitution",
  "statute",
  "ordinance",
  "decree",
  "notice",
  "regulation",
  /** A European Union directive: it binds the member states as to the result, and each transposes it. */
  "directive",
  "treaty",
  "intercantonal_agreement",
  "communal_act",
  "other",
] as const;
export type ActKind = (typeof ACT_KINDS)[number];

/**
 * The ways an act is found: a number its authority gave it, the register's own
 * id, and the Confederation's European Legislation Identifier.
 */
export const ACT_IDENTIFIER_SCHEMES = [
  "systematic_number",
  "lexfind_id",
  "ch_eli",
  "li_lr",
  "li_lgbl",
  "official_url",
  /** `<publisher key>:<the publisher's own number for the act>`; names an act in a municipal collection. */
  "publisher_ref",
  /** Luxembourg's European Legislation Identifier for the act (its Legilux work). */
  "lu_eli",
  /** The European Union's CELEX number: `32016R0679` (sector 3, year, R regulation or L directive, number). */
  "celex",
  /** The United Kingdom's legislation.gov.uk address without the host: `ukpga/2018/12` (type, year, number). */
  "uk_leg_id",
  /** Austria's Gesetzesnummer: the number the RIS gives an act, shared by every document of it (`10001622` is the ABGB). */
  "at_gesetzesnummer",
  /** The RIS's NOR number of an act's own document (`NOR40198929`), the one that carries its Langtitel. */
  "at_nor",
  /** The number an authority gave an act within its year, `<year>/<number>`: `2004/44` is law № 44 of 2004. */
  "act_number",
  /** Germany's federal portal's abbreviation for an act, the folder it is served from: `bgb`, `gg`, `1-dm-goldm_nzg`. */
  "gii_abbr",
] as const;
export type ActIdentifierScheme = (typeof ACT_IDENTIFIER_SCHEMES)[number];

/**
 * Whether the publisher calls a text the authentic one or a consolidated reading of it; or
 * `copy`: the published words as someone other than the publisher keeps them (Wikisource, a
 * legal database, an archive), read where the publisher's own copy could not be, and always
 * shown as such with who keeps it and the day it was read.
 */
export const ACT_TEXT_STATUSES = ["authentic", "consolidated", "copy"] as const;
export type ActTextStatus = (typeof ACT_TEXT_STATUSES)[number];

/**
 * How a version's first day is known: the publisher states it, or the publisher
 * states only that its page is current and the day it was read stands in.
 */
export const ACT_VERSION_DATE_BASES = ["publisher", "retrieved"] as const;
export type ActVersionDateBasis = (typeof ACT_VERSION_DATE_BASES)[number];

/** What a version's snapshot holds: a page, a document (a code printed as a Word file), data. */
export const ACT_TEXT_FORMATS = ["html", "pdf", "json", "xml", "doc", "docx"] as const;
export type ActTextFormat = (typeof ACT_TEXT_FORMATS)[number];

export const ACT_NAME_KINDS = ["title"] as const;
export type ActNameKind = (typeof ACT_NAME_KINDS)[number];

/**
 * A body that enacts law. `place` is the Places identifier of the jurisdiction
 * it speaks for, so "where does this apply" is the place chain; null when no
 * single place holds it (the cantons together).
 */
export interface LawAuthority {
  key: string;
  /**
   * An English label for logs, the API, prompts and scripts. Pages never show
   * it: they name the authority by its place, read from Places in the
   * reader's language (`loadAuthorityNames`). Only an authority with no single
   * place (the cantons together, the European Union) is named from messages.
   */
  label: string;
  /**
   * The name in each language, for an authority whose place Places does not hold and no
   * standard list names (a subject of the Russian Federation); `label` stays the English.
   */
  names?: Readonly<Record<string, string>>;
  place: { scheme: string; value: string } | null;
  /** The authority whose law also applies wherever this one's does: a commune's canton or country. */
  within?: string;
  /**
   * Speaks for a whole state authority whose place has no ISO 3166-1 code (a de facto one), so it
   * stands at the top of its own tree as a country does, under no other authority.
   */
  topLevel?: true;
  /**
   * A union of countries: the ISO 3166-1 codes of its members. Its law applies in each, so it is
   * the layer above every member's own law (the European Union above Estonia and Luxembourg).
   */
  members?: readonly string[];
  /** The notice the publisher's terms ask a reuser to show beside the text, verbatim. */
  attribution?: string;
}

/** The notice the Open Government Licence v3.0 asks a reuser to show (its "Attribution" condition). */
const UKLEG_ATTRIBUTION =
  "Contains public sector information licensed under the Open Government Licence v3.0. Source: legislation.gov.uk, The National Archives.";

const LISTED_AUTHORITIES: readonly LawAuthority[] = [
  { key: "ch", label: "Confederation", place: { scheme: "iso_3166_1", value: "CH" } },
  { key: "intercantonal", label: "Intercantonal", place: null },
  { key: "zh", label: "Zürich", place: { scheme: "bfs_canton", value: "1" } },
  { key: "be", label: "Bern", place: { scheme: "bfs_canton", value: "2" } },
  { key: "lu", label: "Luzern", place: { scheme: "bfs_canton", value: "3" } },
  { key: "ur", label: "Uri", place: { scheme: "bfs_canton", value: "4" } },
  { key: "sz", label: "Schwyz", place: { scheme: "bfs_canton", value: "5" } },
  { key: "ow", label: "Obwalden", place: { scheme: "bfs_canton", value: "6" } },
  { key: "nw", label: "Nidwalden", place: { scheme: "bfs_canton", value: "7" } },
  { key: "gl", label: "Glarus", place: { scheme: "bfs_canton", value: "8" } },
  { key: "zg", label: "Zug", place: { scheme: "bfs_canton", value: "9" } },
  { key: "fr", label: "Fribourg", place: { scheme: "bfs_canton", value: "10" } },
  { key: "so", label: "Solothurn", place: { scheme: "bfs_canton", value: "11" } },
  { key: "bs", label: "Basel-Stadt", place: { scheme: "bfs_canton", value: "12" } },
  { key: "bl", label: "Basel-Landschaft", place: { scheme: "bfs_canton", value: "13" } },
  { key: "sh", label: "Schaffhausen", place: { scheme: "bfs_canton", value: "14" } },
  { key: "ar", label: "Appenzell Ausserrhoden", place: { scheme: "bfs_canton", value: "15" } },
  { key: "ai", label: "Appenzell Innerrhoden", place: { scheme: "bfs_canton", value: "16" } },
  { key: "sg", label: "St. Gallen", place: { scheme: "bfs_canton", value: "17" } },
  { key: "gr", label: "Graubünden", place: { scheme: "bfs_canton", value: "18" } },
  { key: "ag", label: "Aargau", place: { scheme: "bfs_canton", value: "19" } },
  { key: "tg", label: "Thurgau", place: { scheme: "bfs_canton", value: "20" } },
  { key: "ti", label: "Ticino", place: { scheme: "bfs_canton", value: "21" } },
  { key: "vd", label: "Vaud", place: { scheme: "bfs_canton", value: "22" } },
  { key: "vs", label: "Valais", place: { scheme: "bfs_canton", value: "23" } },
  { key: "ne", label: "Neuchâtel", place: { scheme: "bfs_canton", value: "24" } },
  { key: "ge", label: "Genève", place: { scheme: "bfs_canton", value: "25" } },
  { key: "ju", label: "Jura", place: { scheme: "bfs_canton", value: "26" } },
  { key: "li", label: "Liechtenstein", place: { scheme: "iso_3166_1", value: "LI" } },
  // Other countries: a key that never collides with a canton's (Luxembourg is not Lucerne, `lu`).
  { key: "lux", label: "Luxembourg", place: { scheme: "iso_3166_1", value: "LU" } },
  { key: "ee", label: "Estonia", place: { scheme: "iso_3166_1", value: "EE" } },
  // A place with no ISO code (`so` is Solothurn's key, so the key is the Republic's own abbreviation): the Republic's own authorities' law, its place the Wikidata item
  // the Places pack identifies the nation by.
  {
    key: "rso",
    label: "South Ossetia",
    place: { scheme: "wikidata", value: "Q23427" },
    topLevel: true,
  },
  {
    key: "uk",
    label: "United Kingdom",
    place: { scheme: "iso_3166_1", value: "GB" },
    attribution: UKLEG_ATTRIBUTION,
  },
  {
    key: "at",
    label: "Austria",
    place: { scheme: "iso_3166_1", value: "AT" },
    // The RIS's terms for its open data: Creative Commons Namensnennung 4.0 (CC BY 4.0), with
    // attribution. The wording is Solon's, built from the form the RIS's FAQ asks for.
    attribution:
      "Quelle: RIS – Rechtsinformationssystem des Bundes, Bundeskanzleramt, https://www.ris.bka.gv.at (CC BY 4.0)",
  },
  // Germany's federal law; the Länder's own law is a follow-up (each publishes its own).
  { key: "de", label: "Germany", place: { scheme: "iso_3166_1", value: "DE" } },
  // A union of countries: no single place; its law applies in each member, above the member's
  // own. The 27 members since 1 February 2020, the day the United Kingdom left.
  {
    key: "eu",
    label: "European Union",
    place: null,
    members: [
      ...["AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR", "GR", "HR", "HU"],
      ...["IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO", "SE", "SI", "SK"],
    ],
    // EUR-Lex's legal notice: reuse is authorised provided the source is acknowledged
    // (Commission Decision 2011/833/EU on the reuse of Commission documents).
    attribution: "© European Union, https://eur-lex.europa.eu",
  },
  // The United States and its states: a state's key is `us-<postal code>`, its place ISO 3166-2.
  { key: "us", label: "United States", place: { scheme: "iso_3166_1", value: "US" } },
  { key: "ru", label: "Russia", place: { scheme: "iso_3166_1", value: "RU" } },
  // A subject of the Russian Federation: the key is `ru-` and its ISO 3166-2 code's suffix (RU-SE).
  // No Places pack holds Russia's subjects yet, so it names no place: its law sits under Russia's,
  // named by `names`, until a pack carries the subjects by their ISO 3166-2 codes.
  {
    key: "ru-se",
    label: "North Ossetia–Alania",
    names: {
      de: "Nordossetien-Alanien",
      fr: "Ossétie du Nord-Alanie",
      it: "Ossezia Settentrionale-Alania",
      ru: "Республика Северная Осетия — Алания",
    },
    place: null,
    within: "ru",
  },
  { key: "us-wy", label: "Wyoming", place: { scheme: "iso_3166_2", value: "US-WY" } },
  { key: "us-nh", label: "New Hampshire", place: { scheme: "iso_3166_2", value: "US-NH" } },
  // Communes: a key is `bfs<number>`, the place the commune's BFS number. One line per commune
  // whose collection a reader in src/lib/law/publishers covers.
  {
    key: "bfs261",
    label: "Zürich (city)",
    place: { scheme: "bfs_municipality", value: "261" },
    within: "zh",
  },
  // Communes whose collection is the i-web CMS's legal module (src/lib/law/publishers/iweb.ts).
  {
    key: "bfs1061",
    label: "Luzern (city)",
    place: { scheme: "bfs_municipality", value: "1061" },
    within: "lu",
  },
  {
    key: "bfs942",
    label: "Thun",
    place: { scheme: "bfs_municipality", value: "942" },
    within: "be",
  },
  {
    key: "bfs3901",
    label: "Chur",
    place: { scheme: "bfs_municipality", value: "3901" },
    within: "gr",
  },
  {
    key: "bfs2939",
    label: "Schaffhausen (city)",
    place: { scheme: "bfs_municipality", value: "2939" },
    within: "sh",
  },
  {
    key: "bfs6266",
    label: "Sion",
    place: { scheme: "bfs_municipality", value: "6266" },
    within: "vs",
  },
  // Communes whose law sits in a LexWork collection (see LEXWORK): `bfs<number>`, the commune's number in the
  // Federal Statistical Office's directory.
  {
    key: "bfs1701",
    label: "Baar",
    place: { scheme: "bfs_municipality", value: "1701" },
    within: "zg",
  },
  {
    key: "bfs1702",
    label: "Cham",
    place: { scheme: "bfs_municipality", value: "1702" },
    within: "zg",
  },
  {
    key: "bfs1703",
    label: "Hünenberg",
    place: { scheme: "bfs_municipality", value: "1703" },
    within: "zg",
  },
  {
    key: "bfs1704",
    label: "Menzingen",
    place: { scheme: "bfs_municipality", value: "1704" },
    within: "zg",
  },
  {
    key: "bfs1705",
    label: "Neuheim",
    place: { scheme: "bfs_municipality", value: "1705" },
    within: "zg",
  },
  {
    key: "bfs1706",
    label: "Oberägeri",
    place: { scheme: "bfs_municipality", value: "1706" },
    within: "zg",
  },
  {
    key: "bfs1707",
    label: "Risch",
    place: { scheme: "bfs_municipality", value: "1707" },
    within: "zg",
  },
  {
    key: "bfs1708",
    label: "Steinhausen",
    place: { scheme: "bfs_municipality", value: "1708" },
    within: "zg",
  },
  {
    key: "bfs1709",
    label: "Unterägeri",
    place: { scheme: "bfs_municipality", value: "1709" },
    within: "zg",
  },
  {
    key: "bfs1710",
    label: "Walchwil",
    place: { scheme: "bfs_municipality", value: "1710" },
    within: "zg",
  },
  {
    key: "bfs1711",
    label: "Zug",
    place: { scheme: "bfs_municipality", value: "1711" },
    within: "zg",
  },
  {
    key: "bfs1630",
    label: "Glarus Nord",
    place: { scheme: "bfs_municipality", value: "1630" },
    within: "gl",
  },
  {
    key: "bfs1631",
    label: "Glarus Süd",
    place: { scheme: "bfs_municipality", value: "1631" },
    within: "gl",
  },
  {
    key: "bfs1632",
    label: "Glarus",
    place: { scheme: "bfs_municipality", value: "1632" },
    within: "gl",
  },
  {
    key: "bfs230",
    label: "Winterthur",
    place: { scheme: "bfs_municipality", value: "230" },
    within: "zh",
  },
  {
    key: "bfs3203",
    label: "St. Gallen (city)",
    place: { scheme: "bfs_municipality", value: "3203" },
    within: "sg",
  },
  {
    key: "bfs371",
    label: "Biel/Bienne",
    place: { scheme: "bfs_municipality", value: "371" },
    within: "be",
  },
  // Liechtenstein's communes: `li<number>`, the place the commune's number in the Liechtenstein register.
  {
    key: "li7001",
    label: "Vaduz",
    place: { scheme: "li_municipality", value: "7001" },
    within: "li",
  },
  {
    key: "li7002",
    label: "Triesen",
    place: { scheme: "li_municipality", value: "7002" },
    within: "li",
  },
  {
    key: "li7003",
    label: "Balzers",
    place: { scheme: "li_municipality", value: "7003" },
    within: "li",
  },
  {
    key: "li7004",
    label: "Triesenberg",
    place: { scheme: "li_municipality", value: "7004" },
    within: "li",
  },
  {
    key: "li7005",
    label: "Schaan",
    place: { scheme: "li_municipality", value: "7005" },
    within: "li",
  },
  {
    key: "li7006",
    label: "Planken",
    place: { scheme: "li_municipality", value: "7006" },
    within: "li",
  },
  {
    key: "li7007",
    label: "Eschen-Nendeln",
    place: { scheme: "li_municipality", value: "7007" },
    within: "li",
  },
  {
    key: "li7008",
    label: "Mauren",
    place: { scheme: "li_municipality", value: "7008" },
    within: "li",
  },
  {
    key: "li7009",
    label: "Gamprin",
    place: { scheme: "li_municipality", value: "7009" },
    within: "li",
  },
  {
    key: "li7010",
    label: "Ruggell",
    place: { scheme: "li_municipality", value: "7010" },
    within: "li",
  },
  {
    key: "li7011",
    label: "Schellenberg",
    place: { scheme: "li_municipality", value: "7011" },
    within: "li",
  },
  // Swiss communes that link their acts from one page of their own (publishers/linked-documents.ts).
  {
    key: "bfs355",
    label: "Köniz",
    place: { scheme: "bfs_municipality", value: "355" },
    within: "be",
  },
  {
    key: "bfs2196",
    label: "Fribourg (city)",
    place: { scheme: "bfs_municipality", value: "2196" },
    within: "fr",
  },
  {
    key: "bfs6458",
    label: "Neuchâtel (city)",
    place: { scheme: "bfs_municipality", value: "6458" },
    within: "ne",
  },
  {
    key: "bfs5192",
    label: "Lugano",
    place: { scheme: "bfs_municipality", value: "5192" },
    within: "ti",
  },
  {
    key: "bfs5002",
    label: "Bellinzona",
    place: { scheme: "bfs_municipality", value: "5002" },
    within: "ti",
  },
  {
    key: "bfs6621",
    label: "Genève (city)",
    place: { scheme: "bfs_municipality", value: "6621" },
    within: "ge",
  },
  {
    key: "bfs5586",
    label: "Lausanne",
    place: { scheme: "bfs_municipality", value: "5586" },
    within: "vd",
  },
  {
    key: "bfs351",
    label: "Bern (city)",
    place: { scheme: "bfs_municipality", value: "351" },
    within: "be",
  },
  {
    key: "bfs6633",
    label: "Vernier",
    place: { scheme: "bfs_municipality", value: "6633" },
    within: "ge",
  },
  {
    key: "bfs6421",
    label: "La Chaux-de-Fonds",
    place: { scheme: "bfs_municipality", value: "6421" },
    within: "ne",
  },
];

/**
 * Every country of the world list (WORLD) has an authority, so the plan for the law of every
 * country (docs/design/2026-11-law-of-every-country.md) has a key to file each country's
 * constitution and national law under before Solon holds any of it. A country listed above keeps
 * its key; any other is keyed by its ISO 3166-1 alpha-2 code in lower case, or, where that key is
 * already taken (`ge` is Genève, `be` Bern), by its alpha-3 code: Georgia is `geo`, Belgium `bel`.
 */
function countryAuthorities(listed: readonly LawAuthority[]): LawAuthority[] {
  const taken = new Set(listed.map((a) => a.key));
  const placed = new Set(
    listed.flatMap((a) => (a.place?.scheme === "iso_3166_1" ? [a.place.value] : [])),
  );
  const out: LawAuthority[] = [];
  for (const region of WORLD) {
    if (!region.code || placed.has(region.code)) continue;
    // Only countries the registry can draw: the globe places every authority by its outline.
    const country = registryCountry(region.code);
    if (!country?.n3) continue;
    const candidates = [region.code.toLowerCase(), country.a3?.toLowerCase()];
    const key = candidates.find((k): k is string => !!k && !taken.has(k));
    if (!key) throw new Error(`law authorities: no free key for ${region.code}`);
    taken.add(key);
    out.push({
      key,
      label: country.name,
      place: { scheme: "iso_3166_1", value: region.code },
    });
  }
  return out;
}

export const LAW_AUTHORITIES: readonly LawAuthority[] = [
  ...LISTED_AUTHORITIES,
  ...countryAuthorities(LISTED_AUTHORITIES),
];

/**
 * A register: a publisher's list of acts. Its facts about an act (title,
 * number, whether it is in force) are what the official collection prints; its
 * editorial additions (keywords) are not imported, because its own terms of use
 * have not been read (open question in the direction notes).
 */
export interface LawRegisterSource {
  key: string;
  publisher: string;
  homepage: string;
  /** The Places licence class the imported facts fall under. */
  licenceSpdx: string;
  /** The identifier scheme that names an act in this register. */
  identityScheme: ActIdentifierScheme;
  /** The register's own abbreviation for each authority it lists. */
  authorityByCode: Readonly<Record<string, string>>;
  /** The register's category id to an act kind. */
  kindByCategory: Readonly<Record<number, ActKind>>;
}

export const LEXFIND: LawRegisterSource = {
  key: "lexfind-register",
  publisher: "LexFind.ch",
  homepage: "https://www.lexfind.ch",
  licenceSpdx: "LicenseRef-ch-official-act",
  identityScheme: "lexfind_id",
  authorityByCode: {
    CH: "ch",
    Intlex: "intercantonal",
    ZH: "zh",
    BE: "be",
    LU: "lu",
    UR: "ur",
    SZ: "sz",
    OW: "ow",
    NW: "nw",
    GL: "gl",
    ZG: "zg",
    FR: "fr",
    SO: "so",
    BS: "bs",
    BL: "bl",
    SH: "sh",
    AR: "ar",
    AI: "ai",
    SG: "sg",
    GR: "gr",
    AG: "ag",
    TG: "tg",
    TI: "ti",
    VD: "vd",
    VS: "vs",
    NE: "ne",
    GE: "ge",
    JU: "ju",
  },
  kindByCategory: {
    1: "treaty",
    2: "intercantonal_agreement",
    3: "constitution",
    4: "statute",
    5: "other",
    6: "ordinance",
    7: "regulation",
    8: "decree",
    9: "communal_act",
  },
};

/**
 * A publisher of law text (step L1 onward): where an authority's consolidated
 * acts are read from. The reader for a source is code; everything it needs to
 * name is here.
 */
export interface LawTextSource {
  key: string;
  authority: string;
  publisher: string;
  homepage: string;
  /** The Places licence class the text falls under (Art. 5 URG: not protected). */
  licenceSpdx: string;
  /** Languages the publisher holds each act in, and how it names them. */
  languages: Readonly<Record<string, string>>;
  /** What the publisher calls the text it serves: the consolidated reading, not the official compilation. */
  textStatus: ActTextStatus;
}

export const FEDLEX: LawTextSource = {
  key: "fedlex",
  authority: "ch",
  publisher: "Fedlex, the Federal Chancellery",
  homepage: "https://www.fedlex.admin.ch",
  licenceSpdx: "LicenseRef-ch-official-act",
  // BCP 47 → the EU authority-table code Fedlex's metadata uses.
  languages: { de: "DEU", fr: "FRA", it: "ITA" },
  // Fedlex states that only the Official Compilation (AS) is authentic; the
  // Classified Compilation (SR) it serves here is the consolidated reading.
  textStatus: "consolidated",
};

/**
 * Liechtenstein's Systematic Register (Systematisches Register), published by
 * the Government's legal service (Rechtsdienst der Regierung) as a PDF on
 * gesetze.li: every act in force at the reference day, by LR number, with the
 * Landesgesetzblatt issue that published it. The register itself states that
 * it has no legal force; the acts it lists are the law.
 */
export const LI_SYSTEMATIC_REGISTER = {
  key: "li-systematic-register",
  authority: "li",
  publisher: "Rechtsdienst der Regierung des Fürstentums Liechtenstein",
  homepage: "https://www.gesetze.li",
  /** The page that links the current edition of the PDF. */
  listing: "https://www.gesetze.li/konso/systematisches-register",
  /** Laws and official acts are not protected by copyright in Liechtenstein (URG Art. 5). */
  licenceSpdx: "LicenseRef-li-official-act",
  identityScheme: "li_lr" as ActIdentifierScheme,
  locale: "de",
  /** The kind an act is, by the abbreviation or word its title opens with. */
  kindByLeadingWord: {
    G: "statute",
    Gesetz: "statute",
    Hausgesetz: "statute",
    V: "ordinance",
    Verordnung: "ordinance",
    Km: "notice",
    Kundmachung: "notice",
    Verfassung: "constitution",
    Verfassungsgesetz: "constitution",
    FinB: "decree",
    Finanzbeschluss: "decree",
    Hofdekret: "decree",
    Hofkanzleidekret: "decree",
    Handschreiben: "decree",
    Bm: "notice",
    Bekanntmachung: "notice",
    FV: "ordinance",
  } as Readonly<Record<string, ActKind>>,
  /** The kind of a leading word that ends this way, tried in order (Asylgesetz, Geschäftsordnung). */
  kindByLeadingSuffix: [
    ["verordnung", "ordinance"],
    ["gesetzbuch", "statute"],
    ["gesetz", "statute"],
    ["ordnung", "regulation"],
  ] as readonly (readonly [string, ActKind])[],
  /** LR numbers that open with this are treaties (Staatsverträge). */
  treatyPrefix: "0.",
} as const;

/**
 * Liechtenstein's consolidated acts, read from Lilex (gesetze.li). A page is
 * `/konso/html/<id>`, and the id is the Landesgesetzblatt issue: year, number to
 * three digits, `000`. The exceptions are listed here as they are found.
 */
export const LILEX = {
  key: "lilex",
  authority: "li",
  publisher: "Rechtsdienst der Regierung des Fürstentums Liechtenstein (Lilex)",
  homepage: "https://www.gesetze.li",
  page: "https://www.gesetze.li/konso/html/",
  licenceSpdx: "LicenseRef-li-official-act",
  locale: "de",
  textStatus: "consolidated" as ActTextStatus,
  /** Acts whose page id is not their issue's: by LR number. Checked against the live pages, 2026-10-22. */
  idByLr: {
    // The ABGB is Austrian-era law (ASW) and has no Landesgesetzblatt issue.
    "210.0": "1003001000",
    // The Civil Procedure Code of 1912 is published in two parts.
    "271.0": "1912009001",
  } as Readonly<Record<string, string>>,
} as const;

/**
 * Cantonal and intercantonal acts, read as a document (step L3, first pass).
 * Each canton publishes its collection on its own platform, and a reader for
 * each is the aim. Until one exists for a canton, the act's own document, the
 * canton's PDF as LexFind keeps it at `/tol/<id>/<lang>`, is read instead.
 * That is a stated fallback, not the source of record: the act's official
 * page is the `official_url` the register keeps beside it.
 */
export const CANTONAL_DOCUMENTS = {
  key: "lexfind-documents",
  /** Where an act's document is: `<base><register id>/<lang>`. */
  base: "https://www.lexfind.ch/tol/",
  locale: "de",
  licenceSpdx: "LicenseRef-ch-official-act",
  textStatus: "consolidated" as ActTextStatus,
  /** An authority is read by this reader when its place is a canton, or it is the intercantonal one. */
  placeScheme: "bfs_canton",
  intercantonalAuthority: "intercantonal",
} as const;

/**
 * Zürich's own collection, ZH-Lex (zh.ch). An act's page names the PDF of its
 * current version, on another of the canton's hosts, and carries the day that
 * version took effect in its address:
 * `erlass-<LS number>-<enacted>-<in force>-<amendment number>.html`.
 */
export const ZHLEX = {
  key: "zhlex",
  authority: "zh",
  publisher: "Kanton Zürich, ZH-Lex",
  /** Only addresses on these hosts are fetched. */
  pageHost: "www.zh.ch",
  fileHost: "www.notes.zh.ch",
  locale: "de",
  licenceSpdx: "LicenseRef-ch-official-act",
  textStatus: "consolidated" as ActTextStatus,
} as const;

/**
 * Communes that keep their law in a LexWork collection (Sitrox), one address per commune.
 * The collection answers an open JSON interface under /api/<lang>/ (the app's own), so it is
 * read as data: the list of acts, each act by systematic number, its dated versions and the
 * article tree of each. Only these hosts are read. Surveyed 2026-11-01, docs/research.
 */
export const LEXWORK = {
  key: "lexwork",
  publisher: "LexWork collections kept by the communes (Sitrox)",
  licenceSpdx: "LicenseRef-ch-official-act",
  locale: "de",
  textStatus: "consolidated" as ActTextStatus,
  /** A commune's collection and the authority that is the commune. */
  instances: [
    { host: "zug.tlex.ch", authority: "bfs1711" },
    { host: "baar.tlex.ch", authority: "bfs1701" },
    { host: "cham.tlex.ch", authority: "bfs1702" },
    { host: "huenenberg.tlex.ch", authority: "bfs1703" },
    { host: "menzingen.tlex.ch", authority: "bfs1704" },
    { host: "neuheim.tlex.ch", authority: "bfs1705" },
    { host: "oberaegeri.tlex.ch", authority: "bfs1706" },
    { host: "risch.tlex.ch", authority: "bfs1707" },
    { host: "steinhausen.tlex.ch", authority: "bfs1708" },
    { host: "unteraegeri.tlex.ch", authority: "bfs1709" },
    { host: "walchwil.tlex.ch", authority: "bfs1710" },
    { host: "glarus.tlex.ch", authority: "bfs1632" },
    { host: "glarus-nord.tlex.ch", authority: "bfs1630" },
    { host: "glarus-sued.tlex.ch", authority: "bfs1631" },
    // Three of Switzerland's twenty most populous communes (2026-11-08): each city's own
    // systematic collection, as it links it from its site and search engines index it.
    { host: "winterthur.tlex.ch", authority: "bfs230" },
    { host: "st.gallen.tlex.ch", authority: "bfs3203" },
    { host: "biel-bienne.tlex.ch", authority: "bfs371" },
    // Not here: stadtrecht.bern.ch (Bern's own host) has no LexWork list (checked 2026-11-09), so a run
    // against it fails; Bern's collection is a script page and needs its own reader.
  ] as readonly { host: string; authority: string }[],
} as const;

/**
 * Luxembourg's law, from Legilux, the Grand Duchy's official legal database,
 * published by the Ministry of State's Central Legislation Service as open
 * data under CC BY 4.0 (data.public.lu, "Legilux - Journal officiel du
 * Grand-Duché de Luxembourg"). Its SPARQL endpoint speaks JOLux, the same
 * ontology as Fedlex: each act (a work) has consolidated versions with the day
 * they apply from, and each version's French text as HTML on a file store.
 */
export const LEGILUX = {
  key: "legilux",
  authority: "lux",
  publisher: "Legilux, Service central de législation, Ministère d'État",
  homepage: "https://legilux.public.lu",
  sparql: "https://data.legilux.public.lu/sparqlendpoint",
  /** Only these hosts are read. */
  hosts: ["data.legilux.public.lu", "legilux.public.lu"],
  licenceSpdx: "CC-BY-4.0",
  locale: "fr",
  textStatus: "consolidated" as ActTextStatus,
  /** Legilux's document types, as act kinds. */
  kinds: {
    Constitution: "constitution",
    LOI: "statute",
    CODE: "statute",
    RGD: "regulation",
    RGC: "regulation",
    RMIN: "regulation",
    RI: "regulation",
    AGD: "decree",
    AGC: "decree",
    AMIN: "decree",
    PA: "decree",
    ORD: "decree",
  } as Readonly<Record<string, ActKind>>,
} as const;

/**
 * Estonia's law from Riigi Teataja, the State Gazette, published by the
 * Ministry of Justice and Digital Affairs: the register of consolidated texts
 * in force through its public search, and each text as the gazette's own
 * structured XML. Legislation and other legal acts are not protected by
 * copyright in Estonia (Autoriõiguse seadus § 5 p 1). National acts first;
 * the municipalities' own regulations, which the same register lists, follow
 * once each municipality is a place.
 */
export const RIIGITEATAJA = {
  key: "riigiteataja",
  authority: "ee",
  publisher: "Riigi Teataja (State Gazette), Ministry of Justice and Digital Affairs",
  homepage: "https://www.riigiteataja.ee",
  searchUrl: "https://www.riigiteataja.ee/public-api/api/v1/otsing/tervik-tekst",
  /** `{id}` is a consolidated version's id. */
  xmlUrl: "https://www.riigiteataja.ee/public-api/api/v1/akt/{id}/blob-xml",
  pageUrl: "https://www.riigiteataja.ee/akt/{id}",
  hosts: ["www.riigiteataja.ee"],
  userAgent: "Solon law reader (solon.orangecat.ch)",
  licenceSpdx: "LicenseRef-ee-official-act",
  locale: "et",
  textStatus: "consolidated" as ActTextStatus,
  /** The register's document types, as act kinds. */
  kinds: {
    seadus: "statute",
    määrus: "regulation",
    otsus: "decree",
    korraldus: "decree",
    käskkiri: "decree",
    "rahvusvaheline leping": "treaty",
  } as Readonly<Record<string, ActKind>>,
} as const;

/**
 * The Republic of South Ossetia's acts as its Parliament publishes them
 * (parliamentrso.org, a Drupal site): the Constitution as one page, and three
 * listings of acts by kind (taxonomy terms), each act a page `/node/<id>` whose
 * body is the text. Read 2026-11-10. robots.txt asks every robot for a
 * 90-second crawl-delay (it disallows search, admin and system paths, not
 * these), which the reader honours, so a full register is about an hour and a
 * half and a full load of texts many runs. The site states no licence and no
 * status of an act: an act it lists is recorded as published, and amendments
 * are acts of their own ("О внесении изменений …"), not consolidated texts.
 * docs/research/2026-11-south-ossetia-sources.md §2.1.
 */
export const PARLIAMENTRSO = {
  key: "parliamentrso",
  authority: "rso",
  publisher: "Parliament of the Republic of South Ossetia",
  homepage: "https://parliamentrso.org",
  robotsUrl: "https://parliamentrso.org/robots.txt",
  /** `{term}` is a taxonomy term, `{page}` the listing page from 0; ten acts a page. */
  listingUrl: "https://parliamentrso.org/taxonomy/term/{term}?page={page}",
  /** `{id}` is a node number. */
  pageUrl: "https://parliamentrso.org/node/{id}",
  hosts: ["parliamentrso.org"],
  userAgent: "Solon law reader (solon.orangecat.ch)",
  licenceSpdx: "LicenseRef-so-official-act",
  /**
   * Whether the texts may be stored: yes, the Republic's own law on copyright says laws and other
   * official documents are not objects of copyright (Art. 8 of the law of 12 December 2012 № 64,
   * quoted on the licence entry; docs/research/2026-11-south-ossetia-sources.md §6).
   */
  textsAdmitted: true as boolean,
  locale: "ru",
  textStatus: "authentic" as ActTextStatus,
  /** The three listings under "Законодательство": laws, constitutional laws, resolutions. */
  terms: [
    { term: "2", label: "Законы", kind: "statute" },
    { term: "1", label: "Конституционные законы", kind: "statute" },
    { term: "16", label: "Постановления", kind: "decree" },
  ] as readonly { term: string; label: string; kind: ActKind }[],
  /**
   * A code is printed as a page linking Word files: "Содержание кодекса читать тут" (its
   * contents) and "Текст кодекса скачать тут" (its text). How the link to the text is worded.
   */
  documentLinks: { text: /текст/i, notText: /содержание|перечень|оглавление/i },
  /** The Constitution, a page of its own that no listing carries (its title as the page's h1). */
  constitution: {
    id: "3567",
    title: "Конституция Республики Южная Осетия",
    kind: "constitution" as ActKind,
  },
} as const;

/**
 * The President's decrees, treaties and documents from presidentruo.org, a
 * WordPress site with its REST API open (`/wp-json/wp/v2/posts`), no
 * crawl-delay; robots.txt disallows only /wp-admin/. Counts as the API stated
 * on 2026-11-10: decrees 1,832 (category 7), documents 245 (5), treaties 5
 * (6), the Constitution 1 (14); a post can sit in several. The site's page
 * "Об использовании информации сайта" (read through the API 2022-01-03 version)
 * allows reproduction "без каких-либо ограничений по объему и срокам
 * публикации", the only condition being "ссылка на первоисточник".
 */
export const PRESIDENTRUO = {
  key: "presidentruo",
  authority: "rso",
  publisher: "President of the Republic of South Ossetia",
  homepage: "https://presidentruo.org",
  /** `{category}`, `{page}` from 1, 100 posts a page. */
  postsUrl:
    "https://presidentruo.org/wp-json/wp/v2/posts?categories={category}&per_page=100&page={page}&order=asc&orderby=date&_fields=id,date,link,title",
  termsPageUrl: "https://presidentruo.org/ob-ispolzovanii-informacii-sajta/",
  /** One post with its text; `{id}` is the post's number. */
  postUrl: "https://presidentruo.org/wp-json/wp/v2/posts/{id}?_fields=id,date,link,title,content",
  hosts: ["presidentruo.org"],
  userAgent: "Solon law reader (solon.orangecat.ch)",
  licenceSpdx: "LicenseRef-so-president-site-reuse",
  /** The site's reuse page allows reproduction with a reference to the source (see the licence entry). */
  textsAdmitted: true as boolean,
  locale: "ru",
  textStatus: "authentic" as ActTextStatus,
  /**
   * The categories read, most specific first; a post found in several keeps the first kind, so the
   * treaty that "Документы" also lists is a treaty, not a decree.
   */
  categories: [
    { category: "14", label: "Конституция", kind: "constitution" },
    { category: "6", label: "Договоры", kind: "treaty" },
    { category: "7", label: "Указы", kind: "decree" },
    { category: "5", label: "Документы", kind: "decree" },
  ] as readonly { category: string; label: string; kind: ActKind }[],
  pauseMs: 1000,
} as const;

/**
 * The European Union's legislation in force, from the Publications Office: the
 * register from Cellar, its SPARQL endpoint over the Common Data Model (CDM),
 * and each act's English text from EUR-Lex as HTML, the latest consolidated
 * version when there is one (CELEX `02016R0679-20160504`, dated by the day
 * its CELEX names), else the act as the Official Journal published it.
 * EUR-Lex marks articles and annexes with the European Legislation
 * Identifier's anchors (`art_1`, `anx_I`), so a provision's path here is its
 * anchor there.
 *
 * Reuse: EUR-Lex content may be reused with acknowledgement of the source under
 * Commission Decision 2011/833/EU of 12 December 2011 on the reuse of
 * Commission documents (OJ L 330, 14.12.2011, p. 39), which the Publications
 * Office applies to EUR-Lex. The register is the Publications Office's open
 * data, under CC BY 4.0, the licence the Commission adopted for its documents
 * under that decision (C(2019) 1655). The notice to show is the authority's
 * `attribution`.
 */
export const EURLEX = {
  key: "eurlex",
  authority: "eu",
  publisher: "Publications Office of the European Union (EUR-Lex, Cellar)",
  homepage: "https://eur-lex.europa.eu",
  sparql: "https://publications.europa.eu/webapi/rdf/sparql",
  /** `{celex}` is a CELEX number, an act's or a consolidated version's. */
  htmlUrl: "https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:{celex}",
  pageUrl: "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:{celex}",
  /** Only these hosts are read. */
  hosts: ["publications.europa.eu", "eur-lex.europa.eu"],
  registerLicenceSpdx: "CC-BY-4.0",
  licenceSpdx: "LicenseRef-eu-reuse-2011-833",
  /** English first; the other official languages are the same reader with another code. */
  locale: "en",
  /** The language's code in the EU's authority table, as CDM names it. */
  cdmLanguage: "ENG",
  textStatus: "consolidated" as ActTextStatus,
  /** The CELEX type letter of each kind read: R regulation, L directive. */
  kinds: { R: "regulation", L: "directive" } as Readonly<Record<string, ActKind>>,
  /** The first year of the Official Journal's acts; the register is read a year at a time from it. */
  firstYear: 1952,
} as const;

/**
 * The United Kingdom's legislation from legislation.gov.uk, The National
 * Archives' official service: each type's items as Atom feeds, and each item's
 * current ("revised") version as Crown Legislation Markup Language (CLML) XML
 * at `<address>/data.xml`. An item's address is its type, year and number
 * (`ukpga/2018/12`); older acts are numbered by regnal year
 * (`ukpga/Geo5/15-16/20`), which the same pattern holds.
 *
 * Licence: Open Government Licence v3.0, which asks for attribution and is not
 * share-alike (https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/).
 * Fair use (https://www.legislation.gov.uk/fair-use-policy): at most 1,500
 * requests in any 5 minutes, per user and not per address; follow robots.txt
 * and its crawl-delay; without one, about 10 requests per 5 to 10 seconds. The
 * reader pauses `pauseMs` (a second) between requests and honours a larger
 * crawl-delay when robots.txt gives one; it gave 5 seconds when read on
 * 2026-11-08 (by the server's dry run), so a run asks 12 times a minute.
 */
export const UKLEG = {
  key: "ukleg",
  authority: "uk",
  publisher: "legislation.gov.uk, The National Archives",
  homepage: "https://www.legislation.gov.uk",
  /** `{type}` is a type (`ukpga`), `{year}` a year, `{page}` a feed page from 1. */
  listUrl: "https://www.legislation.gov.uk/{type}/{year}/data.feed?page={page}",
  /** `{path}` is an item's address (`ukpga/2018/12`). */
  xmlUrl: "https://www.legislation.gov.uk/{path}/data.xml",
  pageUrl: "https://www.legislation.gov.uk/{path}",
  robotsUrl: "https://www.legislation.gov.uk/robots.txt",
  /** Only this host is read. */
  hosts: ["www.legislation.gov.uk"],
  licenceSpdx: "OGL-UK-3.0",
  locale: "en",
  textStatus: "consolidated" as ActTextStatus,
  /**
   * The types read: UK Public General Acts and UK Statutory Instruments. The
   * devolved legislatures' (asp, anaw, asc, nia, ssi, wsi, nisr) are the same
   * reader with one line more here, and wait for their own authorities.
   */
  kinds: { ukpga: "statute", uksi: "regulation" } as Readonly<Record<string, ActKind>>,
  /** The first year listed for each type (the first statutory instruments are of 1948). */
  firstYear: { ukpga: 1801, uksi: 1948 } as Readonly<Record<string, number>>,
  /** Between requests, milliseconds. */
  pauseMs: 1000,
} as const;

/**
 * Austria's federal law from the Rechtsinformationssystem des Bundes (RIS) of the
 * Federal Chancellery, through its Open Government Data interface ("OGD-RIS API",
 * v2.6, https://data.bka.gv.at/ris/api/v2.6/). The application `BrKons` is the
 * consolidated federal law: a search answers one JSON document per section (§),
 * article or annex, all carrying their act's Gesetzesnummer; the act's own
 * document (Dokumenttyp "Norm", section "§ 0") carries the Kurztitel, the
 * Langtitel and the day of the act's first entry into force. The whole consolidated
 * text of an act is one HTML page, the `GesamteRechtsvorschriftUrl` each document
 * names; its sections are `<div class="documentContent">` blocks headed by the
 * RIS's own marker ("§ 4", "Art. 2 § 4", "Anl. 1").
 *
 * Reuse: the RIS FAQ puts the use of its data through the OGD interfaces under
 * Creative Commons Namensnennung 4.0 International (CC BY 4.0), asks for attribution,
 * needs no registration, and asks that a mass download be announced to
 * ris.it@bka.gv.at. The consolidated text is not authentic (only the Bundesgesetzblatt
 * is), so the text status is "consolidated". The notice to show is the authority's
 * `attribution`.
 */
export const RIS = {
  key: "ris",
  authority: "at",
  publisher: "Rechtsinformationssystem des Bundes (RIS), Bundeskanzleramt",
  homepage: "https://www.ris.bka.gv.at",
  /** The OGD-RIS API's Bundesrecht query; `Applikation=BrKons` asks for the consolidated law. */
  api: "https://data.bka.gv.at/ris/api/v2.6/Bundesrecht",
  /** `{gesetzesnummer}`: the whole consolidated act in force today, as one HTML page. */
  textUrl:
    "https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer={gesetzesnummer}",
  /** Only these hosts are read. */
  hosts: ["data.bka.gv.at", "www.ris.bka.gv.at", "ris.bka.gv.at"],
  application: "BrKons",
  /** The API's page size, "OneHundred": the largest it offers (10, 20, 50 or 100). */
  pageSize: 100,
  licenceSpdx: "CC-BY-4.0",
  locale: "de",
  textStatus: "consolidated" as ActTextStatus,
  /**
   * The RIS's act types (`Typ`) as act kinds, by the type's first word. Seen in the live register
   * (dry runs, 2026-11-08): BG, V, K (Geltungsbereich), Bekanntmachung, Geschäftsordnung,
   * Verfügung, "Entschl. d. BPräs", Vertrag – <partner> (some hundred spellings), and
   * Vereinbarung gem. Art. 15a B-VG (between the Bund and the Länder: not a kind of its own
   * here, so "other"). BVG and StV are the types the RIS's search help names. Matched without
   * regard to case.
   */
  kindByTyp: {
    BG: "statute",
    BVG: "constitution",
    V: "ordinance",
    K: "notice",
    StV: "treaty",
    Vertrag: "treaty",
    Bekanntmachung: "notice",
    Geschäftsordnung: "regulation",
    Verfügung: "decree",
    "Entschl.": "decree",
  } as Readonly<Record<string, ActKind>>,
  /** The kind of a title's first word, when the type is not one listed above. */
  kindByLeadingWord: {
    Bundesgesetz: "statute",
    Bundesverfassungsgesetz: "constitution",
    "Bundes-Verfassungsgesetz": "constitution",
    Verordnung: "ordinance",
    Kundmachung: "notice",
    Staatsvertrag: "treaty",
    Vertrag: "treaty",
    Bekanntmachung: "notice",
    Geschäftsordnung: "regulation",
  } as Readonly<Record<string, ActKind>>,
} as const;

/**
 * Germany's federal law from Gesetze im Internet, the portal of the Federal
 * Ministry of Justice (operated with juris): the table of contents of the
 * statutes and ordinances in force (`gii-toc.xml`, an entry per act with its
 * title and the address of its download), and each act as a zip of XML at
 * `/<abbreviation>/xml.zip`, one `<norm>` per paragraph (§), article, annex
 * and so on, in the portal's DTD (`/dtd/1.0/gii-norm.dtd`). The portal states
 * no day for a version, so each is dated by the day it was read, and an act is
 * read again every week and stored anew only when its text changed. German
 * statutes and other official works are not protected by copyright (§ 5
 * Urheberrechtsgesetz). Federal law only; the Länder publish their own.
 */
export const GII = {
  key: "gii",
  authority: "de",
  publisher: "Bundesministerium der Justiz, Gesetze im Internet",
  homepage: "https://www.gesetze-im-internet.de",
  tocUrl: "https://www.gesetze-im-internet.de/gii-toc.xml",
  /** `{abbr}` is the act's abbreviation as the portal names its folder. */
  zipUrl: "https://www.gesetze-im-internet.de/{abbr}/xml.zip",
  pageUrl: "https://www.gesetze-im-internet.de/{abbr}/index.html",
  hosts: ["www.gesetze-im-internet.de"],
  licenceSpdx: "LicenseRef-de-official-work",
  locale: "de",
  textStatus: "consolidated" as ActTextStatus,
  /** Between requests: the portal is a federal service, one request a second at most. */
  pauseMs: 1100,
  /** An act read within this many days is not read again; the weekly sync reads each once a week. */
  freshDays: 6,
  /**
   * The kind of an act from its German title: the rule whose word occurs first in the title
   * decides ("Zweite Verordnung zur Änderung des Gesetzes" is an ordinance, "Gesetz zu dem
   * Abkommen" a statute). A word counts at the end of a compound too (Strafgesetzbuch,
   * Straßenverkehrs-Zulassungs-Verordnung), not inside a longer word.
   */
  kindByTitle: [
    [/grundgesetz(?![\p{L}])/iu, "constitution"],
    [/(?:vertrag|abkommen|übereinkommen|konkordat)(?![\p{L}])/iu, "treaty"],
    [/(?:bekanntmachung|mitteilung|verkündung)(?![\p{L}])/iu, "notice"],
    [/(?:anordnung|erla(?:ß|ss)|beschlu(?:ß|ss)|verwaltungsvorschrift)(?![\p{L}])/iu, "decree"],
    [/verordnung(?![\p{L}])/iu, "ordinance"],
    [/(?:satzung|richtlinie|geschäftsordnung)(?![\p{L}])/iu, "regulation"],
    [/gesetz(?:e|es|buch|buches)?(?![\p{L}])/iu, "statute"],
  ] as readonly (readonly [RegExp, ActKind])[],
} as const;

/**
 * Wyoming's statutes and Constitution, from the Legislative Service Office's
 * "Wyoming Statutes - Files in Download Format": one PDF per title, Title 97
 * the Constitution. Law a US legislature enacts is not under copyright
 * (Georgia v. Public.Resource.Org, 590 U.S. 255 (2020)), so the text is
 * public domain. The download page states the day the files reflect only in
 * its rendered page, so each version is dated by the day it was read.
 */
export const WYOLEG = {
  key: "wyoleg",
  authority: "us-wy",
  publisher: "Wyoming Legislature, Legislative Service Office",
  homepage: "https://wyoleg.gov/stateStatutes/StatutesDownload",
  /** One file per title: `{title}` is the file's own number (01 … 42, 34.1, 97, 99). */
  fileUrl: "https://wyoleg.gov/statutes/compress/Title{title}.pdf",
  hosts: ["wyoleg.gov"],
  licenceSpdx: "LicenseRef-public-domain-edicts",
  locale: "en",
  textStatus: "consolidated" as ActTextStatus,
  /** Every file the page offers, by number, with the name it gives. Title 97 is the Constitution. */
  titles: [
    ["97", "The Wyoming Constitution"],
    ["01", "Title 1 Civil Procedure"],
    ["02", "Title 2 Wills, Decedents' Estates and Probate Code"],
    ["03", "Title 3 Guardian and Ward"],
    ["04", "Title 4 Fiduciaries"],
    ["05", "Title 5 Courts"],
    ["06", "Title 6 Crimes and Offenses"],
    ["07", "Title 7 Criminal Procedure"],
    ["08", "Title 8 General Provisions"],
    ["09", "Title 9 Administration of the Government"],
    ["10", "Title 10 Aeronautics"],
    ["11", "Title 11 Agriculture, Livestock and Other Animals"],
    ["12", "Title 12 Alcoholic Beverages"],
    ["13", "Title 13 Banks, Banking and Finance"],
    ["14", "Title 14 Children"],
    ["15", "Title 15 Cities and Towns"],
    ["16", "Title 16 City, County, State and Local Powers"],
    ["17", "Title 17 Corporations, Partnerships and Associations"],
    ["18", "Title 18 Counties"],
    ["19", "Title 19 Defense Forces and Affairs"],
    ["20", "Title 20 Domestic Relations"],
    ["21", "Title 21 Education"],
    ["22", "Title 22 Elections"],
    ["23", "Title 23 Game and Fish"],
    ["24", "Title 24 Highways"],
    ["25", "Title 25 Institutions of the State"],
    ["26", "Title 26 Insurance Code"],
    ["27", "Title 27 Labor and Employment"],
    ["28", "Title 28 Legislature"],
    ["29", "Title 29 Liens"],
    ["30", "Title 30 Mines and Minerals"],
    ["31", "Title 31 Motor Vehicles"],
    ["32", "Title 32 Notaries"],
    ["33", "Title 33 Professions and Occupations"],
    ["34", "Title 34 Property, Conveyances and Security Transactions"],
    ["34.1", "Title 34.1 Uniform Commercial Code"],
    ["35", "Title 35 Public Health and Safety"],
    ["36", "Title 36 Public Land"],
    ["37", "Title 37 Public Utilities"],
    ["38", "Title 38 Sureties"],
    ["39", "Title 39 Taxation and Revenue"],
    ["40", "Title 40 Trade and Commerce"],
    ["41", "Title 41 Water"],
    ["42", "Title 42 Welfare"],
    ["99", "Title 99 Water Projects"],
  ] as const,
} as const;

/**
 * New Hampshire's statutes, the Revised Statutes Annotated (RSA), as the
 * General Court publishes them in HTML under `/rsa/html/`: a table of the
 * titles (`nhtoc.htm`), each title's chapters (`NHTOC/NHTOC-<title>.htm`), and
 * each chapter merged into one page with every section
 * (`<title>/<chapter>/<chapter>-mrg.htm`). Each chapter is an act, cited as
 * "RSA 39"; its sections ("39:3", "5:6-a") are its provisions. The General
 * Court moved from www.gencourt.state.nh.us to gc.nh.gov, and the old host
 * answers every address with a permanent redirect to the same path on the new
 * one (checked 2026-11-08), so the new host is the official address and the
 * old one is asked only for the Internet Archive's copies made under it. Law a
 * US legislature enacts is not under copyright (Georgia v. Public.Resource.Org,
 * 590 U.S. 255 (2020)). The pages state no date, so each version is dated by
 * the day it was read, or the day the archive captured the copy read.
 */
export const GCNH = {
  key: "gcnh",
  authority: "us-nh",
  publisher: "New Hampshire General Court",
  base: "https://gc.nh.gov/rsa/html/",
  /** Where the same pages were before the move; the archive holds most of its copies there. */
  formerBase: "https://www.gencourt.state.nh.us/rsa/html/",
  homepage: "https://gc.nh.gov/rsa/html/nhtoc.htm",
  /** The table of titles, relative to `base`. */
  titlesPage: "nhtoc.htm",
  hosts: ["gc.nh.gov", "www.gencourt.state.nh.us"],
  licenceSpdx: "LicenseRef-public-domain-edicts",
  locale: "en",
  textStatus: "consolidated" as ActTextStatus,
  /**
   * Between requests: 11 seconds, the Crawl-delay another public reader of the
   * RSAs records from the site's robots.txt (worldwidelaw/legal-sources); the
   * site refused the sandbox this reader was written in, so it was not read here.
   */
  pauseMs: 11_000,
} as const;

/**
 * The country whose law an authority's law sits within, as ISO 3166-1: a
 * canton, an intercantonal body and a Swiss commune are CH; Liechtenstein and
 * its communes LI; Luxembourg LU. Read from config, never typed per authority.
 */
export function countryOf(key: string): string | null {
  const seen = new Set<string>();
  let authority = LAW_AUTHORITIES.find((a) => a.key === key);
  while (authority && !seen.has(authority.key)) {
    seen.add(authority.key);
    if (authority.place?.scheme === "iso_3166_1") return authority.place.value;
    // A subdivision's code starts with its country's: US-WY is in US.
    if (authority.place?.scheme === "iso_3166_2") return authority.place.value.slice(0, 2);
    if (authority.place?.scheme === "bfs_canton" || authority.key === "intercantonal") return "CH";
    authority = authority.within
      ? LAW_AUTHORITIES.find((a) => a.key === authority!.within)
      : undefined;
  }
  return null;
}

/**
 * Russia's official publication of law, the Official Internet Portal of Legal
 * Information (publication.pravo.gov.ru): the federal acts and those of every
 * subject of the Federation, each listed with its type, number, dates and the
 * page of its official publication, through the JSON API the portal's own
 * pages read (`/api/PublicBlocks`, `/api/DocumentTypes`, `/api/Documents`).
 * Read 2026-11-10. robots.txt disallows `/File`, where the scanned PDF of each
 * act is served, so Solon lists acts here and does not fetch their text from
 * this portal. One more subject is one more entry in `blocks`.
 * Official documents of state bodies, laws included, are not objects of
 * copyright (Civil Code of the Russian Federation, Art. 1259(6)).
 */
export const PRAVO_GOV_RU = {
  key: "pravo-gov-ru",
  publisher: "Official Internet Portal of Legal Information",
  homepage: "http://publication.pravo.gov.ru",
  /** `{block}`, `{types}` (DocumentTypes, repeated), `{page}` from 1; 200 acts a page. */
  documentsUrl:
    "http://publication.pravo.gov.ru/api/Documents?block={block}&{types}&PageSize=200&index={page}",
  /** The page of an act's official publication; `{eo}` is its electronic publication number. */
  pageUrl: "http://publication.pravo.gov.ru/document/{eo}",
  hosts: ["publication.pravo.gov.ru"],
  userAgent: "Solon law reader (solon.orangecat.ch)",
  licenceSpdx: "LicenseRef-ru-official-act",
  locale: "ru",
  textStatus: "authentic" as ActTextStatus,
  pauseMs: 2000,
  /**
   * What is read, per authority: the portal's block and the document types (by the portal's own
   * ids, from `/api/DocumentTypes?block=…`) with the kind each becomes. Decrees, orders and
   * resolutions are left for later: the laws come first, since they are what a proposal changes.
   */
  blocks: [
    {
      authority: "ru",
      block: "president",
      types: [
        { id: "8fb60238-9fee-4a1b-9534-6d99ad0ceff0", label: "Конституция", kind: "constitution" },
        {
          id: "e0c56da5-17f1-40ac-a10f-8a9a1cee0c4e",
          label: "Закон Российской Федерации о поправке к Конституции Российской Федерации",
          kind: "statute",
        },
        {
          id: "93273da3-3133-4acf-96c2-4adc1ae70e19",
          label: "Федеральный конституционный закон",
          kind: "statute",
        },
        { id: "82a8bf1c-3bc7-47ed-827f-7affd43a7f27", label: "Федеральный закон", kind: "statute" },
      ],
    },
    {
      authority: "ru-se",
      block: "region15",
      types: [
        {
          id: "97d902b9-cc94-4b01-9576-b4a7d4fde1fb",
          label: "Конституционный закон",
          kind: "statute",
        },
        { id: "8910e61f-371d-490c-a1b8-aa7b8a5a48be", label: "Закон", kind: "statute" },
      ],
    },
  ] as readonly {
    authority: string;
    block: string;
    types: readonly { id: string; label: string; kind: ActKind }[];
  }[],
} as const;

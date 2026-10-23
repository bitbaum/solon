/**
 * The law register's configuration (design: docs/design/2026-10-law-as-data.md).
 * Every authority, act kind and identifier scheme the register knows is a row
 * here, never a literal in the code that reads the register. Application code
 * under src/lib/law names none of them.
 */

/** What an act is. A register's category maps onto one of these (below). */
export const ACT_KINDS = [
  "constitution",
  "statute",
  "ordinance",
  "decree",
  "regulation",
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
export const ACT_IDENTIFIER_SCHEMES = ["systematic_number", "lexfind_id", "ch_eli"] as const;
export type ActIdentifierScheme = (typeof ACT_IDENTIFIER_SCHEMES)[number];

/** Whether the publisher calls a text the authentic one or a consolidated reading of it. */
export const ACT_TEXT_STATUSES = ["authentic", "consolidated"] as const;
export type ActTextStatus = (typeof ACT_TEXT_STATUSES)[number];

/** What a version's snapshot holds. */
export const ACT_TEXT_FORMATS = ["html"] as const;
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
  name: string;
  place: { scheme: string; value: string } | null;
}

export const LAW_AUTHORITIES: readonly LawAuthority[] = [
  { key: "ch", name: "Confederation", place: { scheme: "iso_3166_1", value: "CH" } },
  { key: "intercantonal", name: "Intercantonal", place: null },
  { key: "zh", name: "Zürich", place: { scheme: "bfs_canton", value: "1" } },
  { key: "be", name: "Bern", place: { scheme: "bfs_canton", value: "2" } },
  { key: "lu", name: "Luzern", place: { scheme: "bfs_canton", value: "3" } },
  { key: "ur", name: "Uri", place: { scheme: "bfs_canton", value: "4" } },
  { key: "sz", name: "Schwyz", place: { scheme: "bfs_canton", value: "5" } },
  { key: "ow", name: "Obwalden", place: { scheme: "bfs_canton", value: "6" } },
  { key: "nw", name: "Nidwalden", place: { scheme: "bfs_canton", value: "7" } },
  { key: "gl", name: "Glarus", place: { scheme: "bfs_canton", value: "8" } },
  { key: "zg", name: "Zug", place: { scheme: "bfs_canton", value: "9" } },
  { key: "fr", name: "Fribourg", place: { scheme: "bfs_canton", value: "10" } },
  { key: "so", name: "Solothurn", place: { scheme: "bfs_canton", value: "11" } },
  { key: "bs", name: "Basel-Stadt", place: { scheme: "bfs_canton", value: "12" } },
  { key: "bl", name: "Basel-Landschaft", place: { scheme: "bfs_canton", value: "13" } },
  { key: "sh", name: "Schaffhausen", place: { scheme: "bfs_canton", value: "14" } },
  { key: "ar", name: "Appenzell Ausserrhoden", place: { scheme: "bfs_canton", value: "15" } },
  { key: "ai", name: "Appenzell Innerrhoden", place: { scheme: "bfs_canton", value: "16" } },
  { key: "sg", name: "St. Gallen", place: { scheme: "bfs_canton", value: "17" } },
  { key: "gr", name: "Graubünden", place: { scheme: "bfs_canton", value: "18" } },
  { key: "ag", name: "Aargau", place: { scheme: "bfs_canton", value: "19" } },
  { key: "tg", name: "Thurgau", place: { scheme: "bfs_canton", value: "20" } },
  { key: "ti", name: "Ticino", place: { scheme: "bfs_canton", value: "21" } },
  { key: "vd", name: "Vaud", place: { scheme: "bfs_canton", value: "22" } },
  { key: "vs", name: "Valais", place: { scheme: "bfs_canton", value: "23" } },
  { key: "ne", name: "Neuchâtel", place: { scheme: "bfs_canton", value: "24" } },
  { key: "ge", name: "Genève", place: { scheme: "bfs_canton", value: "25" } },
  { key: "ju", name: "Jura", place: { scheme: "bfs_canton", value: "26" } },
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

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
  "notice",
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
] as const;
export type ActIdentifierScheme = (typeof ACT_IDENTIFIER_SCHEMES)[number];

/** Whether the publisher calls a text the authentic one or a consolidated reading of it. */
export const ACT_TEXT_STATUSES = ["authentic", "consolidated"] as const;
export type ActTextStatus = (typeof ACT_TEXT_STATUSES)[number];

/**
 * How a version's first day is known: the publisher states it, or the publisher
 * states only that its page is current and the day it was read stands in.
 */
export const ACT_VERSION_DATE_BASES = ["publisher", "retrieved"] as const;
export type ActVersionDateBasis = (typeof ACT_VERSION_DATE_BASES)[number];

/** What a version's snapshot holds. */
export const ACT_TEXT_FORMATS = ["html", "pdf", "json", "xml"] as const;
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
  /** The authority whose law also applies wherever this one's does: a commune's canton or country. */
  within?: string;
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
  { key: "li", name: "Liechtenstein", place: { scheme: "iso_3166_1", value: "LI" } },
  // Other countries: a key that never collides with a canton's (Luxembourg is not Lucerne, `lu`).
  { key: "lux", name: "Luxembourg", place: { scheme: "iso_3166_1", value: "LU" } },
  { key: "ee", name: "Estonia", place: { scheme: "iso_3166_1", value: "EE" } },
  // The United States and its states: a state's key is `us-<postal code>`, its place ISO 3166-2.
  { key: "us", name: "United States", place: { scheme: "iso_3166_1", value: "US" } },
  { key: "us-wy", name: "Wyoming", place: { scheme: "iso_3166_2", value: "US-WY" } },
  { key: "us-nh", name: "New Hampshire", place: { scheme: "iso_3166_2", value: "US-NH" } },
  // Communes: a key is `bfs<number>`, the place the commune's BFS number. One line per commune
  // whose collection a reader in src/lib/law/publishers covers.
  {
    key: "bfs261",
    name: "Zürich (city)",
    place: { scheme: "bfs_municipality", value: "261" },
    within: "zh",
  },
  // Communes whose law sits in a LexWork collection (see LEXWORK): `bfs<number>`, the commune's number in the
  // Federal Statistical Office's directory.
  {
    key: "bfs1701",
    name: "Baar",
    place: { scheme: "bfs_municipality", value: "1701" },
    within: "zg",
  },
  {
    key: "bfs1702",
    name: "Cham",
    place: { scheme: "bfs_municipality", value: "1702" },
    within: "zg",
  },
  {
    key: "bfs1703",
    name: "Hünenberg",
    place: { scheme: "bfs_municipality", value: "1703" },
    within: "zg",
  },
  {
    key: "bfs1704",
    name: "Menzingen",
    place: { scheme: "bfs_municipality", value: "1704" },
    within: "zg",
  },
  {
    key: "bfs1705",
    name: "Neuheim",
    place: { scheme: "bfs_municipality", value: "1705" },
    within: "zg",
  },
  {
    key: "bfs1706",
    name: "Oberägeri",
    place: { scheme: "bfs_municipality", value: "1706" },
    within: "zg",
  },
  {
    key: "bfs1707",
    name: "Risch",
    place: { scheme: "bfs_municipality", value: "1707" },
    within: "zg",
  },
  {
    key: "bfs1708",
    name: "Steinhausen",
    place: { scheme: "bfs_municipality", value: "1708" },
    within: "zg",
  },
  {
    key: "bfs1709",
    name: "Unterägeri",
    place: { scheme: "bfs_municipality", value: "1709" },
    within: "zg",
  },
  {
    key: "bfs1710",
    name: "Walchwil",
    place: { scheme: "bfs_municipality", value: "1710" },
    within: "zg",
  },
  {
    key: "bfs1711",
    name: "Zug",
    place: { scheme: "bfs_municipality", value: "1711" },
    within: "zg",
  },
  {
    key: "bfs1630",
    name: "Glarus Nord",
    place: { scheme: "bfs_municipality", value: "1630" },
    within: "gl",
  },
  {
    key: "bfs1631",
    name: "Glarus Süd",
    place: { scheme: "bfs_municipality", value: "1631" },
    within: "gl",
  },
  {
    key: "bfs1632",
    name: "Glarus",
    place: { scheme: "bfs_municipality", value: "1632" },
    within: "gl",
  },
  // Liechtenstein's communes: `li<number>`, the place the commune's number in the Liechtenstein register.
  {
    key: "li7001",
    name: "Vaduz",
    place: { scheme: "li_municipality", value: "7001" },
    within: "li",
  },
  {
    key: "li7002",
    name: "Triesen",
    place: { scheme: "li_municipality", value: "7002" },
    within: "li",
  },
  {
    key: "li7003",
    name: "Balzers",
    place: { scheme: "li_municipality", value: "7003" },
    within: "li",
  },
  {
    key: "li7004",
    name: "Triesenberg",
    place: { scheme: "li_municipality", value: "7004" },
    within: "li",
  },
  {
    key: "li7005",
    name: "Schaan",
    place: { scheme: "li_municipality", value: "7005" },
    within: "li",
  },
  {
    key: "li7006",
    name: "Planken",
    place: { scheme: "li_municipality", value: "7006" },
    within: "li",
  },
  {
    key: "li7007",
    name: "Eschen-Nendeln",
    place: { scheme: "li_municipality", value: "7007" },
    within: "li",
  },
  {
    key: "li7008",
    name: "Mauren",
    place: { scheme: "li_municipality", value: "7008" },
    within: "li",
  },
  {
    key: "li7009",
    name: "Gamprin",
    place: { scheme: "li_municipality", value: "7009" },
    within: "li",
  },
  {
    key: "li7010",
    name: "Ruggell",
    place: { scheme: "li_municipality", value: "7010" },
    within: "li",
  },
  {
    key: "li7011",
    name: "Schellenberg",
    place: { scheme: "li_municipality", value: "7011" },
    within: "li",
  },
  // Swiss communes that link their acts from one page of their own (publishers/linked-documents.ts).
  {
    key: "bfs355",
    name: "Köniz",
    place: { scheme: "bfs_municipality", value: "355" },
    within: "be",
  },
  {
    key: "bfs2196",
    name: "Fribourg (city)",
    place: { scheme: "bfs_municipality", value: "2196" },
    within: "fr",
  },
  {
    key: "bfs6458",
    name: "Neuchâtel (city)",
    place: { scheme: "bfs_municipality", value: "6458" },
    within: "ne",
  },
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

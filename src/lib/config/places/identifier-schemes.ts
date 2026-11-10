import type { IdentifierSchemeInput } from "./schema";

/**
 * Identifier schemes: the external codes a place can carry, many per place
 * (§4.3). `reserved` schemes can only be carried by a state authority; the
 * database refuses them on a founded or proposed place.
 */
export const IDENTIFIER_SCHEMES: readonly IdentifierSchemeInput[] = [
  {
    key: "iso_3166_1",
    label: { en: "ISO 3166-1 country code", de: "Ländercode ISO 3166-1" },
    pattern: "[A-Z]{2}",
    reserved: true,
  },
  {
    // Wikidata's item number: the one scheme expected of every state authority, including
    // those no ISO or national code covers (design §4.3). CC0.
    key: "wikidata",
    label: { en: "Wikidata item", de: "Wikidata-Eintrag" },
    pattern: "Q[1-9][0-9]*",
    urlTemplate: "https://www.wikidata.org/wiki/{value}",
    reserved: true,
  },
  {
    key: "bfs_canton",
    label: { en: "FSO canton number", de: "BFS-Kantonsnummer", fr: "numéro OFS du canton" },
    pattern: "[1-9]|1[0-9]|2[0-6]",
    reserved: true,
  },
  {
    key: "bfs_district",
    label: { en: "FSO district number", de: "BFS-Bezirksnummer", fr: "numéro OFS du district" },
    pattern: "[1-9][0-9]{2,3}",
    reserved: true,
  },
  {
    key: "bfs_municipality",
    label: {
      en: "FSO municipality number",
      de: "BFS-Gemeindenummer",
      fr: "numéro OFS de la commune",
      it: "numero UST del comune",
    },
    pattern: "[1-9][0-9]{0,3}",
    reserved: true,
  },
  {
    // The register's code for one territorial version of a commune; a new one
    // with every merger, territory exchange or change of district.
    key: "bfs_municipality_version",
    label: {
      en: "FSO historical municipality code",
      de: "BFS-Historisierungsnummer der Gemeinde",
    },
    pattern: "[1-9][0-9]{0,5}",
    reserved: true,
  },
  {
    key: "zurich_city_district",
    label: { en: "City of Zürich district (Kreis)", de: "Stadtkreis Zürich" },
    pattern: "[1-9]|1[0-2]",
    reserved: true,
  },
  {
    // The federal tax calculator's number for a locality (a postcode and place
    // within a commune), where the rates it applies depend on the locality.
    key: "estv_tax_location",
    label: {
      en: "Federal tax calculator locality",
      de: "Ortschaft im Steuerrechner der ESTV",
      fr: "localité du calculateur fiscal de l'AFC",
      it: "località del calcolatore fiscale dell'AFC",
    },
    pattern: "[1-9][0-9]{8}",
    reserved: true,
  },
  {
    key: "zurich_statistical_quarter",
    label: {
      en: "City of Zürich statistical quarter",
      de: "Statistisches Quartier Stadt Zürich",
    },
    pattern: "[1-9][0-9]{1,2}",
    reserved: true,
  },
  {
    // The two Landschaften the Constitution divides the country into (LR 101,
    // Art. 1), by the names it gives them in brackets and uses for the two
    // electoral districts (Art. 46). There is no numbered code for them.
    key: "li_landschaft",
    label: { en: "Liechtenstein region (Landschaft)", de: "Landschaft Liechtenstein" },
    pattern: "Oberland|Unterland",
    reserved: true,
  },
  {
    // The number swisstopo's official directory of localities gives each of
    // Liechtenstein's communes in its BFS-Nr column: 7001 Vaduz … 7011 Schellenberg.
    key: "li_municipality",
    label: {
      en: "Liechtenstein municipality number",
      de: "Gemeindenummer Liechtenstein",
    },
    pattern: "70(0[1-9]|1[01])",
    reserved: true,
  },
  {
    // Estonia's counties by their code in EHAK, the classification of Estonian
    // administrative units and settlements: 0037 Harju … 0087 Võru.
    key: "ee_county",
    label: { en: "Estonian county code (EHAK)", et: "Maakonna kood (EHAK)" },
    pattern: "00[0-9]{2}",
    reserved: true,
  },
  {
    // Estonia's municipalities (rural municipalities and cities) by their EHAK
    // code: 0784 Tallinn, 0793 Tartu linn.
    key: "ee_municipality",
    label: { en: "Estonian municipality code (EHAK)", et: "Omavalitsuse kood (EHAK)" },
    pattern: "0[1-9][0-9]{2}",
    reserved: true,
  },
  {
    // A country's subdivision by its ISO 3166-2 code: the country's ISO 3166-1
    // code, a hyphen and up to three letters or digits. A US state's is `US-`
    // and its postal code (US-WY), the code the law registry keys a state by.
    key: "iso_3166_2",
    label: { en: "ISO 3166-2 subdivision code", de: "Code der Unterteilung ISO 3166-2" },
    pattern: "[A-Z]{2}-[A-Z0-9]{1,3}",
    reserved: true,
  },
  {
    // A US state, or the District of Columbia, by its two-digit FIPS code
    // (ANSI INCITS 38), as the Census Bureau lists it: 01 Alabama … 56 Wyoming.
    // 60 and above are the outlying areas.
    key: "us_state_fips",
    label: { en: "State FIPS code", de: "FIPS-Code des Bundesstaats" },
    pattern: "0[1-9]|[1-4][0-9]|5[0-6]",
    reserved: true,
  },
  {
    // A US county or county equivalent by its five-digit FIPS code (ANSI
    // INCITS 31): the state's two digits, then the county's three, as the
    // Census Bureau lists it: 56021 Laramie County, Wyoming.
    key: "us_county_fips",
    label: { en: "County FIPS code", de: "FIPS-Code des County" },
    pattern: "(0[1-9]|[1-4][0-9]|5[0-6])[0-9]{3}",
    reserved: true,
  },
];

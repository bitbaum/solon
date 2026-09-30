import type { SourceInput } from "./schema";

/**
 * The source registry: one entry per dataset — publisher, licence, cadence and
 * the adapter that reads it (§8.2). Each importer's first task is to confirm
 * the access path, format and licence, then record them here.
 */
export const SOURCES: readonly SourceInput[] = [
  {
    // Confirmed 2026-09-29: CSV from the register's public API, no key;
    // opendata.swiss dataset "historisiertes-gemeindeverzeichnis-der-schweiz",
    // terms_open. Every unit valid on the date, with its validity and parent.
    key: "bfs-communes-snapshot",
    publisher: "Federal Statistical Office (FSO)",
    dataset: "Official commune register of Switzerland, historicised: snapshot on a date",
    homepage: "https://www.agvchapp.bfs.admin.ch/",
    licence: "LicenseRef-opendata-swiss-open",
    attribution: {
      en: "Federal Statistical Office (FSO), official commune register of Switzerland",
      de: "Bundesamt für Statistik (BFS), Amtliches Gemeindeverzeichnis der Schweiz",
      fr: "Office fédéral de la statistique (OFS), Répertoire officiel des communes de Suisse",
    },
    cadence: "0 4 2 * *",
    adapter: "bfs_communes_snapshot",
    options: {
      url: "https://www.agvchapp.bfs.admin.ch/api/communes/snapshot?date={date}",
      historyFrom: "2021-01-01",
      root: { scheme: "iso_3166_1", value: "CH" },
      levels: [
        { registerLevel: 1, level: "canton", scheme: "bfs_canton" },
        { registerLevel: 2, level: "district", scheme: "bfs_district" },
        {
          registerLevel: 3,
          level: "municipality",
          scheme: "bfs_municipality",
          versionScheme: "bfs_municipality_version",
        },
      ],
      // Cantons by FSO number, with the languages of their names in the order
      // the register lists a multilingual one ("Bern / Berne").
      include: {
        "1": ["de"],
        "2": ["de", "fr"],
        "3": ["de"],
        "4": ["de"],
        "5": ["de"],
        "6": ["de"],
        "7": ["de"],
        "8": ["de"],
        "9": ["de"],
        "10": ["fr", "de"],
        "11": ["de"],
        "12": ["de"],
        "13": ["de"],
        "14": ["de"],
        "15": ["de"],
        "16": ["de"],
        "17": ["de"],
        "18": ["de", "it", "rm"],
        "19": ["de"],
        "20": ["de"],
        "21": ["it"],
        "22": ["fr"],
        "23": ["fr", "de"],
        "24": ["fr"],
        "25": ["fr"],
        "26": ["fr"],
      },
    },
    packs: ["switzerland"],
  },
  {
    // Confirmed 2026-09-29: same API and terms. Imported after the snapshots,
    // so both ends of every merger since `historyFrom` are known places.
    key: "bfs-communes-mutations",
    publisher: "Federal Statistical Office (FSO)",
    dataset: "Official commune register of Switzerland, historicised: mutations",
    homepage: "https://www.agvchapp.bfs.admin.ch/",
    licence: "LicenseRef-opendata-swiss-open",
    attribution: {
      en: "Federal Statistical Office (FSO), official commune register of Switzerland",
      de: "Bundesamt für Statistik (BFS), Amtliches Gemeindeverzeichnis der Schweiz",
      fr: "Office fédéral de la statistique (OFS), Répertoire officiel des communes de Suisse",
    },
    cadence: "30 4 2 * *",
    adapter: "bfs_communes_mutations",
    options: {
      url: "https://www.agvchapp.bfs.admin.ch/api/communes/mutations?includeTerritoryExchange=false&startPeriod={from}&endPeriod={to}",
      historyFrom: "2021-01-01",
      scheme: "bfs_municipality",
    },
    packs: ["switzerland"],
  },
  {
    // Confirmed 2026-09-29: GeoJSON from the city's WFS, no key; dataset
    // "geo_statistische_quartiere" on data.stadt-zuerich.ch, CC0. 34 quarters
    // in 12 districts, each feature carrying its district.
    key: "zurich-statistical-quarters",
    publisher: "City of Zürich",
    dataset: "Statistische Quartiere",
    homepage: "https://data.stadt-zuerich.ch/dataset/geo_statistische_quartiere",
    licence: "CC0-1.0",
    attribution: {
      en: "City of Zürich, statistical quarters",
      de: "Stadt Zürich, Statistische Quartiere",
    },
    cadence: "0 4 15 1 *",
    adapter: "geojson_tiers",
    options: {
      url: "https://www.ogd.stadt-zuerich.ch/wfs/geoportal/Statistische_Quartiere?SERVICE=WFS&VERSION=1.1.0&REQUEST=GetFeature&TYPENAME=adm_statistische_quartiere_map&OUTPUTFORMAT=GeoJSON&SRSNAME=EPSG:4326",
      parent: { scheme: "bfs_municipality", value: "261" },
      locale: "de",
      tiers: [
        { level: "city_district", scheme: "zurich_city_district", code: "knr", name: "kname" },
        {
          level: "statistical_quarter",
          scheme: "zurich_statistical_quarter",
          code: "qnr",
          name: "qname",
        },
      ],
    },
    packs: ["switzerland"],
  },
  {
    // Confirmed 2026-09-29: opendata.swiss dataset
    // "steuerfusse-der-zurcher-gemeinden-fur-naturliche-und-juristische-personen",
    // terms_by. One row per commune and year since 2012. STF_O_KIRCHE1 is the
    // commune's multiplier without church tax; a commune whose school
    // communities levy different rates carries a second rate in STF_O_KIRCHE2,
    // and no single multiplier applies to all of it.
    key: "zurich-municipal-multipliers",
    publisher: "Canton of Zürich, Office for Statistics and Data",
    dataset: "Steuerfüsse der Zürcher Gemeinden – Zeitreihe",
    homepage:
      "https://opendata.swiss/de/dataset/steuerfusse-der-zurcher-gemeinden-fur-naturliche-und-juristische-personen",
    licence: "LicenseRef-opendata-swiss-by",
    attribution: {
      en: "Canton of Zürich, Office for Statistics and Data: municipal tax multipliers",
      de: "Kanton Zürich, Amt für Statistik und Daten: Gemeindesteuerfüsse",
    },
    cadence: "0 5 1 * *",
    adapter: "csv_facts",
    options: {
      url: "https://www.web.statistik.zh.ch/ogd/data/steuerfuesse/kanton_zuerich_stf_timeseries.csv",
      place: { scheme: "bfs_municipality", column: "BFSNR" },
      yearColumn: "YEAR",
      fromYear: 2021,
      facts: [{ metric: "tax.multiplier", column: "STF_O_KIRCHE1", divideBy: 100 }],
      skipUnless: [
        {
          column: "STF_O_KIRCHE2",
          equals: "0",
          reason: "the commune levies more than one rate; which applies depends on the address",
        },
      ],
    },
    packs: ["switzerland"],
  },
  {
    // Confirmed 2026-09-29: the tax calculator's "tax scales" export, one POST
    // per year for group 88 (every canton's main place, each row also carrying
    // the federal tariff). Tariffs are enacted law (DBG Art. 36, cantonal tax
    // acts), unprotected under Art. 5 URG. ESTV answers for unpublished years
    // with other years' figures, so the adapter asks the year range first.
    key: "estv-income-tax-scales",
    publisher: "Swiss Federal Tax Administration (ESTV)",
    dataset: "Tax calculator: tax scales",
    homepage: "https://swisstaxcalculator.estv.admin.ch/#/taxdata/tax-scales",
    licence: "LicenseRef-ch-official-act",
    attribution: {
      en: "Swiss Federal Tax Administration, tax calculator: tax scales",
      de: "Eidgenössische Steuerverwaltung, Steuerrechner: Steuertarife",
    },
    cadence: "0 5 2 * *",
    adapter: "estv_tax_scales",
    options: {
      url: "https://swisstaxcalculator.estv.admin.ch/delegate/ost-integration/v1/lg-proxy/operation/c3b67379_ESTV/API_exportManyTaxScales",
      yearRange: {
        url: "https://swisstaxcalculator.estv.admin.ch/delegate/ost-integration/v1/lg-proxy/operation/c3b67379_ESTV/API_getTaxYearRange",
        calculator: 1,
      },
      taxGroup: 88,
      fromYear: 2021,
      taxType: "EINKOMMENSSTEUER",
      targets: [
        {
          target: "BUND",
          metric: "tax.income.tariff",
          place: { scheme: "iso_3166_1", value: "CH" },
        },
        {
          target: "KANTON",
          metric: "tax.income.tariff.basic",
          cantons: { ZH: { scheme: "bfs_canton", value: "1" } },
        },
      ],
      // Single people with children are taxed on the married tariff; the model's
      // "single" is a single person without children.
      variants: [
        { variant: "single", group: "LEDIG_OHNE_KINDER" },
        { variant: "married", group: "VERHEIRATET" },
      ],
      everyVariantGroup: "ALLE",
      tableTypes: { BUND: "thresholds", ZUERICH: "widths" },
    },
    packs: ["switzerland"],
  },
  {
    // Confirmed 2026-09-29: the tax calculator's "simple rates" export for
    // group 88; IncomeRateCanton is the canton's own multiplier (Staatssteuerfuss).
    // Commune multipliers come from the cantons' own publications instead.
    key: "estv-canton-multipliers",
    publisher: "Swiss Federal Tax Administration (ESTV)",
    dataset: "Tax calculator: multipliers",
    homepage: "https://swisstaxcalculator.estv.admin.ch/#/taxdata/tax-rates",
    licence: "LicenseRef-ch-official-act",
    attribution: {
      en: "Swiss Federal Tax Administration, tax calculator: multipliers",
      de: "Eidgenössische Steuerverwaltung, Steuerrechner: Steuerfüsse",
    },
    cadence: "0 5 2 * *",
    adapter: "estv_simple_rates",
    options: {
      url: "https://swisstaxcalculator.estv.admin.ch/delegate/ost-integration/v1/lg-proxy/operation/c3b67379_ESTV/API_exportManySimpleRates",
      yearRange: {
        url: "https://swisstaxcalculator.estv.admin.ch/delegate/ost-integration/v1/lg-proxy/operation/c3b67379_ESTV/API_getTaxYearRange",
        calculator: 1,
      },
      taxGroup: 88,
      fromYear: 2021,
      field: "IncomeRateCanton",
      metric: "tax.multiplier",
      divideBy: 100,
      cantons: { ZH: { scheme: "bfs_canton", value: "1" } },
    },
    packs: ["switzerland"],
  },
  {
    // Confirmed 2026-09-30: a zipped, semicolon-separated CSV from the federal
    // geodata STAC catalogue, no key; its licence link is swisstopo's OGD
    // conditions (free use, the source must be named). Every postcode locality
    // with the commune it lies in and its share of the locality's addresses;
    // 1,223 of 3,190 postcodes span more than one commune.
    key: "swisstopo-postcode-localities",
    publisher: "Federal Office of Topography (swisstopo)",
    dataset: "Official directory of localities with postcodes",
    homepage:
      "https://www.swisstopo.admin.ch/en/official-directory-of-towns-and-cities-with-postcode-and-perimeter",
    licence: "LicenseRef-opendata-swiss-by",
    attribution: {
      en: "Federal Office of Topography swisstopo, official directory of localities",
      de: "Bundesamt für Landestopografie swisstopo, amtliches Ortschaftenverzeichnis",
      fr: "Office fédéral de topographie swisstopo, répertoire officiel des localités",
    },
    cadence: "0 4 3 * *",
    adapter: "csv_postcodes",
    options: {
      url: "https://data.geo.admin.ch/ch.swisstopo-vd.ortschaftenverzeichnis_plz/ortschaftenverzeichnis_plz/ortschaftenverzeichnis_plz_2056.csv.zip",
      postcode: "PLZ4",
      locality: "Ortschaftsname",
      place: { scheme: "bfs_municipality", column: "BFS-Nr" },
      share: { column: "Adressenanteil", divideBy: 100 },
      validFrom: "Validity",
      skipWhen: [
        {
          column: "Kantonskürzel",
          values: [""],
          reason: "a Liechtenstein commune; the directory covers both countries",
        },
        {
          column: "BFS-Nr",
          values: ["2391", "5391"],
          reason: "a commune-free area (Staatswald Galm, Comunanza Cadenazzo/Monteceneri)",
        },
      ],
    },
    packs: ["switzerland"],
  },
];

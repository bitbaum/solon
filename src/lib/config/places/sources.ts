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
];

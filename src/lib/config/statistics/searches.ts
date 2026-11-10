/**
 * Where Solon looked for a figure it does not have: for a series and a place, each publisher a person asked
 * on a stated day, what it holds for that place, and the address of what was read. A page with no figures
 * for a place says this instead of only "No figures", so a reader can tell "nobody publishes it" from "Solon
 * has not loaded it", and repeat the look.
 *
 * A record is a person's reading of the publishers on `checkedOn`, never a guess: an entry is added only
 * with an address a reader can open, and re-dated when it is read again. It is a stopgap beside the
 * statistics gaps (`/statistics/gaps`), which describe what each statistical office collects.
 */
import type { LocalizedText } from "../places/schema";

export type SearchResult =
  /** The publisher lists the place in this series and holds no value for any year. */
  | "series_empty"
  /** The publisher covers the place and publishes nothing for this measure. */
  | "not_published"
  /** The publisher does not cover the place at all. */
  | "not_covered"
  /** The publisher has no figure for this measure but publishes a nearby one, named in the note. */
  | "related";

export interface SearchedPublisher {
  publisher: string;
  /** What was read, as a reader can open it. */
  url: string;
  result: SearchResult;
  note: LocalizedText;
}

export interface StatisticSearch {
  /** Key of the metric (`economy.government.consumption`). */
  metric: string;
  /** What the series page calls the place in `?p=`: its ISO 3166-1 code. */
  place: string;
  placeName: LocalizedText;
  /** The day it was read. */
  checkedOn: string;
  looked: readonly SearchedPublisher[];
}

const LIECHTENSTEIN = { en: "Liechtenstein", de: "Liechtenstein" } as const;
const AFS_VGR =
  "https://www.statistikportal.li/de/themen/volkswirtschaft-und-preise/volkswirtschaftliche-gesamtrechnungen";
const AFS_FINANCES =
  "https://www.statistikportal.li/de/themen/staat-und-politik/oeffentliche-finanzen";
const OECD_MEMBERS = "https://www.oecd.org/en/about/members-partners.html";
const EUROSTAT_NAMA = "https://ec.europa.eu/eurostat/databrowser/view/nama_10_gdp/default/table";
const EUROSTAT_GOV = "https://ec.europa.eu/eurostat/databrowser/view/gov_10a_main/default/table";

const NOT_OECD: SearchedPublisher = {
  publisher: "OECD",
  url: OECD_MEMBERS,
  result: "not_covered",
  note: {
    en: "Liechtenstein is not one of the OECD's member countries, and the OECD's tax and government series cover its members.",
    de: "Liechtenstein gehört nicht zu den Mitgliedstaaten der OECD, und die Steuer- und Staatsreihen der OECD erfassen deren Mitglieder.",
  },
};

export const STATISTIC_SEARCHES: readonly StatisticSearch[] = [
  {
    metric: "economy.government.consumption",
    place: "LI",
    placeName: LIECHTENSTEIN,
    checkedOn: "2026-11-10",
    looked: [
      {
        publisher: "World Bank, World Development Indicators (NE.CON.GOVT.ZS)",
        url: "https://data.worldbank.org/indicator/NE.CON.GOVT.ZS?locations=LI",
        result: "series_empty",
        note: {
          en: "The series lists Liechtenstein for 1990 to 2026 and holds no value for any of those years.",
          de: "Die Reihe führt Liechtenstein für 1990 bis 2026 und enthält für kein dieser Jahre einen Wert.",
        },
      },
      {
        publisher: "Amt für Statistik, Volkswirtschaftliche Gesamtrechnung",
        url: AFS_VGR,
        result: "not_published",
        note: {
          en: "Publishes the production, income-generation and income-distribution accounts by sector (tables 301.103 to 301.105); none of them is an account of final consumption.",
          de: "Veröffentlicht das Produktions-, das Einkommensentstehungs- und das Einkommensverteilungskonto nach Sektor (Tabellen 301.103 bis 301.105); keines davon ist ein Konto des Konsums.",
        },
      },
      {
        publisher: "Eurostat, annual national accounts (nama_10_gdp, P3_S13)",
        url: EUROSTAT_NAMA,
        result: "not_published",
        note: {
          en: "Holds Liechtenstein's gross domestic product and no value for government final consumption expenditure.",
          de: "Enthält das Bruttoinlandsprodukt Liechtensteins, aber keinen Wert für die Konsumausgaben des Staates.",
        },
      },
      NOT_OECD,
    ],
  },
  {
    metric: "economy.government.expenditure",
    place: "LI",
    placeName: LIECHTENSTEIN,
    checkedOn: "2026-11-10",
    looked: [
      NOT_OECD,
      {
        publisher: "Eurostat, government finance statistics (gov_10a_main, TE)",
        url: EUROSTAT_GOV,
        result: "not_published",
        note: {
          en: "Holds no value for Liechtenstein's total government expenditure as a share of GDP.",
          de: "Enthält keinen Wert für die Gesamtausgaben des Staates Liechtensteins in Prozent des BIP.",
        },
      },
      {
        publisher: "Amt für Statistik, Öffentliche Finanzen (Finanzstatistik)",
        url: AFS_FINANCES,
        result: "related",
        note: {
          en: "Publishes the government's share of the economy for Liechtenstein itself (the Staatsquote) in its annual public finance statistics, for the state sector: national level, communes and public social insurance. Not yet loaded into Solon.",
          de: "Veröffentlicht die Staatsquote Liechtensteins in der jährlichen Finanzstatistik für den Staatssektor: Landesebene, Gemeindeebene und öffentliche Sozialversicherungen. Noch nicht in Solon geladen.",
        },
      },
    ],
  },
  {
    metric: "tax.revenue.general",
    place: "LI",
    placeName: LIECHTENSTEIN,
    checkedOn: "2026-11-10",
    looked: [
      NOT_OECD,
      {
        publisher: "Amt für Statistik, Öffentliche Finanzen (Finanzstatistik)",
        url: AFS_FINANCES,
        result: "related",
        note: {
          en: "Publishes the tax and social contribution share of GDP for Liechtenstein itself (the Fiskalquote) in its annual public finance statistics. Not yet loaded into Solon.",
          de: "Veröffentlicht die Fiskalquote Liechtensteins (Steuern und Sozialabgaben in Prozent des BIP) in der jährlichen Finanzstatistik. Noch nicht in Solon geladen.",
        },
      },
    ],
  },
];

/** The records for a series and the places a reader asked for (ISO codes, in any case). */
export function searchesFor(metric: string, requested: readonly string[]): StatisticSearch[] {
  const wanted = new Set(requested.map((c) => c.trim().toUpperCase()));
  return STATISTIC_SEARCHES.filter((s) => s.metric === metric && wanted.has(s.place));
}

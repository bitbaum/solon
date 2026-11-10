/**
 * What Solon reads from Eurostat's government finance statistics, and for
 * which countries. Derived from the taxonomies (./cofog.ts, ./revenue.ts):
 * every category is one series, so adding a category adds its metric, its
 * request and its place on every budget page, with nothing listed twice.
 */
import { budgetBalanceKey, budgetMetricKey } from "@/lib/budgets/scopes";
import type { Taxonomy } from "@/lib/budgets/taxonomy";
import { COFOG } from "./cofog";
import { ESA_REVENUE } from "./revenue";
import { GENERAL_GOVERNMENT } from "./scopes";

export const EUROSTAT_PUBLISHER = "Eurostat";
export const EUROSTAT_API = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data";
export const eurostatBrowserUrl = (dataset: string) =>
  `https://ec.europa.eu/eurostat/databrowser/view/${dataset}/default/table`;

/** The first year read: ESA 2010 series start in 1995. */
export const EUROSTAT_FROM_YEAR = 1995;

/** Countries Eurostat publishes general government finance for, by ISO 3166-1 code, with its own code where it differs. */
export const EUROSTAT_GOV_COUNTRIES: Readonly<Record<string, string>> = {
  AT: "AT",
  BE: "BE",
  BG: "BG",
  CH: "CH",
  CY: "CY",
  CZ: "CZ",
  DE: "DE",
  DK: "DK",
  EE: "EE",
  GR: "EL",
  ES: "ES",
  FI: "FI",
  FR: "FR",
  HR: "HR",
  HU: "HU",
  IE: "IE",
  IS: "IS",
  IT: "IT",
  LT: "LT",
  LU: "LU",
  LV: "LV",
  MT: "MT",
  NL: "NL",
  NO: "NO",
  PL: "PL",
  PT: "PT",
  RO: "RO",
  SE: "SE",
  SI: "SI",
  SK: "SK",
};

export interface EurostatRequest {
  dataset: string;
  /** The dimension whose codes are the categories; every other dimension is fixed by `filters`. */
  dimension: string;
  filters: Readonly<Record<string, string>>;
  taxonomy: Taxonomy;
  /** Series read beside the taxonomy's own, by code. */
  extra: readonly { code: string; metric: string }[];
}

/** In per cent of GDP: comparable across countries and currencies without a rate of exchange. */
const PER_CENT_OF_GDP = { unit: "PC_GDP", sector: "S13" } as const;

export const EUROSTAT_REQUESTS: readonly EurostatRequest[] = [
  {
    dataset: "gov_10a_exp",
    dimension: "cofog99",
    filters: { ...PER_CENT_OF_GDP, na_item: "TE" },
    taxonomy: COFOG,
    extra: [],
  },
  {
    dataset: "gov_10a_main",
    dimension: "na_item",
    filters: PER_CENT_OF_GDP,
    taxonomy: ESA_REVENUE,
    extra: [{ code: "B9", metric: budgetBalanceKey(GENERAL_GOVERNMENT.key) }],
  },
];

/** Every series of a request: each category of its taxonomy, then the extras. */
export const seriesOf = (r: EurostatRequest) => [
  ...r.taxonomy.categories.map((c) => ({
    code: c.code,
    metric: budgetMetricKey(GENERAL_GOVERNMENT.key, r.taxonomy, c.code),
  })),
  ...r.extra,
];

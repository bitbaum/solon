/**
 * Testland — a made-up country that exists only in tests. It is the P0
 * acceptance test of the Places design (§11): if the engine needs a single
 * line changed to hold Testland, the engine knows too much.
 *
 * Nothing here is shaped after a real country on purpose. The hamlet level
 * plays Witikon's part — part of a parish, and taking no tax — because no
 * component of the tax model reads it.
 */
import {
  definePlacesConfig,
  type CountryPackInput,
  type IdentifierSchemeInput,
  type MetricInput,
  type PlacesConfig,
  type SourceInput,
} from "@/lib/config/places/schema";
import type { TaxModel } from "@/lib/tax-model";

export const TESTLAND_TAX: TaxModel = {
  schemaVersion: 1,
  base: "taxable_income",
  inputs: ["taxable_income", "guild_member"],
  variants: ["alone", "together"],
  components: [
    { key: "crown", tariff: { level: "realm", metric: "test.income.tariff" } },
    {
      key: "shire_and_parish",
      tariff: { level: "shire", metric: "test.income.tariff.basic" },
      multipliers: [
        { level: "shire", metric: "test.multiplier" },
        { level: "parish", metric: "test.multiplier" },
        { level: "guild", metric: "test.multiplier", when: "guild_member" },
      ],
    },
  ],
};

export const TESTLAND_PACK = {
  key: "testland",
  names: { en: "Testland", de: "Testland" },
  currency: "XTS",
  fiscalYear: { startMonthDay: "04-01" },
  defaultLocales: ["en"],
  slug: { strategy: "official-name", transliterate: true },
  levels: [
    { key: "realm", parent: null, names: { en: "Realm", de: "Reich" } },
    { key: "shire", parent: "realm", names: { en: "Shire", de: "Grafschaft" } },
    { key: "parish", parent: "shire", names: { en: "Parish", de: "Gemeinde" } },
    {
      key: "hamlet",
      parent: "parish",
      coverage: "partial",
      names: { en: "Hamlet", de: "Weiler" },
    },
    { key: "guild", parent: null, overlaps: "parish", names: { en: "Guild", de: "Zunft" } },
  ],
  identifierSchemes: ["testland_register", "testland_hamlet"],
  sources: ["testland-register"],
  taxModel: TESTLAND_TAX,
} satisfies CountryPackInput;

export const TESTLAND_SCHEMES = [
  {
    key: "testland_register",
    label: { en: "Testland register number" },
    pattern: "T[0-9]{3}",
    urlTemplate: "https://register.testland.invalid/{value}",
    reserved: true,
  },
  {
    key: "testland_hamlet",
    label: { en: "Hamlet code" },
    pattern: "[a-z]+",
    reserved: false,
  },
] satisfies IdentifierSchemeInput[];

export const TESTLAND_METRICS = [
  {
    key: "test.income.tariff",
    label: { en: "Crown income tariff" },
    valueType: "tariff",
    unit: "currency",
  },
  {
    key: "test.income.tariff.basic",
    label: { en: "Basic shire tariff" },
    valueType: "tariff",
    unit: "currency",
  },
  {
    key: "test.multiplier",
    label: { en: "Multiplier" },
    valueType: "number",
    unit: "ratio",
    plausible: { min: 0, max: 5 },
  },
] satisfies MetricInput[];

export const TESTLAND_SOURCES = [
  {
    key: "testland-register",
    publisher: "Testland Office of Registers",
    dataset: "Register of places and rates",
    homepage: "https://register.testland.invalid/",
    licence: "CC0-1.0",
    cadence: "0 3 1 * *",
    adapter: "fixture",
    packs: ["testland"],
  },
] satisfies SourceInput[];

/** Solon's config with Testland added — what a contributed pack amounts to. */
export function withTestland(base: PlacesConfig): PlacesConfig {
  return definePlacesConfig({
    ...base,
    packs: [...base.packs, TESTLAND_PACK],
    sources: [...base.sources, ...TESTLAND_SOURCES],
    metrics: [...base.metrics, ...TESTLAND_METRICS],
    identifierSchemes: [...base.identifierSchemes, ...TESTLAND_SCHEMES],
  });
}

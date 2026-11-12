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
  type InstrumentKindInput,
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
  instrumentKinds: ["testland_moot", "testland_toll"],
  taxModel: TESTLAND_TAX,
  taxLabels: {
    inputs: {
      taxable_income: { label: { en: "Income", de: "Einkommen" } },
      guild_member: { label: { en: "Guild member" } },
    },
    variants: { alone: { en: "Alone" }, together: { en: "Together" } },
    components: { crown: { en: "Crown tax" }, shire_and_parish: { en: "Shire and parish tax" } },
    excludes: { en: "Not included: the tithe." },
  },
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

export const TESTLAND_INSTRUMENT_KINDS = [
  { key: "testland_moot", label: { en: "Speak at the moot", de: "Am Thing sprechen" } },
  { key: "testland_toll", label: { en: "Pay the toll" } },
] satisfies InstrumentKindInput[] as InstrumentKindInput[];

/**
 * Quuxland: a made-up country the world pack holds until a pack of its own is added, for the
 * handover (importer: "Places another pack holds"). Known by a user-assigned ISO code.
 */
export const QUUXLAND_PACK = {
  key: "quuxland",
  names: { en: "Quuxland" },
  currency: "XTS",
  fiscalYear: { startMonthDay: "01-01" },
  defaultLocales: ["en"],
  slug: { strategy: "official-name", transliterate: true },
  levels: [
    { key: "nation", parent: null, names: { en: "Nation" } },
    { key: "province", parent: "nation", names: { en: "Province" } },
  ],
  identifierSchemes: ["iso_3166_1", "iso_3166_2"],
  instrumentKinds: [],
} satisfies CountryPackInput;

const FIXTURE_SOURCE = {
  licence: "CC0-1.0",
  cadence: "0 3 1 * *",
  adapter: "fixture",
} as const;

export const TESTLAND_SOURCES = [
  {
    key: "testland-register",
    publisher: "Testland Office of Registers",
    dataset: "Register of places and rates",
    homepage: "https://register.testland.invalid/",
    ...FIXTURE_SOURCE,
    packs: ["testland"],
  },
  {
    key: "quuxland-register",
    publisher: "Quuxland Office of Registers",
    dataset: "Register of places",
    homepage: "https://register.quuxland.invalid/",
    ...FIXTURE_SOURCE,
    packs: ["quuxland"],
  },
  {
    key: "testland-world",
    publisher: "Test world register",
    dataset: "Countries and subdivisions",
    homepage: "https://world.testland.invalid/",
    ...FIXTURE_SOURCE,
    packs: ["world"],
  },
] satisfies SourceInput[];

/** Solon's config with Testland added — what a contributed pack amounts to. */
export function withTestland(base: PlacesConfig): PlacesConfig {
  return definePlacesConfig({
    ...base,
    // A pack's sources are computed from the sources that name it: the base's are recomputed with
    // the test sources, one of which serves the world pack.
    packs: [...base.packs.map((p) => ({ ...p, sources: [] })), TESTLAND_PACK, QUUXLAND_PACK],
    sources: [...base.sources, ...TESTLAND_SOURCES],
    metrics: [...base.metrics, ...TESTLAND_METRICS],
    identifierSchemes: [...base.identifierSchemes, ...TESTLAND_SCHEMES],
    instrumentKinds: [...base.instrumentKinds, ...TESTLAND_INSTRUMENT_KINDS],
  });
}

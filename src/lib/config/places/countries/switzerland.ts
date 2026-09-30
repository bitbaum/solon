import type { TaxModel } from "@/lib/tax-model";
import type { CountryPackInput, TaxLabels } from "../schema";

/**
 * Swiss income tax on taxable income: the federal tariff, plus the canton's
 * basic tariff times the sum of the canton's and the commune's multipliers
 * (Steuerfüsse). Where a canton splits a couple's income, its basic tariff
 * reads the income divided by the canton's divisor for the variant (1 where
 * nothing is divided, 2 for full splitting), and the amount is multiplied back. Church tax is not modelled yet: the register publishes its
 * multipliers per denomination, and which parish levies it is not imported,
 * so a church component waits for the parishes (§6.1). Nor are fixed per-head
 * taxes (Zürich's CHF 24, Lucerne's CHF 50): schema version 1 has no fixed amount.
 */
export const switzerlandIncomeTax = {
  schemaVersion: 2,
  base: "taxable_income",
  inputs: ["taxable_income"],
  variants: ["single", "married"],
  components: [
    { key: "federal", tariff: { level: "nation", metric: "tax.income.tariff" } },
    {
      key: "cantonal_and_communal",
      tariff: { level: "canton", metric: "tax.income.tariff.basic" },
      divisor: { level: "canton", metric: "tax.income.divisor" },
      multipliers: [
        { level: "canton", metric: "tax.multiplier" },
        { level: "municipality", metric: "tax.multiplier" },
      ],
    },
  ],
} as const satisfies TaxModel;

/**
 * The married tariff also applies to a single parent living with their
 * children, federally (DBG Art. 36) and in the cantons imported so far.
 */
const switzerlandTaxLabels: TaxLabels = {
  inputs: {
    taxable_income: {
      label: {
        en: "Taxable income",
        de: "Steuerbares Einkommen",
        fr: "Revenu imposable",
        it: "Reddito imponibile",
      },
      hint: {
        en: "After deductions, as on your tax return; not your gross salary.",
        de: "Nach den Abzügen, wie in der Steuererklärung; nicht der Bruttolohn.",
        fr: "Après les déductions, comme dans la déclaration d'impôt ; pas le salaire brut.",
        it: "Dopo le deduzioni, come nella dichiarazione d'imposta; non il salario lordo.",
      },
    },
  },
  variants: {
    single: {
      en: "Single, no children at home",
      de: "Alleinstehend, ohne Kinder im Haushalt",
      fr: "Seul·e, sans enfants dans le ménage",
      it: "Solo, senza figli nell'economia domestica",
    },
    married: {
      en: "Married, or with children at home",
      de: "Verheiratet oder mit Kindern im Haushalt",
      fr: "Marié·e, ou avec enfants dans le ménage",
      it: "Coniugati, o con figli nell'economia domestica",
    },
  },
  components: {
    federal: {
      en: "Federal income tax",
      de: "Direkte Bundessteuer",
      fr: "Impôt fédéral direct",
      it: "Imposta federale diretta",
    },
    cantonal_and_communal: {
      en: "Cantonal and communal tax",
      de: "Staats- und Gemeindesteuer",
      fr: "Impôts cantonal et communal",
      it: "Imposte cantonale e comunale",
    },
  },
  // The income the golden fixtures check against the federal calculator.
  exampleBase: 100_000,
  excludes: {
    en: "Not included: church tax, wealth tax and fixed per-head taxes, such as CHF 24 a person in Zürich or CHF 50 in Lucerne.",
    de: "Nicht enthalten: Kirchensteuer, Vermögenssteuer und feste Kopfsteuern, etwa CHF 24 pro Person in Zürich oder CHF 50 in Luzern.",
    fr: "Non compris : impôt ecclésiastique, impôt sur la fortune et impôts par tête, comme CHF 24 par personne à Zurich ou CHF 50 à Lucerne.",
    it: "Non incluse: imposta di culto, imposta sulla sostanza e imposte pro capite, come CHF 24 a persona a Zurigo o CHF 50 a Lucerna.",
  },
};

export const switzerland: CountryPackInput = {
  key: "switzerland",
  names: {
    de: "Schweiz",
    fr: "Suisse",
    it: "Svizzera",
    rm: "Svizra",
    en: "Switzerland",
  },
  currency: "CHF",
  region: "CH",
  fiscalYear: { startMonthDay: "01-01" },
  defaultLocales: ["de", "fr", "it", "rm"],
  slug: { strategy: "official-name", transliterate: true },
  levels: [
    {
      key: "nation",
      parent: null,
      names: {
        en: "Confederation",
        de: "Bund",
        fr: "Confédération",
        it: "Confederazione",
        rm: "Confederaziun",
      },
    },
    {
      key: "canton",
      parent: "nation",
      names: { en: "Canton", de: "Kanton", fr: "canton", it: "cantone", rm: "chantun" },
    },
    {
      // Cantons without districts appear in the register with one district of
      // their own name, so every commune has a district above it.
      key: "district",
      parent: "canton",
      names: { en: "District", de: "Bezirk", fr: "district", it: "distretto", rm: "district" },
    },
    {
      key: "municipality",
      parent: "district",
      names: {
        en: "Municipality",
        de: "Gemeinde",
        fr: "commune",
        it: "comune",
        rm: "vischnanca",
      },
    },
    {
      key: "city_district",
      parent: "municipality",
      coverage: "partial",
      names: {
        en: "City district",
        de: "Stadtkreis",
        fr: "arrondissement",
        it: "circoscrizione",
      },
    },
    {
      key: "statistical_quarter",
      parent: "city_district",
      coverage: "partial",
      names: {
        en: "Statistical quarter",
        de: "Statistisches Quartier",
        fr: "quartier statistique",
        it: "quartiere statistico",
      },
    },
  ],
  identifierSchemes: [
    "iso_3166_1",
    "bfs_canton",
    "bfs_district",
    "bfs_municipality",
    "bfs_municipality_version",
    "zurich_city_district",
    "zurich_statistical_quarter",
  ],
  postcodePattern: "[1-9][0-9]{3}",
  // Confirmed 2026-09-30: the federal geoportal's search, open to any origin
  // (CORS *), no key; results carry WGS84 coordinates.
  addressSearch: {
    format: "geoadmin_search",
    url: "https://api3.geo.admin.ch/rest/services/api/SearchServer",
    provider: "swisstopo (geo.admin.ch)",
  },
  sources: [
    "bfs-communes-snapshot",
    "bfs-communes-mutations",
    "zurich-statistical-quarters",
    "zurich-municipal-multipliers",
    "estv-income-tax-scales",
    "estv-canton-multipliers",
    "estv-commune-multipliers",
    "swisstopo-postcode-localities",
    "swisstopo-commune-boundaries",
  ],
  taxModel: switzerlandIncomeTax,
  taxLabels: switzerlandTaxLabels,
};

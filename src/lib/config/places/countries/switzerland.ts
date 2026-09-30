import type { TaxModel } from "@/lib/tax-model";
import type { CountryPackInput, TaxLabels } from "../schema";

/**
 * Swiss income tax on taxable income: the federal tariff, plus the canton's
 * basic tariff times the sum of the canton's and the commune's multipliers
 * (Steuerfüsse). Church tax is not modelled yet: the register publishes its
 * multipliers per denomination, and which parish levies it is not imported,
 * so a church component waits for the parishes (§6.1). Nor are fixed per-head
 * taxes (Zürich's CHF 24 Personalsteuer): schema version 1 has no fixed amount.
 */
export const switzerlandIncomeTax = {
  schemaVersion: 1,
  base: "taxable_income",
  inputs: ["taxable_income"],
  variants: ["single", "married"],
  components: [
    { key: "federal", tariff: { level: "nation", metric: "tax.income.tariff" } },
    {
      key: "cantonal_and_communal",
      tariff: { level: "canton", metric: "tax.income.tariff.basic" },
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
  excludes: {
    en: "Not included: church tax, wealth tax and fixed per-head taxes such as Zürich's CHF 24 personal tax.",
    de: "Nicht enthalten: Kirchensteuer, Vermögenssteuer und feste Kopfsteuern wie Zürichs Personalsteuer von CHF 24.",
    fr: "Non compris : impôt ecclésiastique, impôt sur la fortune et impôts par tête comme l'impôt personnel zurichois de CHF 24.",
    it: "Non incluse: imposta di culto, imposta sulla sostanza e imposte pro capite come l'imposta personale zurighese di CHF 24.",
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
  sources: [
    "bfs-communes-snapshot",
    "bfs-communes-mutations",
    "zurich-statistical-quarters",
    "zurich-municipal-multipliers",
    "estv-income-tax-scales",
    "estv-canton-multipliers",
    "swisstopo-postcode-localities",
  ],
  taxModel: switzerlandIncomeTax,
  taxLabels: switzerlandTaxLabels,
};

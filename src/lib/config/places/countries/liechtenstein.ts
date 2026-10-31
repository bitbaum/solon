import type { TaxModel } from "@/lib/tax-model";
import type { CountryPackInput, TaxLabels } from "../schema";

/**
 * Liechtenstein's tax on income and wealth (SteG, LR 640.0). Wealth is not
 * taxed on its own: a yield the law assumes on it (the Sollertrag, 4 %) is
 * added to income, and the country's tariff applies to the sum (art. 5,
 * art. 14 para. 2 l, art. 19). Wealth is rounded down to CHF 100 before the
 * yield is taken, and the income to CHF 10 (art. 18 para. 1). Each commune
 * levies a surcharge on the country's tax, in percent of it, set every year by
 * its council between 150 % and 250 % (art. 75). There is no church tax on
 * income. The tariff states the tax for a single person and for a couple
 * taxed together; the single parent's own tariff (art. 19 para. 1 b) is not
 * offered, as the Swiss model offers no children either.
 */
export const liechtensteinIncomeTax = {
  schemaVersion: 10,
  base: "taxable_income",
  inputs: ["taxable_income", "taxable_wealth"],
  variants: ["single", "married"],
  components: [
    {
      key: "national",
      tariff: { level: "nation", metric: "tax.income.tariff" },
      adds: [
        {
          input: "taxable_wealth",
          scaledBy: { level: "nation", metric: "tax.wealth.yield" },
          rounding: 100,
        },
      ],
    },
    {
      key: "communal",
      tariff: { level: "nation", metric: "tax.income.tariff" },
      adds: [
        {
          input: "taxable_wealth",
          scaledBy: { level: "nation", metric: "tax.wealth.yield" },
          rounding: 100,
        },
      ],
      multipliers: [{ level: "municipality", metric: "tax.multiplier" }],
    },
  ],
} as const satisfies TaxModel;

const liechtensteinTaxLabels: TaxLabels = {
  inputs: {
    taxable_income: {
      label: {
        en: "Taxable income",
        de: "Steuerpflichtiger Erwerb",
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
    taxable_wealth: {
      label: {
        en: "Taxable wealth (optional)",
        de: "Steuerpflichtiges Vermögen (optional)",
        fr: "Fortune imposable (facultatif)",
        it: "Sostanza imponibile (facoltativo)",
      },
      hint: {
        en: "After debts are taken off; 4 % of it is taxed as income.",
        de: "Nach Abzug der Schulden; 4 % davon werden als Erwerb besteuert.",
        fr: "Après déduction des dettes ; 4 % en sont imposés comme revenu.",
        it: "Dopo la deduzione dei debiti; il 4 % è tassato come reddito.",
      },
    },
  },
  choices: {},
  variants: {
    single: {
      en: "Single, no children at home",
      de: "Alleinstehend, ohne Kinder im Haushalt",
      fr: "Seul·e, sans enfants dans le ménage",
      it: "Solo, senza figli nell'economia domestica",
    },
    married: {
      en: "Married, taxed together",
      de: "Verheiratet, gemeinsam veranlagt",
      fr: "Marié·e, imposés ensemble",
      it: "Coniugati, tassati insieme",
    },
  },
  components: {
    national: {
      en: "National tax",
      de: "Landessteuer",
      fr: "Impôt national",
      it: "Imposta nazionale",
    },
    communal: {
      en: "Communal surcharge",
      de: "Gemeindezuschlag",
      fr: "Supplément communal",
      it: "Supplemento comunale",
    },
  },
  rate: {
    yours: {
      en: "{rate} of your taxable income",
      de: "{rate} Ihres steuerpflichtigen Erwerbs",
      fr: "{rate} de votre revenu imposable",
      it: "{rate} del tuo reddito imponibile",
    },
    example: {
      en: "{rate} of an example taxable income of {amount}",
      de: "{rate} eines steuerpflichtigen Beispielerwerbs von {amount}",
      fr: "{rate} d’un revenu imposable d’exemple de {amount}",
      it: "{rate} di un reddito imponibile d’esempio di {amount}",
    },
  },
  exampleBase: 100_000,
  excludes: {
    en: "Capital payments, the single parent's tariff and income taxed at source are not included.",
    de: "Kapitalleistungen, der Tarif für Alleinerziehende und an der Quelle besteuerter Erwerb sind nicht enthalten.",
    fr: "Les prestations en capital, le barème des parents seuls et le revenu imposé à la source ne sont pas inclus.",
    it: "Le prestazioni in capitale, la tariffa per le famiglie monoparentali e il reddito tassato alla fonte non sono inclusi.",
  },
};

/**
 * The Principality of Liechtenstein: the nation, its two Landschaften and its
 * eleven communes. The Constitution makes the country "a union of two
 * Landschaften with eleven communes" and lists which communes form each
 * (Verfassung, LR 101, Art. 1); the Landschaften are also its two electoral
 * districts (Art. 46), so every commune lies in exactly one and the level is
 * full, not partial.
 *
 * Its tax: `liechtensteinIncomeTax` above, read from the country's tariff
 * (`li-income-tax`) and each commune's surcharge (`li-communal-surcharges`).
 */
export const liechtenstein: CountryPackInput = {
  key: "liechtenstein",
  names: {
    de: "Liechtenstein",
    en: "Liechtenstein",
    fr: "Liechtenstein",
    it: "Liechtenstein",
  },
  currency: "CHF",
  region: "LI",
  fiscalYear: { startMonthDay: "01-01" },
  defaultLocales: ["de"],
  slug: { strategy: "official-name", transliterate: true },
  levels: [
    {
      key: "nation",
      parent: null,
      names: { en: "Principality", de: "Fürstentum", fr: "Principauté", it: "Principato" },
    },
    {
      // Oberland (Landschaft Vaduz) and Unterland (Landschaft Schellenberg).
      key: "landschaft",
      parent: "nation",
      names: { en: "Region", de: "Landschaft", fr: "région", it: "regione" },
    },
    {
      key: "municipality",
      parent: "landschaft",
      names: { en: "Municipality", de: "Gemeinde", fr: "commune", it: "comune" },
    },
  ],
  identifierSchemes: ["iso_3166_1", "li_landschaft", "li_municipality"],
  // Every Liechtenstein postcode in swisstopo's directory lies in 9485–9498;
  // no Swiss postcode starts 948 or 949.
  postcodePattern: "94[89][0-9]",
  sources: [
    "li-constitution-communes",
    "swisstopo-postcode-localities-li",
    "li-income-tax",
    "li-communal-surcharges",
    "li-communal-tax-steps",
  ],
  instrumentKinds: ["tax_return", "tax_payment", "tax_deadline_extension"],
  taxModel: liechtensteinIncomeTax,
  taxLabels: liechtensteinTaxLabels,
};

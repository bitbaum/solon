import type { TaxModel } from "@/lib/tax-model";
import type { CountryPackInput, TaxLabels } from "../schema";

/**
 * Income tax in the United States: the federal income tax, plus the income
 * tax of the state a person lives in. Each is a tariff of its own level; the
 * evaluator adds them. Two variants, the two filing statuses most returns
 * use: single, and married filing jointly.
 *
 * Federal (`us-federal-income-tax`): the rate schedules of IRC § 1(j)(2)(A)
 * and (C) and the standard deduction of § 63(c)(2), as Rev. Proc. 2025-32
 * adjusts them for 2026. The model reads income before the standard
 * deduction, so each tariff's steps are the schedule's, moved up by that
 * status's standard deduction: nothing is taxed below it. The steps state
 * the tax at their start, as the schedule does.
 *
 * State: a tariff each state publishes at the state level. A state with no
 * income tax records a rate of zero (Wyoming, `wy-income-tax`: W.S.
 * 39-12-101 keeps the field to the state, which levies none, so its counties
 * and towns levy none either), and its places are estimated in full; a state
 * whose tariff is not recorded yet leaves the estimate incomplete rather
 * than reading as zero. Local income taxes, where a state allows them, are
 * not modelled yet.
 */
export const unitedStatesIncomeTax = {
  schemaVersion: 10,
  base: "adjusted_gross_income",
  inputs: ["adjusted_gross_income"],
  variants: ["single", "married"],
  components: [
    { key: "federal", tariff: { level: "nation", metric: "tax.income.tariff" } },
    { key: "state", tariff: { level: "state", metric: "tax.income.tariff" } },
  ],
} as const satisfies TaxModel;

const unitedStatesTaxLabels: TaxLabels = {
  inputs: {
    adjusted_gross_income: {
      label: {
        en: "Adjusted gross income",
        de: "Bereinigtes Bruttoeinkommen (AGI)",
        fr: "Revenu brut ajusté (AGI)",
        it: "Reddito lordo rettificato (AGI)",
      },
      hint: {
        en: "Line 11 of Form 1040: income after adjustments such as retirement contributions, before the standard deduction, which is taken off here.",
        de: "Zeile 11 des Formulars 1040: das Einkommen nach Abzügen wie Vorsorgebeiträgen, vor dem Standardabzug, der hier abgezogen wird.",
        fr: "Ligne 11 du formulaire 1040 : le revenu après les ajustements comme les cotisations de retraite, avant la déduction forfaitaire, déduite ici.",
        it: "Riga 11 del modulo 1040: il reddito dopo le rettifiche come i contributi pensionistici, prima della deduzione standard, che viene dedotta qui.",
      },
    },
  },
  choices: {},
  variants: {
    single: {
      en: "Single",
      de: "Alleinstehend",
      fr: "Célibataire",
      it: "Single",
    },
    married: {
      en: "Married, filing jointly",
      de: "Verheiratet, gemeinsame Erklärung",
      fr: "Marié·e, déclaration commune",
      it: "Coniugati, dichiarazione congiunta",
    },
  },
  components: {
    federal: {
      en: "Federal income tax",
      de: "Bundeseinkommensteuer",
      fr: "Impôt fédéral sur le revenu",
      it: "Imposta federale sul reddito",
    },
    state: {
      en: "State income tax",
      de: "Einkommensteuer des Bundesstaats",
      fr: "Impôt sur le revenu de l’État",
      it: "Imposta statale sul reddito",
    },
  },
  rate: {
    yours: {
      en: "{rate} of your adjusted gross income",
      de: "{rate} Ihres bereinigten Bruttoeinkommens",
      fr: "{rate} de votre revenu brut ajusté",
      it: "{rate} del tuo reddito lordo rettificato",
    },
    example: {
      en: "{rate} of an example adjusted gross income of {amount}",
      de: "{rate} eines bereinigten Beispiel-Bruttoeinkommens von {amount}",
      fr: "{rate} d’un revenu brut ajusté d’exemple de {amount}",
      it: "{rate} di un reddito lordo rettificato d’esempio di {amount}",
    },
  },
  exampleBase: 75_000,
  excludes: {
    en: "Social Security and Medicare taxes (FICA) and self-employment tax, tax credits such as the child tax credit and the earned income credit, itemized deductions, the extra standard deduction at 65 or for blindness, the deductions for seniors, tips, overtime and car loan interest, the lower rates on long-term capital gains and qualified dividends, the alternative minimum tax, the head of household and married filing separately statuses, and local income taxes are not included. The IRS tax table, which most returns below 100,000 dollars use, rounds income to steps of 50 dollars; this estimate does not.",
    de: "Sozialversicherungs- und Medicare-Abgaben (FICA) und die Steuer auf selbständige Erwerbstätigkeit, Steuergutschriften wie der Child Tax Credit und der Earned Income Credit, Einzelabzüge statt des Standardabzugs, der zusätzliche Standardabzug ab 65 oder bei Blindheit, die Abzüge für Senioren, Trinkgelder, Überstunden und Autokreditzinsen, die tieferen Sätze auf langfristigen Kapitalgewinnen und qualifizierten Dividenden, die Alternative Minimum Tax, die Status «Head of Household» und «getrennte Erklärung» sowie lokale Einkommensteuern sind nicht enthalten. Die Steuertabelle der IRS, die die meisten Erklärungen unter 100’000 Dollar verwenden, rundet das Einkommen auf Stufen von 50 Dollar; diese Schätzung nicht.",
    fr: "Les cotisations de sécurité sociale et Medicare (FICA) et l’impôt sur le travail indépendant, les crédits d’impôt comme le crédit pour enfants et le crédit sur le revenu gagné, les déductions détaillées, la déduction forfaitaire supplémentaire dès 65 ans ou pour cécité, les déductions pour les aînés, les pourboires, les heures supplémentaires et les intérêts de crédit automobile, les taux réduits sur les gains en capital à long terme et les dividendes qualifiés, l’impôt minimum de remplacement, les statuts de chef de famille et de déclaration séparée, ainsi que les impôts locaux sur le revenu ne sont pas inclus. La table d’impôt de l’IRS, utilisée par la plupart des déclarations sous 100 000 dollars, arrondit le revenu par paliers de 50 dollars ; cette estimation non.",
    it: "I contributi per la sicurezza sociale e Medicare (FICA) e l’imposta sul lavoro autonomo, i crediti d’imposta come il credito per i figli e l’earned income credit, le deduzioni analitiche, la deduzione standard supplementare dai 65 anni o per cecità, le deduzioni per anziani, mance, straordinari e interessi sui prestiti auto, le aliquote ridotte su plusvalenze a lungo termine e dividendi qualificati, l’imposta minima alternativa, gli status di capofamiglia e di dichiarazione separata e le imposte locali sul reddito non sono inclusi. La tabella d’imposta dell’IRS, usata dalla maggior parte delle dichiarazioni sotto i 100 000 dollari, arrotonda il reddito a scaglioni di 50 dollari; questa stima no.",
  },
};

/**
 * The United States: the nation, its fifty states and the District of
 * Columbia (which the Census Bureau lists among the states, and which is
 * therefore at the state level), and their counties, by FIPS code. Every
 * state is divided into counties or their equivalents (parishes, boroughs,
 * independent cities), so the county level is full; the counties of a state
 * arrive with its data (`scripts/places-us-census.ts`), Wyoming's first.
 *
 * Its tax: `unitedStatesIncomeTax` above, read from the IRS's revenue
 * procedure for the year (`us-federal-income-tax`) and each state's own
 * (`wy-income-tax`).
 */
export const unitedStates: CountryPackInput = {
  key: "united_states",
  names: {
    en: "United States",
    de: "Vereinigte Staaten",
    fr: "États-Unis",
    it: "Stati Uniti",
  },
  currency: "USD",
  region: "US",
  fiscalYear: { startMonthDay: "01-01" },
  defaultLocales: ["en"],
  slug: { strategy: "official-name", transliterate: true },
  levels: [
    {
      key: "nation",
      parent: null,
      names: { en: "Federation", de: "Bund", fr: "Fédération", it: "Federazione" },
    },
    {
      key: "state",
      parent: "nation",
      names: { en: "State", de: "Bundesstaat", fr: "État", it: "Stato" },
    },
    {
      key: "county",
      parent: "state",
      names: { en: "County", de: "County", fr: "comté", it: "contea" },
    },
  ],
  identifierSchemes: ["iso_3166_1", "iso_3166_2", "us_state_fips", "us_county_fips"],
  sources: [
    "us-census-units",
    "worldbank-wdi-us",
    "oecd-tax-us",
    "us-census-county-boundaries",
    "us-federal-income-tax",
    "wy-income-tax",
  ],
  instrumentKinds: [],
  taxModel: unitedStatesIncomeTax,
  taxLabels: unitedStatesTaxLabels,
};

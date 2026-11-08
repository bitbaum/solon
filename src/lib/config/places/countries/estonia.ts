import type { TaxModel } from "@/lib/tax-model";
import type { CountryPackInput, TaxLabels } from "../schema";

/**
 * Estonia's income tax on a resident's income (Tulumaksuseadus): one rate,
 * 22 % (§ 4 lg 1), on what is above the tax-free income of 8,400 euros a year
 * (§ 23 lg 1), the same in every municipality. A municipality receives a share
 * of the tax its residents pay but sets no rate of its own, so the model reads
 * the nation only. Each person is taxed on their own income: there is no joint
 * return, so a couple pays what each pays alone, and the one variant offered
 * is a person's own tax.
 */
export const estoniaIncomeTax = {
  schemaVersion: 10,
  base: "taxable_income",
  inputs: ["taxable_income"],
  variants: ["single"],
  components: [
    {
      key: "national",
      tariff: { level: "nation", metric: "tax.income.tariff" },
    },
  ],
} as const satisfies TaxModel;

const estoniaTaxLabels: TaxLabels = {
  inputs: {
    taxable_income: {
      label: {
        en: "Income for the year",
        de: "Einkommen des Jahres",
        fr: "Revenu de l’année",
        it: "Reddito dell’anno",
        et: "Aasta tulu",
      },
      hint: {
        en: "After deductions such as pension contributions, before the 8,400 euro tax-free income, which is taken off here.",
        de: "Nach Abzügen wie Pensionsbeiträgen, vor dem steuerfreien Einkommen von 8’400 Euro, das hier abgezogen wird.",
        fr: "Après les déductions comme les cotisations de retraite, avant le revenu non imposable de 8 400 euros, déduit ici.",
        it: "Dopo deduzioni come i contributi pensionistici, prima del reddito esente di 8 400 euro, che viene dedotto qui.",
        et: "Pärast mahaarvamisi, näiteks pensionimakseid, enne 8400 euro suurust maksuvaba tulu, mis arvatakse siin maha.",
      },
    },
  },
  choices: {},
  variants: {
    single: {
      en: "One person (Estonia taxes each person separately)",
      de: "Eine Person (Estland besteuert jede Person einzeln)",
      fr: "Une personne (l’Estonie impose chaque personne séparément)",
      it: "Una persona (l’Estonia tassa ogni persona separatamente)",
      et: "Üks inimene (Eesti maksustab igaüht eraldi)",
    },
  },
  components: {
    national: {
      en: "Income tax",
      de: "Einkommensteuer",
      fr: "Impôt sur le revenu",
      it: "Imposta sul reddito",
      et: "Tulumaks",
    },
  },
  rate: {
    yours: {
      en: "{rate} of your income",
      de: "{rate} Ihres Einkommens",
      fr: "{rate} de votre revenu",
      it: "{rate} del tuo reddito",
      et: "{rate} teie tulust",
    },
    example: {
      en: "{rate} of an example income of {amount}",
      de: "{rate} eines Beispieleinkommens von {amount}",
      fr: "{rate} d’un revenu d’exemple de {amount}",
      it: "{rate} di un reddito d’esempio di {amount}",
      et: "{rate} näidistulust {amount}",
    },
  },
  exampleBase: 40_000,
  excludes: {
    en: "The higher tax-free income at pension age, capital gains, dividends and social tax paid by the employer are not included.",
    de: "Das höhere steuerfreie Einkommen im Rentenalter, Kapitalgewinne, Dividenden und die vom Arbeitgeber bezahlte Sozialsteuer sind nicht enthalten.",
    fr: "Le revenu non imposable plus élevé à l’âge de la retraite, les gains en capital, les dividendes et la taxe sociale payée par l’employeur ne sont pas inclus.",
    it: "Il reddito esente più alto in età pensionabile, le plusvalenze, i dividendi e la tassa sociale pagata dal datore di lavoro non sono inclusi.",
    et: "Pensioniealise suurem maksuvaba tulu, kasu vara võõrandamisest, dividendid ja tööandja makstav sotsiaalmaks ei ole arvestatud.",
  },
};

/**
 * The Republic of Estonia: the nation, its fifteen counties (maakond) and its
 * municipalities (vald and linn), by their codes in EHAK, the classification
 * of Estonian administrative units and settlements. Every municipality lies in
 * exactly one county, so the levels are full.
 *
 * Its tax: `estoniaIncomeTax` above, read from the Income Tax Act
 * (`ee-income-tax`).
 */
export const estonia: CountryPackInput = {
  key: "estonia",
  names: {
    et: "Eesti",
    en: "Estonia",
    de: "Estland",
    fr: "Estonie",
    it: "Estonia",
  },
  currency: "EUR",
  region: "EE",
  fiscalYear: { startMonthDay: "01-01" },
  defaultLocales: ["et"],
  slug: { strategy: "official-name", transliterate: true },
  levels: [
    {
      key: "nation",
      parent: null,
      names: { en: "Republic", et: "Vabariik", de: "Republik", fr: "République", it: "Repubblica" },
    },
    {
      key: "county",
      parent: "nation",
      names: { en: "County", et: "maakond", de: "Kreis", fr: "comté", it: "contea" },
    },
    {
      key: "municipality",
      parent: "county",
      names: { en: "Municipality", et: "omavalitsus", de: "Gemeinde", fr: "commune", it: "comune" },
    },
  ],
  identifierSchemes: ["iso_3166_1", "ee_county", "ee_municipality"],
  sources: [
    "ee-ehak-units",
    "worldbank-wdi-ee",
    "oecd-tax-ee",
    "ee-income-tax",
    "ee-maaamet-municipality-boundaries",
  ],
  instrumentKinds: [],
  taxModel: estoniaIncomeTax,
  taxLabels: estoniaTaxLabels,
};

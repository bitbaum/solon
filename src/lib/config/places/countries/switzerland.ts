import type { TaxModel } from "@/lib/tax-model";
import type { CountryPackInput, TaxLabels } from "../schema";

/**
 * Swiss income tax on taxable income: the federal tariff, plus the canton's
 * basic tariff times the canton's multiplier, plus the communes' tariff times
 * the commune's multiplier (Steuerfüsse). In most cantons both tariffs are the
 * same basic tariff; Schwyz gives its communes one of their own. Where a
 * canton splits a couple's income, its tariffs read the income divided by the
 * canton's divisor for the variant (1 where nothing is divided, 2 for full
 * splitting), and the amount is multiplied back. A tariff may state the tax at each step (Ticino, the federal tariff's
 * top) or give average rates (Fribourg), which needs schema version 3. Schema
 * version 4: a tariff rounds the income down (to CHF 100 in most cantons, and
 * the divided income too in some), and Vaud's cantonal multiplier is cut by
 * the share its tax law sets each year (absent elsewhere, so nothing is cut).
 * Schema version 5: Basel-Landschaft's tariff is a formula (logarithmic
 * pieces), and the federal tax is not levied below CHF 25. Schema version 6:
 * Vaud's cantonal and communal tax together take at most 30 % of the income,
 * reduced in proportion above it (absent elsewhere, so nothing is limited).
 *
 * Schema version 7: wealth tax on taxable wealth, the canton's basic wealth
 * tariff times the canton's and the commune's wealth multipliers; and church
 * tax, the basic income and wealth tax times the commune's rate for the
 * member's church, as the tax calculator computes it. The calculator gives
 * one rate per commune and church; where parishes in one commune levy
 * different rates, it shows one of them. Fixed per-head taxes (Zürich's
 * CHF 24, Lucerne's CHF 50) are not modelled yet: no export states them.
 */
const church = (metric: string) =>
  (["reformed", "catholic", "christ_catholic"] as const).map((denomination) => ({
    level: "municipality",
    metric: `${metric}.${denomination}`,
    when: `church_${denomination}`,
  }));

export const switzerlandIncomeTax = {
  schemaVersion: 7,
  base: "taxable_income",
  inputs: [
    "taxable_income",
    "taxable_wealth",
    "church_reformed",
    "church_catholic",
    "church_christ_catholic",
  ],
  variants: ["single", "married"],
  components: [
    { key: "federal", tariff: { level: "nation", metric: "tax.income.tariff" } },
    {
      key: "cantonal",
      tariff: { level: "canton", metric: "tax.income.tariff.basic" },
      divisor: { level: "canton", metric: "tax.income.divisor" },
      multipliers: [
        {
          level: "canton",
          metric: "tax.multiplier",
          reducedBy: { level: "canton", metric: "tax.income.basic.reduction", optional: true },
        },
      ],
    },
    {
      key: "communal",
      tariff: { level: "canton", metric: "tax.income.tariff.communal" },
      divisor: { level: "canton", metric: "tax.income.divisor" },
      multipliers: [{ level: "municipality", metric: "tax.multiplier" }],
    },
    {
      key: "church",
      tariff: { level: "canton", metric: "tax.income.tariff.basic" },
      divisor: { level: "canton", metric: "tax.income.divisor" },
      multipliers: church("tax.church"),
    },
    {
      key: "wealth_cantonal",
      base: "taxable_wealth",
      tariff: { level: "canton", metric: "tax.wealth.tariff.basic" },
      multipliers: [{ level: "canton", metric: "tax.wealth.multiplier" }],
    },
    {
      key: "wealth_communal",
      base: "taxable_wealth",
      tariff: { level: "canton", metric: "tax.wealth.tariff.basic" },
      multipliers: [{ level: "municipality", metric: "tax.wealth.multiplier" }],
    },
    {
      key: "wealth_church",
      base: "taxable_wealth",
      tariff: { level: "canton", metric: "tax.wealth.tariff.basic" },
      multipliers: church("tax.church.wealth"),
    },
  ],
  limits: [
    {
      components: ["cantonal", "communal"],
      share: { level: "canton", metric: "tax.income.limit", optional: true },
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
    taxable_wealth: {
      label: {
        en: "Taxable wealth (optional)",
        de: "Steuerbares Vermögen (optional)",
        fr: "Fortune imposable (facultatif)",
        it: "Sostanza imponibile (facoltativo)",
      },
      hint: {
        en: "After debts are taken off; the tariff takes off the canton's allowance.",
        de: "Nach Abzug der Schulden; den Freibetrag des Kantons zieht der Tarif ab.",
        fr: "Après déduction des dettes ; le barème déduit la franchise du canton.",
        it: "Dopo la deduzione dei debiti; la tariffa deduce la franchigia del cantone.",
      },
    },
    church_reformed: {
      label: {
        en: "Evangelical Reformed",
        de: "Evangelisch-reformiert",
        fr: "Réformée évangélique",
        it: "Evangelica riformata",
      },
    },
    church_catholic: {
      label: {
        en: "Roman Catholic",
        de: "Römisch-katholisch",
        fr: "Catholique romaine",
        it: "Cattolica romana",
      },
    },
    church_christ_catholic: {
      label: {
        en: "Christian Catholic",
        de: "Christkatholisch",
        fr: "Catholique-chrétienne",
        it: "Cattolica cristiana",
      },
    },
  },
  choices: {
    church: {
      label: {
        en: "Church tax",
        de: "Kirchensteuer",
        fr: "Impôt ecclésiastique",
        it: "Imposta di culto",
      },
      none: {
        en: "Not a member of a church that levies tax",
        de: "Kein Mitglied einer steuererhebenden Kirche",
        fr: "Pas membre d'une Église qui prélève l'impôt",
        it: "Non membro di una chiesa che riscuote l'imposta",
      },
      options: ["church_reformed", "church_catholic", "church_christ_catholic"],
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
    cantonal: {
      en: "Cantonal tax",
      de: "Staatssteuer",
      fr: "Impôt cantonal",
      it: "Imposta cantonale",
    },
    communal: {
      en: "Communal tax",
      de: "Gemeindesteuer",
      fr: "Impôt communal",
      it: "Imposta comunale",
    },
    church: {
      en: "Church tax",
      de: "Kirchensteuer",
      fr: "Impôt ecclésiastique",
      it: "Imposta di culto",
    },
    wealth_cantonal: {
      en: "Cantonal wealth tax",
      de: "Staatssteuer auf dem Vermögen",
      fr: "Impôt cantonal sur la fortune",
      it: "Imposta cantonale sulla sostanza",
    },
    wealth_communal: {
      en: "Communal wealth tax",
      de: "Gemeindesteuer auf dem Vermögen",
      fr: "Impôt communal sur la fortune",
      it: "Imposta comunale sulla sostanza",
    },
    wealth_church: {
      en: "Church tax on wealth",
      de: "Kirchensteuer auf dem Vermögen",
      fr: "Impôt ecclésiastique sur la fortune",
      it: "Imposta di culto sulla sostanza",
    },
  },
  rate: {
    yours: {
      en: "{rate} of your taxable income",
      de: "{rate} Ihres steuerbaren Einkommens",
      fr: "{rate} de votre revenu imposable",
      it: "{rate} del tuo reddito imponibile",
    },
    example: {
      en: "{rate} of an example taxable income of {amount}",
      de: "{rate} eines steuerbaren Beispieleinkommens von {amount}",
      fr: "{rate} d’un revenu imposable d’exemple de {amount}",
      it: "{rate} di un reddito imponibile d’esempio di {amount}",
    },
  },
  // The income the golden fixtures check against the federal calculator.
  exampleBase: 100_000,
  excludes: {
    en: "Not included: fixed per-head taxes, such as CHF 24 a person in Zürich or CHF 50 in Lucerne. Church tax assumes both partners belong to the same church.",
    de: "Nicht enthalten: feste Kopfsteuern, etwa CHF 24 pro Person in Zürich oder CHF 50 in Luzern. Die Kirchensteuer nimmt an, dass beide Partner derselben Kirche angehören.",
    fr: "Non compris : les impôts par tête, comme CHF 24 par personne à Zurich ou CHF 50 à Lucerne. L'impôt ecclésiastique suppose que les deux partenaires appartiennent à la même Église.",
    it: "Non incluse: le imposte pro capite, come CHF 24 a persona a Zurigo o CHF 50 a Lucerna. L'imposta di culto presume che entrambi i partner appartengano alla stessa chiesa.",
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
    "ch-cantonal-tax-steps",
  ],
  instrumentKinds: ["tax_return", "tax_payment", "tax_deadline_extension"],
  taxModel: switzerlandIncomeTax,
  taxLabels: switzerlandTaxLabels,
};

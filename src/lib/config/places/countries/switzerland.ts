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
 * tariff (divided for a couple where the canton divides it) times the
 * canton's and the commune's wealth multipliers; and church tax, a church's
 * tariff times the commune's rate for that church, as the tax calculator
 * computes it. A church's tariff is the canton's basic tariff unless the
 * canton levies it on something else (`ch-church-tariffs`). Schema version 8:
 * where church tax is levied on the cantonal tax (Jura), every church rate is
 * scaled by the canton's multiplier. The calculator gives one rate per
 * commune and church; where parishes in one commune levy different rates, it
 * shows one of them. A canton may levy a further multiplier that its own
 * reduction does not touch, and a supplementary wealth tax on no multiplier
 * (both Geneva's). Fixed per-head taxes: the canton's, per person or per
 * household (`tax.head`, a `fixed` tariff per variant, 0 where none), a
 * church's on top for its members, and a commune's and a parish's own per
 * adult where they set it (Solothurn's).
 */
const DENOMINATIONS = ["reformed", "catholic", "christ_catholic"] as const;
const churchComponents = (on: "income" | "wealth") =>
  DENOMINATIONS.map((denomination) => {
    const prefix = on === "income" ? "tax.church" : "tax.church.wealth";
    return {
      key: on === "income" ? `church_${denomination}` : `wealth_church_${denomination}`,
      ...(on === "wealth" && { base: "taxable_wealth" }),
      when: `church_${denomination}`,
      tariff: { level: "canton", metric: `${prefix}.tariff.${denomination}` },
      divisor:
        on === "income"
          ? { level: "canton", metric: "tax.income.divisor" }
          : { level: "canton", metric: "tax.wealth.divisor", optional: true },
      multipliers: [
        {
          level: "municipality",
          metric: `${prefix}.${denomination}`,
          scaledBy: { level: "canton", metric: `${prefix}.scale`, optional: true },
        },
      ],
    };
  });

export const switzerlandIncomeTax = {
  schemaVersion: 8,
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
        { level: "canton", metric: "tax.multiplier.extra", optional: true },
      ],
    },
    {
      key: "communal",
      tariff: { level: "canton", metric: "tax.income.tariff.communal" },
      divisor: { level: "canton", metric: "tax.income.divisor" },
      multipliers: [{ level: "municipality", metric: "tax.multiplier" }],
    },
    ...churchComponents("income"),
    {
      key: "wealth_cantonal",
      base: "taxable_wealth",
      tariff: { level: "canton", metric: "tax.wealth.tariff.basic" },
      divisor: { level: "canton", metric: "tax.wealth.divisor", optional: true },
      multipliers: [
        { level: "canton", metric: "tax.wealth.multiplier" },
        { level: "canton", metric: "tax.multiplier.extra", optional: true },
      ],
    },
    {
      key: "wealth_supplement",
      base: "taxable_wealth",
      tariff: { level: "canton", metric: "tax.wealth.tariff.supplement" },
    },
    {
      key: "wealth_communal",
      base: "taxable_wealth",
      tariff: { level: "canton", metric: "tax.wealth.tariff.basic" },
      divisor: { level: "canton", metric: "tax.wealth.divisor", optional: true },
      multipliers: [{ level: "municipality", metric: "tax.wealth.multiplier" }],
    },
    ...churchComponents("wealth"),
    { key: "head", tariff: { level: "canton", metric: "tax.head" } },
    ...DENOMINATIONS.map((denomination) => ({
      key: `head_church_${denomination}`,
      when: `church_${denomination}`,
      tariff: { level: "canton", metric: "tax.head.church" },
    })),
    ...DENOMINATIONS.map((denomination) => ({
      key: `head_parish_${denomination}`,
      when: `church_${denomination}`,
      tariff: { level: "canton", metric: "tax.head.adults" },
      multipliers: [
        {
          level: "municipality",
          metric: `tax.head.church.communal.${denomination}`,
          optional: true,
        },
      ],
    })),
    {
      key: "head_communal",
      tariff: { level: "canton", metric: "tax.head.adults" },
      multipliers: [{ level: "municipality", metric: "tax.head.communal", optional: true }],
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
    church_reformed: {
      en: "Church tax",
      de: "Kirchensteuer",
      fr: "Impôt ecclésiastique",
      it: "Imposta di culto",
    },
    church_catholic: {
      en: "Church tax",
      de: "Kirchensteuer",
      fr: "Impôt ecclésiastique",
      it: "Imposta di culto",
    },
    church_christ_catholic: {
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
    wealth_supplement: {
      en: "Supplementary wealth tax",
      de: "Zusätzliche Vermögenssteuer",
      fr: "Impôt supplémentaire sur la fortune",
      it: "Imposta supplementare sulla sostanza",
    },
    wealth_communal: {
      en: "Communal wealth tax",
      de: "Gemeindesteuer auf dem Vermögen",
      fr: "Impôt communal sur la fortune",
      it: "Imposta comunale sulla sostanza",
    },
    head: {
      en: "Per-head tax",
      de: "Personalsteuer",
      fr: "Taxe personnelle",
      it: "Imposta personale",
    },
    head_church_reformed: {
      en: "Per-head church tax",
      de: "Kirchliche Personalsteuer",
      fr: "Taxe personnelle ecclésiastique",
      it: "Imposta personale di culto",
    },
    head_church_catholic: {
      en: "Per-head church tax",
      de: "Kirchliche Personalsteuer",
      fr: "Taxe personnelle ecclésiastique",
      it: "Imposta personale di culto",
    },
    head_church_christ_catholic: {
      en: "Per-head church tax",
      de: "Kirchliche Personalsteuer",
      fr: "Taxe personnelle ecclésiastique",
      it: "Imposta personale di culto",
    },
    head_parish_reformed: {
      en: "Parish per-head tax",
      de: "Personalsteuer der Kirchgemeinde",
      fr: "Taxe personnelle paroissiale",
      it: "Imposta personale parrocchiale",
    },
    head_parish_catholic: {
      en: "Parish per-head tax",
      de: "Personalsteuer der Kirchgemeinde",
      fr: "Taxe personnelle paroissiale",
      it: "Imposta personale parrocchiale",
    },
    head_parish_christ_catholic: {
      en: "Parish per-head tax",
      de: "Personalsteuer der Kirchgemeinde",
      fr: "Taxe personnelle paroissiale",
      it: "Imposta personale parrocchiale",
    },
    head_communal: {
      en: "Communal per-head tax",
      de: "Gemeinde-Personalsteuer",
      fr: "Taxe personnelle communale",
      it: "Imposta personale comunale",
    },
    wealth_church_reformed: {
      en: "Church tax on wealth",
      de: "Kirchensteuer auf dem Vermögen",
      fr: "Impôt ecclésiastique sur la fortune",
      it: "Imposta di culto sulla sostanza",
    },
    wealth_church_catholic: {
      en: "Church tax on wealth",
      de: "Kirchensteuer auf dem Vermögen",
      fr: "Impôt ecclésiastique sur la fortune",
      it: "Imposta di culto sulla sostanza",
    },
    wealth_church_christ_catholic: {
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
    en: "Church tax assumes both partners belong to the same church.",
    de: "Die Kirchensteuer nimmt an, dass beide Partner derselben Kirche angehören.",
    fr: "L'impôt ecclésiastique suppose que les deux partenaires appartiennent à la même Église.",
    it: "L'imposta di culto presume che entrambi i partner appartengano alla stessa chiesa.",
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
    {
      // Where a commune's rates depend on the locality (its school communes or
      // parishes differ), its localities carry the rates in its stead.
      key: "locality",
      parent: "municipality",
      coverage: "partial",
      standsFor: "municipality",
      names: { en: "Locality", de: "Ortschaft", fr: "localité", it: "località" },
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
    "estv_tax_location",
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
    "estv-wealth-tax-scales",
    "ch-church-tariffs",
    "ch-per-head-taxes",
    "ch-cantonal-adjustments",
    "estv-tax-localities",
  ],
  instrumentKinds: ["tax_return", "tax_payment", "tax_deadline_extension"],
  taxModel: switzerlandIncomeTax,
  taxLabels: switzerlandTaxLabels,
};

import type { MetricInput } from "./schema";

/**
 * The metric catalog: what a fact can measure, its value type, unit and
 * plausible band (§4.6). Synced to `place_metrics`, which facts reference.
 */
export const METRICS: readonly MetricInput[] = [
  {
    key: "tax.income.tariff",
    label: {
      en: "Income tax tariff",
      de: "Einkommenssteuertarif",
      fr: "barème de l'impôt sur le revenu",
    },
    valueType: "tariff",
    unit: "currency",
  },
  {
    // A tariff whose amount is then multiplied by the multipliers of several levels.
    key: "tax.income.tariff.basic",
    label: {
      en: "Basic income tax tariff",
      de: "Grundtarif Einkommenssteuer (einfache Steuer)",
      fr: "barème de base de l'impôt sur le revenu",
    },
    valueType: "tariff",
    unit: "currency",
  },
  {
    // The tariff a canton's communes apply their multipliers to: the basic
    // tariff in most cantons, one of their own in Schwyz.
    key: "tax.income.tariff.communal",
    label: {
      en: "Communal income tax tariff",
      de: "Tarif der Gemeindesteuer auf dem Einkommen",
      fr: "barème de l'impôt communal sur le revenu",
      it: "tariffa dell'imposta comunale sul reddito",
    },
    valueType: "tariff",
    unit: "currency",
  },
  {
    // Applied to a basic tariff: the tariff reads the income divided by it, and
    // its amount is multiplied back. 2 is full splitting of a couple's income.
    key: "tax.income.divisor",
    label: {
      en: "Income divisor (splitting)",
      de: "Divisor des Einkommens (Splitting)",
      fr: "diviseur du revenu (splitting)",
      it: "divisore del reddito (splitting)",
    },
    valueType: "number",
    unit: "ratio",
    plausible: { min: 1, max: 3 },
  },
  {
    // Vaud's cantonal and communal income tax together may not exceed this
    // share of taxable income (LICom art. 8).
    key: "tax.income.limit",
    label: {
      en: "Maximum share of income taken by cantonal and communal tax",
      de: "Höchstanteil des Einkommens für Staats- und Gemeindesteuer",
      fr: "part maximale du revenu pour les impôts cantonal et communal",
      it: "quota massima del reddito per le imposte cantonale e comunale",
    },
    valueType: "number",
    unit: "ratio",
    plausible: { min: 0.05, max: 1 },
  },
  {
    // Vaud cuts its cantonal tax by a share the tax law sets each year (LRIPP
    // art. 4); the communes' tax is not cut.
    key: "tax.income.basic.reduction",
    label: {
      en: "Reduction of the cantonal income tax",
      de: "Reduktion der Staatssteuer auf dem Einkommen",
      fr: "réduction de l'impôt cantonal sur le revenu",
      it: "riduzione dell'imposta cantonale sul reddito",
    },
    valueType: "number",
    unit: "ratio",
    plausible: { min: 0, max: 0.5 },
  },
  {
    // The index by which a canton or a commune moves its income tariff to
    // higher incomes to offset inflation, each on its own schedule (Valais:
    // StG art. 32 para. 4 for the canton, art. 178 para. 5 for its communes).
    // The tariff is read at the income divided by it. Absent: 1.
    key: "tax.income.index",
    label: {
      en: "Income tariff index",
      de: "Indexierung des Einkommenstarifs",
      fr: "indexation du barème sur le revenu",
      it: "indicizzazione della tariffa sul reddito",
    },
    valueType: "number",
    unit: "ratio",
    plausible: { min: 1, max: 3 },
  },
  {
    // The share by which a couple's income tax is cut (Valais: 35 %, StG art.
    // 32 para. 3a and art. 178 para. 3a). Recorded for the couple only.
    key: "tax.income.rebate",
    label: {
      en: "Rebate on the income tax",
      de: "Ermässigung der Einkommenssteuer",
      fr: "rabais d'impôt sur le revenu",
      it: "riduzione dell'imposta sul reddito",
    },
    valueType: "number",
    unit: "ratio",
    plausible: { min: 0, max: 0.6 },
  },
  {
    key: "tax.income.rebate.least",
    label: {
      en: "Least rebate on the income tax",
      de: "Mindestermässigung der Einkommenssteuer",
      fr: "rabais minimal d'impôt sur le revenu",
      it: "riduzione minima dell'imposta sul reddito",
    },
    valueType: "number",
    unit: "currency",
    plausible: { min: 0, max: 5_000 },
  },
  {
    key: "tax.income.rebate.most",
    label: {
      en: "Most rebate on the income tax",
      de: "Höchstermässigung der Einkommenssteuer",
      fr: "rabais maximal d'impôt sur le revenu",
      it: "riduzione massima dell'imposta sul reddito",
    },
    valueType: "number",
    unit: "currency",
    plausible: { min: 0, max: 20_000 },
  },
  {
    // The least cantonal income tax a taxpayer owes (Valais: CHF 10, StG art.
    // 32 para. 6).
    key: "tax.income.floor",
    label: {
      en: "Minimum income tax",
      de: "Mindeststeuer auf dem Einkommen",
      fr: "impôt minimal sur le revenu",
      it: "imposta minima sul reddito",
    },
    valueType: "number",
    unit: "currency",
    plausible: { min: 0, max: 1_000 },
  },
  {
    // The yield the law assumes on wealth and taxes as income, on one tariff
    // with it (Liechtenstein's Sollertrag: SteG, LR 640.0, art. 5 and art. 14
    // para. 2 l; 4 % for 2025 by the Finanzgesetz, LGBl. 2024 Nr. 441, art. 2).
    key: "tax.wealth.yield",
    label: {
      en: "Assumed yield on wealth",
      de: "Sollertrag des Vermögens",
      fr: "rendement présumé de la fortune",
      it: "reddito presunto della sostanza",
    },
    valueType: "number",
    unit: "ratio",
    plausible: { min: 0, max: 0.2 },
  },
  {
    key: "tax.multiplier",
    label: {
      en: "Tax multiplier",
      de: "Steuerfuss",
      fr: "coefficient d'impôt",
      it: "moltiplicatore d'imposta",
    },
    valueType: "number",
    unit: "ratio",
    // Swiss multipliers reach 5.25 (Lungern, on a small basic tariff); a percent
    // read as a fraction (119 for 1.19) still falls far outside.
    plausible: { min: 0, max: 6 },
  },
  {
    // The wealth tariff a canton's and its communes' multipliers apply to.
    key: "tax.wealth.tariff.basic",
    label: {
      en: "Basic wealth tax tariff",
      de: "Grundtarif Vermögenssteuer (einfache Steuer)",
      fr: "barème de base de l'impôt sur la fortune",
      it: "tariffa di base dell'imposta sulla sostanza",
    },
    valueType: "tariff",
    unit: "currency",
  },
  {
    // The canton's or commune's multiplier on the basic wealth tax; the same as
    // on income in most places, not in all (Fribourg's communes).
    key: "tax.wealth.multiplier",
    label: {
      en: "Tax multiplier on wealth",
      de: "Steuerfuss auf dem Vermögen",
      fr: "coefficient d'impôt sur la fortune",
      it: "moltiplicatore d'imposta sulla sostanza",
    },
    valueType: "number",
    unit: "ratio",
    plausible: { min: 0, max: 6 },
  },
  {
    // A commune's church tax rate for members of the Evangelical Reformed church, on the basic income tax.
    key: "tax.church.reformed",
    label: {
      en: "Church tax rate on income (Evangelical Reformed)",
      de: "Kirchensteuerfuss auf dem Einkommen (evangelisch-reformiert)",
      fr: "coefficient de l'impôt ecclésiastique sur le revenu (réformée évangélique)",
      it: "moltiplicatore dell'imposta di culto sul reddito (evangelica riformata)",
    },
    valueType: "number",
    unit: "ratio",
    plausible: { min: 0, max: 2 },
  },
  {
    // A commune's church tax rate for members of the Evangelical Reformed church, on the basic wealth tax.
    key: "tax.church.wealth.reformed",
    label: {
      en: "Church tax rate on wealth (Evangelical Reformed)",
      de: "Kirchensteuerfuss auf dem Vermögen (evangelisch-reformiert)",
      fr: "coefficient de l'impôt ecclésiastique sur la fortune (réformée évangélique)",
      it: "moltiplicatore dell'imposta di culto sulla sostanza (evangelica riformata)",
    },
    valueType: "number",
    unit: "ratio",
    plausible: { min: 0, max: 2 },
  },
  {
    // A commune's church tax rate for members of the Roman Catholic church, on the basic income tax.
    key: "tax.church.catholic",
    label: {
      en: "Church tax rate on income (Roman Catholic)",
      de: "Kirchensteuerfuss auf dem Einkommen (römisch-katholisch)",
      fr: "coefficient de l'impôt ecclésiastique sur le revenu (catholique romaine)",
      it: "moltiplicatore dell'imposta di culto sul reddito (cattolica romana)",
    },
    valueType: "number",
    unit: "ratio",
    plausible: { min: 0, max: 2 },
  },
  {
    // A commune's church tax rate for members of the Roman Catholic church, on the basic wealth tax.
    key: "tax.church.wealth.catholic",
    label: {
      en: "Church tax rate on wealth (Roman Catholic)",
      de: "Kirchensteuerfuss auf dem Vermögen (römisch-katholisch)",
      fr: "coefficient de l'impôt ecclésiastique sur la fortune (catholique romaine)",
      it: "moltiplicatore dell'imposta di culto sulla sostanza (cattolica romana)",
    },
    valueType: "number",
    unit: "ratio",
    plausible: { min: 0, max: 2 },
  },
  {
    // A commune's church tax rate for members of the Christian Catholic church, on the basic income tax.
    key: "tax.church.christ_catholic",
    label: {
      en: "Church tax rate on income (Christian Catholic)",
      de: "Kirchensteuerfuss auf dem Einkommen (christkatholisch)",
      fr: "coefficient de l'impôt ecclésiastique sur le revenu (catholique-chrétienne)",
      it: "moltiplicatore dell'imposta di culto sul reddito (cattolica cristiana)",
    },
    valueType: "number",
    unit: "ratio",
    plausible: { min: 0, max: 2 },
  },
  {
    // A commune's church tax rate for members of the Christian Catholic church, on the basic wealth tax.
    key: "tax.church.wealth.christ_catholic",
    label: {
      en: "Church tax rate on wealth (Christian Catholic)",
      de: "Kirchensteuerfuss auf dem Vermögen (christkatholisch)",
      fr: "coefficient de l'impôt ecclésiastique sur la fortune (catholique-chrétienne)",
      it: "moltiplicatore dell'imposta di culto sulla sostanza (cattolica cristiana)",
    },
    valueType: "number",
    unit: "ratio",
    plausible: { min: 0, max: 2 },
  },
  {
    // The tariff the Evangelical Reformed church's rates on income apply to: the canton's basic
    // income tariff in most cantons, a share of income where the church's rate is one.
    key: "tax.church.tariff.reformed",
    label: {
      en: "Church tax base on income (Evangelical Reformed)",
      de: "Bemessung der Kirchensteuer auf dem Einkommen (evangelisch-reformiert)",
      fr: "base de l'impôt ecclésiastique sur le revenu (réformée évangélique)",
      it: "base dell'imposta di culto sul reddito (evangelica riformata)",
    },
    valueType: "tariff",
    unit: "currency",
  },
  {
    // The tariff the Roman Catholic church's rates on income apply to: the canton's basic
    // income tariff in most cantons, a share of income where the church's rate is one.
    key: "tax.church.tariff.catholic",
    label: {
      en: "Church tax base on income (Roman Catholic)",
      de: "Bemessung der Kirchensteuer auf dem Einkommen (römisch-katholisch)",
      fr: "base de l'impôt ecclésiastique sur le revenu (catholique romaine)",
      it: "base dell'imposta di culto sul reddito (cattolica romana)",
    },
    valueType: "tariff",
    unit: "currency",
  },
  {
    // The tariff the Christian Catholic church's rates on income apply to: the canton's basic
    // income tariff in most cantons, a share of income where the church's rate is one.
    key: "tax.church.tariff.christ_catholic",
    label: {
      en: "Church tax base on income (Christian Catholic)",
      de: "Bemessung der Kirchensteuer auf dem Einkommen (christkatholisch)",
      fr: "base de l'impôt ecclésiastique sur le revenu (catholique-chrétienne)",
      it: "base dell'imposta di culto sul reddito (cattolica cristiana)",
    },
    valueType: "tariff",
    unit: "currency",
  },
  {
    // Where church tax is levied on the cantonal tax rather than the basic tax,
    // the canton's multiplier on income, by which every church rate is scaled.
    key: "tax.church.scale",
    label: {
      en: "Church tax levied on the cantonal tax on income",
      de: "Kirchensteuer auf der Staatssteuer auf dem Einkommen",
      fr: "impôt ecclésiastique sur l'impôt cantonal sur le revenu",
      it: "imposta di culto sull'imposta cantonale sul reddito",
    },
    valueType: "number",
    unit: "ratio",
    plausible: { min: 0, max: 6 },
  },
  {
    // The tariff the Evangelical Reformed church's rates on wealth apply to: the canton's basic
    // wealth tariff in most cantons, a share of wealth where the church's rate is one.
    key: "tax.church.wealth.tariff.reformed",
    label: {
      en: "Church tax base on wealth (Evangelical Reformed)",
      de: "Bemessung der Kirchensteuer auf dem Vermögen (evangelisch-reformiert)",
      fr: "base de l'impôt ecclésiastique sur la fortune (réformée évangélique)",
      it: "base dell'imposta di culto sulla sostanza (evangelica riformata)",
    },
    valueType: "tariff",
    unit: "currency",
  },
  {
    // The tariff the Roman Catholic church's rates on wealth apply to: the canton's basic
    // wealth tariff in most cantons, a share of wealth where the church's rate is one.
    key: "tax.church.wealth.tariff.catholic",
    label: {
      en: "Church tax base on wealth (Roman Catholic)",
      de: "Bemessung der Kirchensteuer auf dem Vermögen (römisch-katholisch)",
      fr: "base de l'impôt ecclésiastique sur la fortune (catholique romaine)",
      it: "base dell'imposta di culto sulla sostanza (cattolica romana)",
    },
    valueType: "tariff",
    unit: "currency",
  },
  {
    // The tariff the Christian Catholic church's rates on wealth apply to: the canton's basic
    // wealth tariff in most cantons, a share of wealth where the church's rate is one.
    key: "tax.church.wealth.tariff.christ_catholic",
    label: {
      en: "Church tax base on wealth (Christian Catholic)",
      de: "Bemessung der Kirchensteuer auf dem Vermögen (christkatholisch)",
      fr: "base de l'impôt ecclésiastique sur la fortune (catholique-chrétienne)",
      it: "base dell'imposta di culto sulla sostanza (cattolica cristiana)",
    },
    valueType: "tariff",
    unit: "currency",
  },
  {
    // Where church tax is levied on the cantonal tax rather than the basic tax,
    // the canton's multiplier on wealth, by which every church rate is scaled.
    key: "tax.church.wealth.scale",
    label: {
      en: "Church tax levied on the cantonal tax on wealth",
      de: "Kirchensteuer auf der Staatssteuer auf dem Vermögen",
      fr: "impôt ecclésiastique sur l'impôt cantonal sur la fortune",
      it: "imposta di culto sull'imposta cantonale sulla sostanza",
    },
    valueType: "number",
    unit: "ratio",
    plausible: { min: 0, max: 6 },
  },
  {
    // Applied to the basic wealth tariff as tax.income.divisor is to income's.
    key: "tax.wealth.divisor",
    label: {
      en: "Wealth divisor (splitting)",
      de: "Divisor des Vermögens (Splitting)",
      fr: "diviseur de la fortune (splitting)",
      it: "divisore della sostanza (splitting)",
    },
    valueType: "number",
    unit: "ratio",
    plausible: { min: 1, max: 3 },
  },
  {
    // A canton's fixed tax per head (Personalsteuer, taxe personnelle), for a
    // household of the variant: per person in some cantons, per household in
    // others. 0 where the canton levies none.
    key: "tax.head",
    label: {
      en: "Per-head tax",
      de: "Personalsteuer",
      fr: "taxe personnelle",
      it: "imposta personale",
    },
    valueType: "tariff",
    unit: "currency",
  },
  {
    // Added to the per-head tax for a member of a church that levies one.
    key: "tax.head.church",
    label: {
      en: "Per-head church tax",
      de: "Kirchliche Personalsteuer",
      fr: "taxe personnelle ecclésiastique",
      it: "imposta personale di culto",
    },
    valueType: "tariff",
    unit: "currency",
  },
  {
    // How many adults of the variant's household a commune's per-head tax counts.
    key: "tax.head.adults",
    label: {
      en: "Adults liable to the communal per-head tax",
      de: "Personen mit Gemeinde-Personalsteuer",
      fr: "adultes soumis à la taxe personnelle communale",
      it: "adulti soggetti all'imposta personale comunale",
    },
    valueType: "tariff",
    unit: "count",
  },
  {
    // A commune's own per-head tax, per adult, where the commune sets it (Solothurn's).
    key: "tax.head.communal",
    label: {
      en: "Communal per-head tax",
      de: "Gemeinde-Personalsteuer",
      fr: "taxe personnelle communale",
      it: "imposta personale comunale",
    },
    valueType: "number",
    unit: "currency",
    plausible: { min: 0, max: 500 },
  },
  {
    // A parish's own per-head tax per adult member of the Evangelical Reformed church, where the
    // parish sets it (Solothurn's).
    key: "tax.head.church.communal.reformed",
    label: {
      en: "Parish per-head tax (Evangelical Reformed)",
      de: "Personalsteuer der Kirchgemeinde (evangelisch-reformiert)",
      fr: "taxe personnelle paroissiale (réformée évangélique)",
      it: "imposta personale parrocchiale (evangelica riformata)",
    },
    valueType: "number",
    unit: "currency",
    plausible: { min: 0, max: 500 },
  },
  {
    // A parish's own per-head tax per adult member of the Roman Catholic church, where the
    // parish sets it (Solothurn's).
    key: "tax.head.church.communal.catholic",
    label: {
      en: "Parish per-head tax (Roman Catholic)",
      de: "Personalsteuer der Kirchgemeinde (römisch-katholisch)",
      fr: "taxe personnelle paroissiale (catholique romaine)",
      it: "imposta personale parrocchiale (cattolica romana)",
    },
    valueType: "number",
    unit: "currency",
    plausible: { min: 0, max: 500 },
  },
  {
    // A parish's own per-head tax per adult member of the Christian Catholic church, where the
    // parish sets it (Solothurn's).
    key: "tax.head.church.communal.christ_catholic",
    label: {
      en: "Parish per-head tax (Christian Catholic)",
      de: "Personalsteuer der Kirchgemeinde (christkatholisch)",
      fr: "taxe personnelle paroissiale (catholique-chrétienne)",
      it: "imposta personale parrocchiale (cattolica cristiana)",
    },
    valueType: "number",
    unit: "currency",
    plausible: { min: 0, max: 500 },
  },
  {
    // A further cantonal multiplier on the basic income and wealth tax that no
    // reduction of the canton's own touches: Geneva's 1 centime for home care
    // (LCAC, rsGE D 3 07, art. 2 para. 2).
    key: "tax.multiplier.extra",
    label: {
      en: "Further cantonal multiplier",
      de: "Zusätzlicher kantonaler Steuerfuss",
      fr: "centime additionnel supplémentaire",
      it: "moltiplicatore cantonale supplementare",
    },
    valueType: "number",
    unit: "ratio",
    plausible: { min: 0, max: 1 },
  },
  {
    // A supplementary wealth tax levied as it stands, on no multiplier: Geneva's
    // (LIPP, rsGE D 3 08, art. 59 para. 2). A flat 0 where a canton levies none.
    key: "tax.wealth.tariff.supplement",
    label: {
      en: "Supplementary wealth tax tariff",
      de: "Tarif der zusätzlichen Vermögenssteuer",
      fr: "barème de l'impôt supplémentaire sur la fortune",
      it: "tariffa dell'imposta supplementare sulla sostanza",
    },
    valueType: "tariff",
    unit: "currency",
  },
];

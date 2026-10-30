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
];

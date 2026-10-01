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
];

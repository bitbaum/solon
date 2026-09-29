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
    key: "tax.multiplier",
    label: {
      en: "Tax multiplier",
      de: "Steuerfuss",
      fr: "coefficient d'impôt",
      it: "moltiplicatore d'imposta",
    },
    valueType: "number",
    unit: "ratio",
    plausible: { min: 0, max: 3 },
  },
];

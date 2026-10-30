import type { InstrumentKindInput } from "./schema";

/**
 * Ways to take part in a place — popular vote, initiative, referendum, … —
 * as kinds whose thresholds are data on each instrument, never constants
 * (§4.7). The label is what the link says: what happens when it is followed.
 *
 * The tax kinds are the steps a resident takes with the authority that
 * assesses their tax; each instrument is the authority's own page for it.
 */
export const INSTRUMENT_KINDS = [
  {
    key: "tax_return",
    label: {
      en: "File your tax return",
      de: "Steuererklärung einreichen",
      fr: "Déposer votre déclaration d'impôt",
      it: "Inoltrare la dichiarazione d'imposta",
      ru: "Подать налоговую декларацию",
    },
  },
  {
    key: "tax_payment",
    label: {
      en: "Pay your tax",
      de: "Steuern bezahlen",
      fr: "Payer vos impôts",
      it: "Pagare le imposte",
      ru: "Оплатить налог",
    },
  },
  {
    key: "tax_deadline_extension",
    label: {
      en: "Ask for more time to file",
      de: "Fristerstreckung beantragen",
      fr: "Demander une prolongation de délai",
      it: "Chiedere una proroga",
      ru: "Попросить отсрочку подачи",
    },
  },
] satisfies readonly InstrumentKindInput[];

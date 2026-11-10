/**
 * The rubrics legal features are coded on (src/lib/statistics/assessments.ts).
 * Changing a point's meaning is a new version, never an edit: codings name the
 * version they used, and a coding on an old version is refused until it is read
 * again on the new one.
 */
import { defineRubrics } from "@/lib/statistics/assessments";

const AUTHOR =
  "Solon's configuration (version 1, 2026-11-09), written for the compulsion and exit dimensions.";

export const RUBRICS = defineRubrics([
  {
    key: "compulsion.military_service",
    version: 1,
    label: { en: "Compulsory military or replacement service" },
    question: {
      en: "Does the law compel a person to serve in the armed forces or in a replacement service?",
    },
    scale: [
      {
        value: 0,
        label: { en: "No duty" },
        definition: {
          en: "The law requires neither service nor registration for service. Volunteers may serve.",
        },
      },
      {
        value: 1,
        label: { en: "Registration and liability" },
        definition: {
          en: "The law requires some people to register for possible service and makes them liable for it, but does not itself set a standing duty to serve now: whether anyone is called up depends on a further decision.",
        },
      },
      {
        value: 2,
        label: { en: "Service, with a civilian alternative" },
        definition: {
          en: "The law sets a standing duty to serve on some people (by sex, age or citizenship) and provides a civilian or non-military replacement service for those who refuse on grounds of conscience or otherwise.",
        },
      },
      {
        value: 3,
        label: { en: "Service, no alternative" },
        definition: {
          en: "The law sets a standing duty to serve on some people and provides no civilian alternative for those who refuse.",
        },
      },
    ],
    edgeCases: [
      {
        en: "A duty that falls on one sex only is coded by what it requires of the people it covers; the sex it covers is stated in the reading, not scored.",
      },
      {
        en: "A levy or fee in place of service is part of the alternative's cost and is stated in the reading; it does not change the point.",
      },
      {
        en: "A statute that makes registrants liable for service without saying whether induction is currently authorised is coded 1 with medium confidence, and the reading says what it leaves open.",
      },
    ],
    author: AUTHOR,
  },
  {
    key: "compulsion.health_insurance",
    version: 1,
    label: { en: "Compulsory health insurance" },
    question: {
      en: "Does the law compel a person to be covered by health insurance, and with what choice?",
    },
    scale: [
      {
        value: 0,
        label: { en: "No duty" },
        definition: { en: "The law does not require a person to be covered by health insurance." },
      },
      {
        value: 1,
        label: { en: "Duty without a payment" },
        definition: {
          en: "The law states a duty to be covered, but the payment or other consequence for not being covered is zero, so nothing enforces it.",
        },
      },
      {
        value: 2,
        label: { en: "Duty, with a choice of insurer" },
        definition: {
          en: "The law requires every resident to be insured and lets each person choose among insurers, and to change insurer.",
        },
      },
      {
        value: 3,
        label: { en: "Duty, one insurer" },
        definition: {
          en: "The law requires every resident to be covered and assigns them to one public insurer, with no choice of insurer.",
        },
      },
    ],
    edgeCases: [
      {
        en: "Coverage that follows automatically from paying a tax, with no separate act of insuring, is not coded here until a reader has decided which point it is; the place is left uncoded and the reason stated.",
      },
      {
        en: "A duty that the law states but that carries a payment of zero is coded 1, and the reading says what the payment is.",
      },
    ],
    author: AUTHOR,
  },
  {
    key: "exit.renounce_citizenship",
    version: 1,
    label: { en: "Giving up citizenship" },
    question: {
      en: "Can a citizen give up their citizenship, and on what conditions?",
    },
    scale: [
      {
        value: 0,
        label: { en: "By declaration" },
        definition: {
          en: "A citizen who holds or will acquire another citizenship may give theirs up by their own declaration, with no further condition in the law.",
        },
      },
      {
        value: 1,
        label: { en: "On stated conditions" },
        definition: {
          en: "A citizen may give it up only on further conditions the law states (living abroad, making the declaration abroad, a fee), and once they are met the law does not leave the outcome to an authority's discretion.",
        },
      },
      {
        value: 2,
        label: { en: "At an authority's discretion" },
        definition: {
          en: "Release is decided by an authority that the law allows to refuse it on grounds beyond avoiding statelessness (unfulfilled duties to the state, the state's interests).",
        },
      },
      {
        value: 3,
        label: { en: "No way out" },
        definition: { en: "The law provides no way for a citizen to give up their citizenship." },
      },
    ],
    edgeCases: [
      {
        en: "A refusal that only prevents statelessness does not count as discretion: international law expects it, and every point allows it.",
      },
      {
        en: "Losing citizenship as a penalty (deprivation) is a different feature and is not coded here.",
      },
      {
        en: "Where the law offers two ways out, the coding takes the one least burdened, and the reading names both.",
      },
    ],
    author: AUTHOR,
  },
  {
    key: "exit.departure_tax",
    version: 1,
    label: { en: "Tax on leaving" },
    question: {
      en: "Does the law tax a person because they give up their citizenship or their residence?",
    },
    scale: [
      {
        value: 0,
        label: { en: "No tax on leaving" },
        definition: {
          en: "The tax law sets no tax triggered by giving up citizenship or residence.",
        },
      },
      {
        value: 1,
        label: { en: "On some assets" },
        definition: {
          en: "Some assets (for example large shareholdings) are treated as sold when a person leaves, and the gain is taxed.",
        },
      },
      {
        value: 2,
        label: { en: "On all assets" },
        definition: {
          en: "All of a person's property is treated as sold when they give up citizenship or long-term residence, and the gain above an exclusion is taxed.",
        },
      },
    ],
    edgeCases: [
      {
        en: "A place is coded 0 only from a reading of its tax act's provisions on departure as a whole; not finding an exit tax in one article is not enough, and such a place is left uncoded.",
      },
      {
        en: "A threshold that exempts most people does not change the point; who is caught is stated in the reading.",
      },
    ],
    author: AUTHOR,
  },
  {
    key: "compulsion.old_age_pension",
    version: 1,
    label: { en: "Compulsory provision for old age" },
    question: {
      en: "Does the law compel a person to contribute to, or save for, a pension, and does it leave a way out?",
    },
    scale: [
      {
        value: 0,
        label: { en: "No duty" },
        definition: {
          en: "The law requires no contribution or saving for old age; a pension scheme may exist and be joined or not.",
        },
      },
      {
        value: 1,
        label: { en: "Duty, with a choice of provider" },
        definition: {
          en: "The law requires every worker to save or insure for old age, and lets each choose among providers or products, public or private.",
        },
      },
      {
        value: 2,
        label: { en: "Duty to a public scheme, with a way out" },
        definition: {
          en: "The law requires contributions to a public scheme, and lets a person opt out into an equivalent of their own.",
        },
      },
      {
        value: 3,
        label: { en: "Duty to a public scheme, no way out" },
        definition: {
          en: "The law requires contributions to a public scheme or imposes a tax for it, and gives a person no alternative.",
        },
      },
    ],
    edgeCases: [
      {
        en: "A country with a compulsory public first tier and a further compulsory tier with a choice is coded by the first tier, and the reading names the second.",
      },
      {
        en: "A tax earmarked for pensions counts as a contribution if the law ties it to the scheme's benefits.",
      },
      {
        en: "A place is coded only from a reading of the provisions that impose the duty; one that has not been read is left uncoded, not 0.",
      },
    ],
    author: AUTHOR,
  },
]);

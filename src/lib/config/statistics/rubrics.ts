/**
 * The rubrics legal features are coded on (src/lib/statistics/assessments.ts).
 * Changing a point's meaning is a new version, never an edit: codings name the
 * version they used, and a coding on an old version is refused until it is read
 * again on the new one.
 */
import { defineRubrics } from "@/lib/statistics/assessments";

const AUTHOR =
  "Solon's configuration (version 1, 2026-11-09), written for the compulsion dimension.";

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
]);

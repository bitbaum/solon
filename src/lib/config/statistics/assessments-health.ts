/**
 * Codings on `compulsion.health_insurance` (see assessments.ts for the rules
 * every coding follows). Estonia is left uncoded on purpose: its cover follows
 * from social tax, which the rubric's edge cases say a reader must place first.
 */
import type { CuratedRecordInput } from "@/lib/statistics/records";

const READ = "2026-11-09";
const CODER = "Claude (an AI assistant), 2026-11-09";
const ev = (publisher: string, url: string, expect: string[]) => ({
  publisher,
  url,
  read: READ,
  expect,
});

const KVG = ev(
  "Fedlex: Bundesgesetz über die Krankenversicherung (KVG, SR 832.10), the version in force from 2026-07-01, as read",
  "https://fedlex.data.admin.ch/filestore/fedlex.data.admin.ch/eli/cc/1995/1328_1328_1328/20260701/de/html/fedlex-data-admin-ch-eli-cc-1995-1328_1328_1328-20260701-de-html.html",
  [
    "Art. 3 Versicherungspflichtige Personen",
    "Jede Person mit Wohnsitz in der Schweiz muss sich innert drei Monaten nach der Wohnsitznahme oder der Geburt in der Schweiz für Krankenpflege versichern",
    "Art. 7 Wechsel des Versicherers",
    "Die versicherte Person kann unter Einhaltung einer dreimonatigen Kündigungsfrist den Versicherer auf das Ende eines Kalendersemesters wechseln.",
  ],
);

const IRC = ev(
  "U.S. Government Publishing Office, GovInfo: United States Code (2024 edition), 26 U.S.C. § 5000A, as read",
  "https://www.govinfo.gov/content/pkg/USCODE-2024-title26/html/USCODE-2024-title26-subtitleD-chap48-sec5000A.htm",
  [
    "An applicable individual shall for each month beginning after 2013 ensure that the individual",
    "is covered under minimum essential coverage for such month",
    "Zero percent for taxable years beginning after 2015",
    "the applicable dollar amount is $0",
  ],
);

export const HEALTH_ASSESSMENTS: readonly CuratedRecordInput[] = [
  {
    key: "assessment:ch:compulsion.health_insurance",
    kind: "assessment",
    metric: null,
    body: {
      place: { scheme: "iso_3166_1", value: "CH" },
      rubric: "compulsion.health_insurance",
      rubricVersion: 1,
      value: 2,
      validFrom: "2026-07-01",
      validTo: null,
      method: "coded",
      confidence: "high",
      confidenceNote: {
        en: "The duty and the right to change insurer are stated in two plain articles of the same act.",
      },
      reading: {
        en: "Every person resident in Switzerland must take out health insurance within three months of arriving or being born, or be insured by a legal representative; the insured may change insurer at the end of a half-year on three months' notice. A duty with a choice of insurer: point 2. What the act does to someone who does not insure was not read.",
      },
      provisions: [
        {
          act: { authority: "ch", scheme: "systematic_number", value: "832.10" },
          provision: "art_3",
          label: "KVG Art. 3",
        },
        {
          act: { authority: "ch", scheme: "systematic_number", value: "832.10" },
          provision: "art_7",
          label: "KVG Art. 7",
        },
      ],
      quotes: [
        {
          text: "Jede Person mit Wohnsitz in der Schweiz muss sich innert drei Monaten nach der Wohnsitznahme oder der Geburt in der Schweiz für Krankenpflege versichern oder von ihrem gesetzlichen Vertreter beziehungsweise ihrer gesetzlichen Vertreterin versichern lassen.",
          lang: "de",
          translation: {
            en: "Every person resident in Switzerland must, within three months of taking up residence or of birth in Switzerland, insure for medical care or be insured by their legal representative.",
          },
          evidence: [KVG],
        },
      ],
      open: {
        en: "The consequence of not insuring (the act's provisions on late insurance and on cantonal assignment) was not read.",
      },
      codedBy: CODER,
      reviewedBy: [],
      evidence: [KVG],
    },
  },
  {
    key: "assessment:us:compulsion.health_insurance",
    kind: "assessment",
    metric: null,
    body: {
      place: { scheme: "iso_3166_1", value: "US" },
      rubric: "compulsion.health_insurance",
      rubricVersion: 1,
      value: 1,
      validFrom: "2019-01-01",
      validTo: null,
      method: "coded",
      confidence: "high",
      confidenceNote: {
        en: "The requirement is still in the section; the same section sets the applicable dollar amount to $0 and the percentage to zero for taxable years after 2015.",
      },
      reading: {
        en: "An applicable individual must, for each month, be covered by minimum essential coverage. The shared-responsibility payment for not being covered is the greater of a percentage of income and a dollar amount; the percentage is zero after 2015 and the dollar amount is $0 (the $95 and $325 amounts applied to 2014 and 2015 only). The duty is stated and its payment is zero: point 1.",
      },
      provisions: [
        {
          act: {
            authority: "us",
            scheme: "official_url",
            value:
              "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section5000A",
          },
          provision: null,
          label: "26 U.S.C. § 5000A",
        },
      ],
      quotes: [
        {
          text: "An applicable individual shall for each month beginning after 2013 ensure that the individual, and any dependent of the individual who is an applicable individual, is covered under minimum essential coverage for such month.",
          lang: "en",
          evidence: [IRC],
        },
        {
          text: "the applicable dollar amount is $0",
          lang: "en",
          evidence: [IRC],
        },
      ],
      open: {
        en: "Some states have their own coverage requirements, which were not read; this codes the federal act only.",
      },
      codedBy: CODER,
      reviewedBy: [],
      evidence: [IRC],
    },
  },
];

/**
 * Codings on `compulsion.old_age_pension` (see assessments.ts for the rules
 * every coding follows). Estonia is left uncoded: its pension insurance rests
 * on provisions that were not read, and the rubric does not code from a guess.
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

const BV = ev(
  "Fedlex: Bundesverfassung der Schweizerischen Eidgenossenschaft (SR 101), the version in force from 2024-03-03, as read",
  "https://fedlex.data.admin.ch/filestore/fedlex.data.admin.ch/eli/cc/1999/404/20240303/de/html/fedlex-data-admin-ch-eli-cc-1999-404-20240303-de-html-10.html",
  [
    "Art. 112 Alters‑, Hinterlassenen‑ und Invalidenversicherung",
    "Die Versicherung ist obligatorisch.",
    "Art. 113 Berufliche Vorsorge",
    "Die berufliche Vorsorge ist für Arbeitnehmerinnen und Arbeitnehmer obligatorisch; das Gesetz kann Ausnahmen vorsehen.",
  ],
);

const FICA = ev(
  "U.S. Government Publishing Office, GovInfo: United States Code (2024 edition), 26 U.S.C. § 3101, as read",
  "https://www.govinfo.gov/content/pkg/USCODE-2024-title26/html/USCODE-2024-title26-subtitleC-chap21-subchapA-sec3101.htm",
  [
    "there is hereby imposed on the income of every individual a tax equal to 6.2 percent of the wages",
    "Old-age, survivors, and disability insurance",
  ],
);

export const PENSION_ASSESSMENTS: readonly CuratedRecordInput[] = [
  {
    key: "assessment:ch:compulsion.old_age_pension",
    kind: "assessment",
    metric: null,
    body: {
      place: { scheme: "iso_3166_1", value: "CH" },
      rubric: "compulsion.old_age_pension",
      rubricVersion: 1,
      value: 3,
      validFrom: "2024-03-03",
      validTo: null,
      method: "coded",
      confidence: "high",
      confidenceNote: {
        en: "The Constitution states in so many words that old-age and survivors' insurance is obligatory and that occupational pensions are obligatory for employees.",
      },
      reading: {
        en: "Old-age, survivors' and disability insurance is obligatory and financed by the insured's contributions, half paid by the employer, and by the Confederation: a duty to a public scheme with no way out (point 3). A second, occupational tier is also obligatory for employees, with their employer insuring them with a pension fund of its choosing; that tier is named here and does not change the point.",
      },
      provisions: [
        {
          act: { authority: "ch", scheme: "systematic_number", value: "101" },
          provision: "art_112",
          label: "BV Art. 112",
        },
        {
          act: { authority: "ch", scheme: "systematic_number", value: "101" },
          provision: "art_113",
          label: "BV Art. 113",
        },
      ],
      quotes: [
        {
          text: "Die Versicherung ist obligatorisch.",
          lang: "de",
          translation: { en: "The insurance is obligatory." },
          evidence: [BV],
        },
        {
          text: "Die berufliche Vorsorge ist für Arbeitnehmerinnen und Arbeitnehmer obligatorisch; das Gesetz kann Ausnahmen vorsehen.",
          lang: "de",
          translation: {
            en: "Occupational pension provision is obligatory for employees; the law may provide exceptions.",
          },
          evidence: [BV],
        },
      ],
      open: {
        en: "The constitution leaves the details and the exceptions to statute (AHVG, BVG), which were not read.",
      },
      codedBy: CODER,
      reviewedBy: [],
      evidence: [BV],
    },
  },
  {
    key: "assessment:us:compulsion.old_age_pension",
    kind: "assessment",
    metric: null,
    body: {
      place: { scheme: "iso_3166_1", value: "US" },
      rubric: "compulsion.old_age_pension",
      rubricVersion: 1,
      value: 3,
      validFrom: "2024-01-01",
      validTo: null,
      method: "coded",
      confidence: "medium",
      confidenceNote: {
        en: "The section imposes the tax on the wages of every individual; whether any class of workers is exempt, and so has a way out, is in other sections not read.",
      },
      reading: {
        en: "A tax of 6.2 percent of wages is imposed on the income of every individual for old-age, survivors and disability insurance, and a further 1.45 percent for hospital insurance: a contribution to a public scheme with no alternative the section offers (point 3).",
      },
      provisions: [
        {
          act: {
            authority: "us",
            scheme: "official_url",
            value:
              "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section3101",
          },
          provision: null,
          label: "26 U.S.C. § 3101",
        },
      ],
      quotes: [
        {
          text: "there is hereby imposed on the income of every individual a tax equal to 6.2 percent of the wages (as defined in section 3121(a)) received by the individual with respect to employment",
          lang: "en",
          evidence: [FICA],
        },
      ],
      open: {
        en: "Exemptions (for some religious groups, foreign government employees and others) and the self-employed's own tax (section 1401) were not read; a reader of those would confirm point 3 or lower it.",
      },
      codedBy: CODER,
      reviewedBy: [],
      evidence: [FICA],
    },
  },
];

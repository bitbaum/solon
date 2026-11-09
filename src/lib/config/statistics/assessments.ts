/**
 * The curated assessments: legal features read from a statute and placed on a
 * rubric's scale (src/lib/config/statistics/rubrics.ts). Each says what it was
 * read from (the articles and the words, each with the page and the words that
 * page must still hold), how sure the reader is and why, and who coded it. A
 * coding is shown as settled only when a person other than the coder is named
 * in `reviewedBy`; until then it says it is awaiting a second reader. Nobody
 * adds their own name to `reviewedBy`: the checker does, in their own commit.
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
    "Art. 59 Militär- und Ersatzdienst",
    "Jeder Schweizer ist verpflichtet, Militärdienst zu leisten. Das Gesetz sieht einen zivilen Ersatzdienst vor.",
    "Für Schweizerinnen ist der Militärdienst freiwillig.",
    "Schweizer, die weder Militär- noch Ersatzdienst leisten, schulden eine Abgabe.",
  ],
);

const KVTS = ev(
  "Riigi Teataja: Kaitseväeteenistuse seadus (Defence Forces Service Act), the version in force from 2026-10-01, machine-readable text as read",
  "https://www.riigiteataja.ee/public-api/api/v1/akt/111072026020/blob-xml",
  [
    "Kaitseväekohustus on Eesti kodaniku kohustus osaleda riigikaitses",
    "18–60-aastane meessoost isik",
    "Asendusteenistus on usulistel või kõlbelistel põhjustel kaitseväeteenistusest keeldunud",
    "naissoost isiku vabatahtlik kaitseväeteenistusse asumine",
  ],
);

const USC = (section: string, expect: string[]) =>
  ev(
    `U.S. Government Publishing Office, GovInfo: United States Code (2024 edition), 50 U.S.C. § ${section}, as read`,
    `https://www.govinfo.gov/content/pkg/USCODE-2024-title50/html/USCODE-2024-title50-chap49-sec${section}.htm`,
    expect,
  );

export const ASSESSMENT_RECORDS: readonly CuratedRecordInput[] = [
  {
    key: "assessment:ch:compulsion.military_service",
    kind: "assessment",
    metric: null,
    body: {
      place: { scheme: "iso_3166_1", value: "CH" },
      rubric: "compulsion.military_service",
      rubricVersion: 1,
      value: 2,
      validFrom: "2024-03-03",
      validTo: null,
      method: "coded",
      confidence: "high",
      confidenceNote: {
        en: "The Federal Constitution states the duty, the civilian alternative and the levy in one article.",
      },
      reading: {
        en: "Every Swiss man is obliged to do military service and the law provides a civilian replacement service; for Swiss women it is voluntary; those who do neither owe a levy. A standing duty with an alternative: point 2. The levy is part of the alternative's cost and does not change the point.",
      },
      provisions: [
        {
          act: { authority: "ch", scheme: "systematic_number", value: "101" },
          provision: "art_59",
          label: "BV Art. 59",
        },
      ],
      quotes: [
        {
          text: "1 Jeder Schweizer ist verpflichtet, Militärdienst zu leisten. Das Gesetz sieht einen zivilen Ersatzdienst vor.\n2 Für Schweizerinnen ist der Militärdienst freiwillig.\n3 Schweizer, die weder Militär- noch Ersatzdienst leisten, schulden eine Abgabe.",
          lang: "de",
          translation: {
            en: "1 Every Swiss man is obliged to do military service. The law provides for a civilian replacement service.\n2 For Swiss women, military service is voluntary.\n3 Swiss men who do neither military nor replacement service owe a levy.",
          },
          evidence: [BV],
        },
      ],
      open: {
        en: "The constitution states the duty; the statutes on the army and on civilian service decide who serves in practice and for how long. Those were not read.",
      },
      codedBy: CODER,
      reviewedBy: [],
      evidence: [BV],
    },
  },
  {
    key: "assessment:ee:compulsion.military_service",
    kind: "assessment",
    metric: null,
    body: {
      place: { scheme: "iso_3166_1", value: "EE" },
      rubric: "compulsion.military_service",
      rubricVersion: 1,
      value: 2,
      validFrom: "2026-10-01",
      validTo: null,
      method: "coded",
      confidence: "high",
      confidenceNote: {
        en: "The Defence Forces Service Act states the duty, who is covered, and the alternative service in its first sections.",
      },
      reading: {
        en: "National defence is the duty of Estonian citizens; men aged 18 to 60 are liable, and conscript service is the duty of men while women may join voluntarily; those who refuse on religious or moral grounds do a non-military alternative service. A standing duty with an alternative: point 2.",
      },
      provisions: [
        {
          act: { authority: "ee", scheme: "publisher_ref", value: "riigiteataja:1003784" },
          provision: "para2",
          label: "KVTS § 2",
        },
        {
          act: { authority: "ee", scheme: "publisher_ref", value: "riigiteataja:1003784" },
          provision: "para4",
          label: "KVTS § 4",
        },
        {
          act: { authority: "ee", scheme: "publisher_ref", value: "riigiteataja:1003784" },
          provision: "para5",
          label: "KVTS § 5",
        },
      ],
      quotes: [
        {
          text: "Kaitseväekohustus on Eesti kodaniku kohustus osaleda riigikaitses ja käesolevas seaduses sätestatud toimingute tegemises. [...] Kaitseväekohustuslane on: [...] 18–60-aastane meessoost isik",
          lang: "et",
          translation: {
            en: "The defence obligation is the duty of an Estonian citizen to take part in national defence and in the acts this Act sets out. [...] A person liable is: [...] a male person aged 18 to 60",
          },
          evidence: [KVTS],
        },
        {
          text: "Asendusteenistus on usulistel või kõlbelistel põhjustel kaitseväeteenistusest keeldunud kaitseväekohustuslase kohustuslik mittesõjalise iseloomuga väljaõppes või teenistuses osalemine.",
          lang: "et",
          translation: {
            en: "Alternative service is the compulsory participation, in non-military training or service, of a person liable who has refused defence service on religious or moral grounds.",
          },
          evidence: [KVTS],
        },
      ],
      open: {
        en: "The alternative is open to those who refuse on religious or moral grounds; whether that is available to anyone who asks was not read. The Alternative Service Act and the practice of the authority were not read.",
      },
      codedBy: CODER,
      reviewedBy: [],
      evidence: [KVTS],
    },
  },
  {
    key: "assessment:us:compulsion.military_service",
    kind: "assessment",
    metric: null,
    body: {
      place: { scheme: "iso_3166_1", value: "US" },
      rubric: "compulsion.military_service",
      rubricVersion: 1,
      value: 1,
      validFrom: "2024-01-01",
      validTo: null,
      method: "coded",
      confidence: "medium",
      confidenceNote: {
        en: "The statute makes registration a duty and registrants liable for service, but the sections read do not say whether anyone may be inducted today. A reader of the induction provisions and the current regulations should confirm point 1 rather than 2.",
      },
      reading: {
        en: "Every male citizen, and other male residents, aged 18 to 26 must register; every person required to register is liable for training and service in the armed forces. That is registration and liability: point 1. Whether induction is currently authorised is not in the sections read.",
      },
      provisions: [
        {
          act: {
            authority: "us",
            scheme: "official_url",
            value:
              "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title50-section3802",
          },
          provision: null,
          label: "50 U.S.C. § 3802",
        },
        {
          act: {
            authority: "us",
            scheme: "official_url",
            value:
              "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title50-section3803",
          },
          provision: null,
          label: "50 U.S.C. § 3803",
        },
      ],
      quotes: [
        {
          text: "it shall be the duty of every male citizen of the United States, and every other male person residing in the United States, who, on the day or days fixed for the first or any subsequent registration, is between the ages of eighteen and twenty-six, to present himself for and submit to registration",
          lang: "en",
          evidence: [
            USC("3802", [
              "it shall be the duty of every male citizen of the United States, and every other male person residing in the United States",
              "between the ages of eighteen and twenty-six, to present himself for and submit to registration",
            ]),
          ],
        },
        {
          text: "every person required to register pursuant to section 3802 of this chapter [...] shall be liable for training and service in the Armed Forces of the United States",
          lang: "en",
          evidence: [
            USC("3803", [
              "every person required to register pursuant to section 3802 of this chapter",
              "shall be liable for training and service in the Armed Forces of the United States",
            ]),
          ],
        },
      ],
      open: {
        en: "Whether anyone may be inducted now, and what exemptions and alternatives the rest of the chapter provides, were not read. If induction is authorised and there is a standing duty to serve, the point would be higher.",
      },
      codedBy: CODER,
      reviewedBy: [],
      evidence: [
        USC("3802", ["Registration"]),
        USC("3803", ["Persons liable for training and service"]),
      ],
    },
  },
];

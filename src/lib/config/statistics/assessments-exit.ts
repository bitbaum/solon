/**
 * Codings on the exit rubrics (see assessments.ts for the rules every coding
 * follows): how a citizen gives up their citizenship, and whether leaving is
 * taxed. Switzerland and Estonia are not coded on the departure tax: the
 * rubric codes 0 only from a reading of the whole tax act, which has not
 * been done.
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

const BUEG = ev(
  "Fedlex: Bundesgesetz über das Schweizer Bürgerrecht (BüG, SR 141.0), the version in force from 2023-09-01, as read",
  "https://fedlex.data.admin.ch/filestore/fedlex.data.admin.ch/eli/cc/2016/404/20230901/de/html/fedlex-data-admin-ch-eli-cc-2016-404-20230901-de-html.html",
  [
    "Art. 37 Entlassungsgesuch und -beschluss",
    "Schweizer Bürgerinnen und Bürger werden auf Begehren aus dem Bürgerrecht entlassen, wenn sie keinen Aufenthalt in der Schweiz haben",
    "Die Entlassung wird von der Behörde des Heimatkantons ausgesprochen.",
  ],
);

const KODS = ev(
  "Riigi Teataja: Kodakondsuse seadus (Citizenship Act), the version in force from 2025-07-06, machine-readable text as read",
  "https://www.riigiteataja.ee/public-api/api/v1/akt/126062025008/blob-xml",
  [
    "Piirangud Eesti kodakondsusest vabastamisel",
    "Isikut võidakse Eesti kodakondsusest mitte vabastada, kui",
    "tagajärjeks on kodakondsusetus",
    "isikul on täitmata kohustused Eesti riigi ees",
    "Eesti kodakondsusest vabastamise otsustab Vabariigi Valitsus.",
    "Eesti kodakondsuse kaotanuks mõne muu riigi kodakondsuse vastuvõtmise",
  ],
);

const INA = ev(
  "U.S. Government Publishing Office, GovInfo: United States Code (2024 edition), 8 U.S.C. § 1481, as read",
  "https://www.govinfo.gov/content/pkg/USCODE-2024-title8/html/USCODE-2024-title8-chap12-subchapIII-partIII-sec1481.htm",
  [
    "making a formal renunciation of nationality before a diplomatic or consular officer of the United States in a foreign state",
    "obtaining naturalization in a foreign state upon his own application",
    "with the intention of relinquishing United States nationality",
  ],
);

const IRC877A = ev(
  "U.S. Government Publishing Office, GovInfo: United States Code (2024 edition), 26 U.S.C. § 877A, as read",
  "https://www.govinfo.gov/content/pkg/USCODE-2024-title26/html/USCODE-2024-title26-subtitleA-chap1-subchapN-partII-subpartA-sec877A.htm",
  [
    "All property of a covered expatriate shall be treated as sold on the day before the expatriation date for its fair market value.",
    "shall be reduced (but not below zero) by $600,000",
    "any United States citizen who relinquishes his citizenship",
  ],
);

const usAct = (title: number, section: string) => ({
  authority: "us",
  scheme: "official_url",
  value: `https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title${title}-section${section}`,
});

const coding = (
  key: string,
  place: string,
  rubric: string,
  body: Omit<
    Extract<CuratedRecordInput, { kind: "assessment" }>["body"],
    "place" | "rubric" | "rubricVersion" | "method" | "codedBy" | "reviewedBy"
  >,
): CuratedRecordInput => ({
  key,
  kind: "assessment",
  metric: null,
  body: {
    place: { scheme: "iso_3166_1", value: place },
    rubric,
    rubricVersion: 1,
    method: "coded",
    codedBy: CODER,
    reviewedBy: [],
    ...body,
  },
});

export const EXIT_ASSESSMENTS: readonly CuratedRecordInput[] = [
  coding("assessment:ch:exit.renounce_citizenship", "CH", "exit.renounce_citizenship", {
    value: 1,
    validFrom: "2023-09-01",
    validTo: null,
    confidence: "high",
    confidenceNote: {
      en: "One article states who is released, on what conditions, and by whom, with no power to refuse once they are met.",
    },
    reading: {
      en: "A Swiss citizen is released on request if they have no residence in Switzerland and hold, or have been assured of, another citizenship; the authority of the home canton pronounces the release. The law says the person is released (not may be), so the outcome is not discretionary, but release requires living abroad: point 1.",
    },
    provisions: [
      {
        act: { authority: "ch", scheme: "systematic_number", value: "141.0" },
        provision: "art_37",
        label: "BüG Art. 37",
      },
    ],
    quotes: [
      {
        text: "Schweizer Bürgerinnen und Bürger werden auf Begehren aus dem Bürgerrecht entlassen, wenn sie keinen Aufenthalt in der Schweiz haben und eine andere Staatsangehörigkeit besitzen oder ihnen eine solche zugesichert ist.",
        lang: "de",
        translation: {
          en: "Swiss citizens are released from citizenship on request if they have no residence in Switzerland and hold another nationality or have been assured of one.",
        },
        evidence: [BUEG],
      },
    ],
    open: {
      en: "The fee and how long a release takes are set elsewhere and were not read.",
    },
    evidence: [BUEG],
  }),
  coding("assessment:ee:exit.renounce_citizenship", "EE", "exit.renounce_citizenship", {
    value: 1,
    validFrom: "2025-07-06",
    validTo: null,
    confidence: "medium",
    confidenceNote: {
      en: "The act offers two ways out that point to different codes, and which one governs in practice is not settled by the text alone.",
    },
    reading: {
      en: "Release on application is decided by the Government, which may refuse it if the person would become stateless or has unfulfilled duties to the state (§ 26, § 27); on that path alone this would be point 2. But a person who takes another country's citizenship is deemed by law to have lost Estonian citizenship (§ 29), with no power to refuse. The rubric codes the way least burdened: point 1, conditional on acquiring another citizenship.",
    },
    provisions: [
      {
        act: { authority: "ee", scheme: "publisher_ref", value: "riigiteataja:161903" },
        provision: "para26",
        label: "KodS § 26",
      },
      {
        act: { authority: "ee", scheme: "publisher_ref", value: "riigiteataja:161903" },
        provision: "para29",
        label: "KodS § 29",
      },
    ],
    quotes: [
      {
        text: "Isikut võidakse Eesti kodakondsusest mitte vabastada, kui: 1) tagajärjeks on kodakondsusetus; 2) isikul on täitmata kohustused Eesti riigi ees;",
        lang: "et",
        translation: {
          en: "A person may be refused release from Estonian citizenship if: 1) the result would be statelessness; 2) the person has unfulfilled duties to the Estonian state;",
        },
        evidence: [KODS],
      },
      {
        text: "Isik loetakse Vabariigi Valitsuse volitatud valitsusasutuse poolt Eesti kodakondsuse kaotanuks mõne muu riigi kodakondsuse vastuvõtmise või Eesti kodakondsusest loobumisega mõne muu riigi kodakondsuse kasuks.",
        lang: "et",
        translation: {
          en: "The government agency authorised by the Government of the Republic deems a person to have lost Estonian citizenship on their accepting another country's citizenship or renouncing Estonian citizenship in favour of another country's.",
        },
        evidence: [KODS],
      },
    ],
    open: {
      en: "Whether the release route's power to refuse for unfulfilled duties is used, and against whom, is a question of practice, not of the text. A reader who decides the release route governs would code 2.",
    },
    evidence: [KODS],
  }),
  coding("assessment:us:exit.renounce_citizenship", "US", "exit.renounce_citizenship", {
    value: 1,
    validFrom: "2024-01-01",
    validTo: null,
    confidence: "high",
    confidenceNote: {
      en: "The section lists the acts that end nationality; the formal renunciation is one of them and its only conditions are where and before whom it is made.",
    },
    reading: {
      en: "A national loses US nationality by voluntarily performing one of the listed acts with the intention of giving it up, among them making a formal renunciation before a US diplomatic or consular officer in a foreign state, or taking another country's nationality as an adult. Renunciation in the United States itself is possible only in a state of war. No other nationality is required, but the declaration must be made abroad: point 1. Giving it up can trigger the tax on leaving (exit.departure_tax).",
    },
    provisions: [{ act: usAct(8, "1481"), provision: null, label: "8 U.S.C. § 1481" }],
    quotes: [
      {
        text: "making a formal renunciation of nationality before a diplomatic or consular officer of the United States in a foreign state, in such form as may be prescribed by the Secretary of State",
        lang: "en",
        evidence: [INA],
      },
    ],
    open: {
      en: "The fee the Department of State charges for documenting a renunciation was not read here.",
    },
    evidence: [INA],
  }),
  coding("assessment:us:exit.departure_tax", "US", "exit.departure_tax", {
    value: 2,
    validFrom: "2024-01-01",
    validTo: null,
    confidence: "high",
    confidenceNote: {
      en: "The section says in one sentence that all property of a covered expatriate is treated as sold.",
    },
    reading: {
      en: "All property of a covered expatriate (a citizen who gives up citizenship, or a long-term resident who gives up residence, and who meets the net-worth, tax-liability or certification tests of section 877) is treated as sold the day before leaving, and the gain is taxed above an exclusion of $600,000, adjusted for inflation. All assets: point 2. Most people who leave are not covered expatriates; the threshold does not change the point.",
    },
    provisions: [{ act: usAct(26, "877A"), provision: null, label: "26 U.S.C. § 877A" }],
    quotes: [
      {
        text: "All property of a covered expatriate shall be treated as sold on the day before the expatriation date for its fair market value.",
        lang: "en",
        evidence: [IRC877A],
      },
    ],
    open: {
      en: "The tests in section 877(a)(2) that make someone a covered expatriate, and the current inflation-adjusted exclusion, were not read here.",
    },
    evidence: [IRC877A],
  }),
];

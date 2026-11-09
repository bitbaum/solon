/**
 * The curated events: things that happened to the law of a place, each with
 * what changed, how it came about, who stood where and what was said about it.
 * Every line carries the page it was read on, on the day written in `read`;
 * nothing here comes from memory. A claim about an effect is a `reported`
 * line with who made it, never a fact in Solon's voice.
 *
 * Text is English; a reader in another language sees the English, as the
 * page says. Names of bodies, parties and acts keep their own spelling.
 */
import type { CuratedRecordInput } from "@/lib/statistics/records";

const READ = "2026-11-09";
const ev = (publisher: string, url: string, expect: string[] = []) => ({
  publisher,
  url,
  read: READ,
  expect,
});

const SWISSVOTES = "Swissvotes, Année Politique Suisse, University of Bern (CC BY 4.0)";
const RIIGIKOGU = "Riigikogu (Estonian Parliament), open data";
const RIIGI_TEATAJA = "Riigi Teataja (State Gazette)";
const GOVINFO = "U.S. Government Publishing Office, GovInfo";
const HOUSE_CLERK = "Clerk of the U.S. House of Representatives";
const CSM = "The Christian Science Monitor, 17 March 1982";
const SCIAM =
  "Scientific American, “More Guns Do Not Stop More Crimes, Evidence Shows” (October 2017)";

const EE_VOTE = ev(
  RIIGIKOGU,
  "https://api.riigikogu.ee/api/votings/897b2d34-2e14-446b-9d6d-998bdff65f3e",
  [
    '"inFavor":58',
    '"against":33',
    '"present":91',
    '"mark":148',
    "Eesti Reformierakonna fraktsioon",
    "Isamaa fraktsioon",
  ],
);
const EE_BILL = ev(
  RIIGIKOGU,
  "https://api.riigikogu.ee/api/volumes/drafts/7a857bd6-b8da-467a-8b6c-c693e3d3fcdd",
  [
    "Tulumaksuseaduse ja kaitseväeteenistuse seaduse muutmise seadus 148 SE",
    '"initiated":"2023-05-11"',
    "Vabariigi Valitsus",
    "Maris Lauri",
    "Rahanduskomisjon",
    "lähtuvalt koalitsioonileppest",
  ],
);
const EE_ACT = ev(
  RIIGI_TEATAJA,
  "https://www.riigiteataja.ee/public-api/api/v1/akt/130062023107/blob-xml",
  [
    "Tulumaksu määr, välja arvatud lõigetes 2 ja 5 ning § 43 lõikes 4 nimetatud juhtudel, on 22%",
    "jõustuvad 2025. aasta 1. jaanuaril",
    "130062023107",
    "2023-06-30",
  ],
);

const US_BILL = ev(
  GOVINFO,
  "https://www.govinfo.gov/bulkdata/BILLSTATUS/115/hr/BILLSTATUS-115hr1.xml",
  [
    "Rep. Brady, Kevin [R-TX-8]",
    "Agreed to by the Yeas and Nays: 224 - 201 (Roll no. 699)",
    "Yea-Nay Vote. 51 - 48. Record Vote Number: 323",
    "Passed by the Yeas and Nays: 227 - 205 (Roll no. 637)",
    "Passed Senate with an amendment by Yea-Nay Vote. 51 - 49. Record Vote Number: 303",
    "Agreed to by the Yeas and Nays: 227 - 203 (Roll no. 692)",
    "Signed by President.",
  ],
);
const US_LAW = ev(
  GOVINFO,
  "https://www.govinfo.gov/content/pkg/PLAW-115publ97/html/PLAW-115publ97.htm",
  [
    "Modifications for Taxable Years 2018 Through 2025",
    "Over $500,000",
    "$150,689.50, plus 37% of the excess over $500,000",
    "taxable year beginning after December 31, 2017, and before January 1, 2026",
    "rate below 39.6 percent",
    "Approved December 22, 2017",
  ],
);
const US_ROLL = ev(HOUSE_CLERK, "https://clerk.house.gov/evs/2017/roll699.xml", [
  "<vote-desc>Tax Cuts and Jobs Act</vote-desc>",
  "<party>Republican</party><yea-total>224</yea-total><nay-total>12</nay-total>",
  "<party>Democratic</party><yea-total>0</yea-total><nay-total>189</nay-total>",
]);

const SV_2011 = ev(SWISSVOTES, "https://swissvotes.ch/vote/554.00", [
  "Abgelehnt (43.70% Ja-Stimmen und 5.5 von 23 Standesstimmen)",
  "Stimmbeteiligung 49.12%",
  "Unterschriften 106’037",
  "Position des Nationalrats Ablehnend (69 Ja, 119 Nein)",
  "Position des Ständerats Ablehnend (11 Ja, 30 Nein)",
  "Ja CSP EVP GLP GPS PdA SPS",
  "Nein BDP CVP EDU FDP FPS KVP Lega SD SVP",
]);
const SV_2019 = ev(SWISSVOTES, "https://swissvotes.ch/vote/628.00", [
  "Angenommen (63.74% Ja-Stimmen)",
  "Stimmbeteiligung 43.88%",
  "Unterschriften 125’233",
  "Position des Nationalrats Befürwortend (120 Ja, 69 Nein)",
  "Position des Ständerats Befürwortend (34 Ja, 6 Nein)",
  "Interessengemeinschaft Schiessen Schweiz",
  "Ja BDP CVP EVP FDP GLP GPS KVP SPS",
  "Nein EDU FPS SD SVP",
]);

const KN_CSM = ev(CSM, "https://www.csmonitor.com/1982/0317/031747.html", [
  "passed by a unanimous vote of the City Council, takes effect March 25",
  "Police Chief Robert Ruble",
  "no idea",
  "punishable by a fine of up to $50",
  "Jerry Wortham",
  "a reaction to a vote last year by Morton Grove",
  "John Adkins",
  "Paul Lavrakas",
]);
const KN_SCIAM = ev(
  SCIAM,
  "https://www.scientificamerican.com/article/more-guns-do-not-stop-more-crimes-evidence-shows/",
  [
    "On March 15, 1982",
    "24 miles north of Atlanta",
    "burglaries in Kennesaw dropped by more than half",
    "75 percent more burglaries",
    "the purported crime drop disappeared",
    "the rule has never been enforced",
  ],
);
const KN_WIKI = ev(
  "Wikipedia, “Kennesaw, Georgia”, section “Gun law” (quoting Sec. 34-21 of the city's code)",
  "https://en.wikipedia.org/wiki/Kennesaw,_Georgia#Gun_law",
  [
    "every head of household residing in the city limits is required to maintain a firearm, together with ammunition therefore",
    "who are paupers or who conscientiously oppose maintaining firearms",
  ],
);

export const EVENT_RECORDS: readonly CuratedRecordInput[] = [
  {
    key: "event:ee:income-tax-22-percent-2023",
    kind: "event",
    metric: "tax.income.top_rate",
    body: {
      slug: "ee-income-tax-22-percent-2023",
      place: { scheme: "iso_3166_1", value: "EE" },
      category: "statute",
      on: "2023-06-19",
      effective: "2025-01-01",
      title: { en: "Estonia raises its income tax rate from 20% to 22%" },
      summary: {
        en: "On 11 May 2023 the Government of the Republic put a bill before the Riigikogu whose stated aim was to abolish costly and inefficient tax reliefs, raise and align the income tax rate, and replace the regressive tax-free allowance with a single one, following the coalition agreement. The Riigikogu adopted it at its sitting of 19 June 2023 by 58 votes to 33; 10 members did not vote. The act was published in Riigi Teataja on 30 June 2023. The new rate applies from 1 January 2025.",
      },
      act: { authority: "ee", scheme: "publisher_ref", value: "riigiteataja:161969" },
      change: {
        law: { en: "Tulumaksuseadus (Income Tax Act)" },
        provision: "§ 4 lg 1",
        before: {
          text: "(1) Tulumaksu määr, välja arvatud lõigetes 2, 4 ja 5 ning § 43 lõikes 4 nimetatud juhtudel, on 20%.",
          lang: "et",
          translation: {
            en: "(1) The income tax rate, except in the cases mentioned in subsections 2, 4 and 5 and in § 43(4), is 20%.",
          },
          evidence: [
            ev(
              RIIGI_TEATAJA,
              "https://www.riigiteataja.ee/public-api/api/v1/akt/102052024014/blob-xml",
              [
                "Tulumaksu määr, välja arvatud lõigetes 2, 4 ja 5 ning § 43 lõikes 4 nimetatud juhtudel, on 20%",
              ],
            ),
          ],
        },
        after: {
          text: "(1) Tulumaksu määr, välja arvatud lõigetes 2 ja 5 ning § 43 lõikes 4 nimetatud juhtudel, on 22%.",
          lang: "et",
          translation: {
            en: "(1) The income tax rate, except in the cases mentioned in subsections 2 and 5 and in § 43(4), is 22%.",
          },
          evidence: [
            EE_ACT,
            ev(
              RIIGI_TEATAJA,
              "https://www.riigiteataja.ee/public-api/api/v1/akt/120122024005/blob-xml",
              [
                "Tulumaksu määr, välja arvatud lõigetes 2 ja 5 ning § 43 lõikes 4 nimetatud juhtudel, on 22%",
              ],
            ),
          ],
        },
      },
      process: [
        {
          on: "2023-05-11",
          step: {
            en: "The Government of the Republic initiates bill 148 SE, “Tulumaksuseaduse ja kaitseväeteenistuse seaduse muutmise seadus”, in the Riigikogu.",
          },
          evidence: [EE_BILL],
        },
        {
          on: "2023-06-19",
          step: {
            en: "The Riigikogu adopts the bill at its sitting of 19 June (the final vote is logged at 04:06 on 20 June).",
          },
          evidence: [EE_VOTE, EE_BILL],
        },
        {
          on: "2023-06-30",
          step: { en: "The act is published in Riigi Teataja (RT I, 30.06.2023, 107)." },
          evidence: [EE_ACT],
        },
        {
          on: "2025-01-01",
          step: {
            en: "The rate of 22% applies. The act sets this date for § 2 points 1–9 and others.",
          },
          evidence: [EE_ACT],
        },
      ],
      votes: [
        {
          body: { en: "Riigikogu (101 members)" },
          on: "2023-06-19",
          question: { en: "Final vote on bill 148 SE" },
          outcome: "adopted",
          for: 58,
          against: 33,
          absent: 10,
          breakdown: [
            { group: "Estonian Reform Party", for: 35, against: 0, absent: 2 },
            { group: "Eesti 200", for: 14, against: 0, absent: 0 },
            { group: "Social Democratic Party", for: 9, against: 0, absent: 0 },
            { group: "Estonian Centre Party", for: 0, against: 10, absent: 6 },
            {
              group: "Conservative People's Party of Estonia (EKRE)",
              for: 0,
              against: 15,
              absent: 2,
            },
            { group: "Isamaa", for: 0, against: 8, absent: 0 },
          ],
          evidence: [EE_VOTE],
        },
      ],
      actors: [
        {
          name: "Vabariigi Valitsus (Government of the Republic)",
          role: "initiator",
          note: {
            en: "Initiated the bill on 11 May 2023. Its stated aim: “to abolish costly and inefficient tax reliefs, raise and align the income tax rate and replace the regressive tax-free income with a single tax-free income, following the coalition agreement”.",
          },
          evidence: [EE_BILL],
        },
        {
          name: "Maris Lauri",
          description: { en: "Member of the Riigikogu" },
          role: "responsible",
          note: { en: "Named in the Riigikogu register as the member responsible for the bill." },
          evidence: [EE_BILL],
        },
        {
          name: "Rahanduskomisjon (Finance Committee)",
          role: "responsible",
          note: { en: "The Riigikogu's leading committee for the bill." },
          evidence: [EE_BILL],
        },
        {
          name: "Estonian Reform Party group",
          role: "voted_for",
          note: { en: "35 voted for; 2 did not vote." },
          evidence: [EE_VOTE],
        },
        {
          name: "Eesti 200 group",
          role: "voted_for",
          note: { en: "All 14 voted for." },
          evidence: [EE_VOTE],
        },
        {
          name: "Social Democratic Party group",
          role: "voted_for",
          note: { en: "All 9 voted for." },
          evidence: [EE_VOTE],
        },
        {
          name: "Estonian Centre Party group",
          role: "voted_against",
          note: { en: "10 voted against; 6 did not vote." },
          evidence: [EE_VOTE],
        },
        {
          name: "Conservative People's Party of Estonia (EKRE) group",
          role: "voted_against",
          note: { en: "15 voted against; 2 did not vote." },
          evidence: [EE_VOTE],
        },
        {
          name: "Isamaa group",
          role: "voted_against",
          note: { en: "All 8 voted against." },
          evidence: [EE_VOTE],
        },
      ],
      series: ["tax.income.top_rate"],
      caveat: {
        en: "The line is the statutory top rate, not what people paid. The same act also abolished tax reliefs and replaced the tax-free allowance, which this series does not show, and the rate rose from 2025, two years after the vote. A change that follows a law is not shown to be caused by it.",
      },
      evidence: [EE_VOTE, EE_BILL, EE_ACT],
    },
  },
  {
    key: "event:us:tax-cuts-and-jobs-act-2017",
    kind: "event",
    metric: "tax.income.top_rate",
    body: {
      slug: "us-tax-cuts-and-jobs-act-2017",
      place: { scheme: "iso_3166_1", value: "US" },
      category: "statute",
      on: "2017-12-22",
      effective: "2018-01-01",
      title: { en: "The United States cuts its top federal income tax rate from 39.6% to 37%" },
      summary: {
        en: "Public Law 115-97, the Tax Cuts and Jobs Act (H.R. 1), rewrote the federal income tax rate tables for taxable years 2018 through 2025. In the new table an unmarried filer's income above $500,000 is taxed at 37%. The 39.6% top rate it replaced still appears in the enacted text's own cross-references. Congress passed it on 20 December 2017; no Democrat voted for it in the House's final vote. It was signed on 22 December. The new rates were set to end after 2025.",
      },
      change: {
        law: { en: "Internal Revenue Code, 26 U.S.C. § 1(j), added by Public Law 115-97 § 11001" },
        provision: "26 U.S.C. § 1(j)(2)(C), taxable years 2018–2025",
        before: null,
        after: {
          text: "Over $500,000 ........ $150,689.50, plus 37% of the excess over $500,000.",
          lang: "en",
          evidence: [US_LAW],
        },
      },
      process: [
        {
          on: "2017-11-02",
          step: { en: "H.R. 1 is introduced in the House by Rep. Kevin Brady (R-TX-8)." },
          evidence: [US_BILL],
        },
        {
          on: "2017-11-16",
          step: { en: "The House passes it, 227 to 205 (Roll no. 637)." },
          evidence: [US_BILL],
        },
        {
          on: "2017-12-02",
          step: { en: "The Senate passes it with an amendment, 51 to 49 (Record vote 303)." },
          evidence: [US_BILL],
        },
        {
          on: "2017-12-19",
          step: {
            en: "The House agrees to the conference report, 227 to 203 (Roll no. 692); the Senate agrees to take it up, 51 to 48 (Record vote 321).",
          },
          evidence: [US_BILL],
        },
        {
          on: "2017-12-20",
          step: {
            en: "The Senate concurs with an amendment, 51 to 48 (Record vote 323); the House agrees to the Senate amendment, 224 to 201 (Roll no. 699).",
          },
          evidence: [US_BILL, US_ROLL],
        },
        { on: "2017-12-22", step: { en: "Signed by the President." }, evidence: [US_BILL] },
        {
          on: "2018-01-01",
          step: {
            en: "The new rate tables apply to taxable years beginning after 31 December 2017 and before 1 January 2026.",
          },
          evidence: [US_LAW],
        },
      ],
      votes: [
        {
          body: { en: "House of Representatives" },
          on: "2017-12-20",
          question: { en: "Motion to concur in the Senate amendment to H.R. 1 (Roll no. 699)" },
          outcome: "adopted",
          for: 224,
          against: 201,
          absent: 7,
          breakdown: [
            { group: "Republicans", for: 224, against: 12, absent: 3 },
            { group: "Democrats", for: 0, against: 189, absent: 4 },
          ],
          evidence: [US_ROLL],
        },
        {
          body: { en: "Senate" },
          on: "2017-12-20",
          question: { en: "Concur in the House amendment with an amendment (Record vote 323)" },
          outcome: "adopted",
          for: 51,
          against: 48,
          evidence: [US_BILL],
        },
      ],
      actors: [
        {
          name: "Rep. Kevin Brady (R-TX-8)",
          description: { en: "Member of the House of Representatives" },
          role: "sponsor",
          note: { en: "Sponsor of H.R. 1." },
          evidence: [US_BILL],
        },
        {
          name: "House Republicans",
          role: "voted_for",
          note: { en: "224 voted for and 12 against on the final House vote; 3 did not vote." },
          evidence: [US_ROLL],
        },
        {
          name: "House Democrats",
          role: "voted_against",
          note: { en: "All 189 voting Democrats voted against; 4 did not vote." },
          evidence: [US_ROLL],
        },
      ],
      series: ["tax.income.top_rate"],
      caveat: {
        en: "The OECD figure covers all levels of government together; the fall of 2.6 percentage points in 2018 equals the cut in the federal rate. The act changed much more than this rate (deductions, business taxes) and its rates were set to lapse after 2025. A line moving after a tax law shows what the rate did, not what people paid or earned.",
      },
      evidence: [US_LAW, US_BILL, US_ROLL],
    },
  },
  {
    key: "event:ch:weapons-initiative-2011",
    kind: "event",
    metric: "crime.homicide.rate",
    body: {
      slug: "ch-weapons-initiative-2011",
      place: { scheme: "iso_3166_1", value: "CH" },
      category: "referendum",
      on: "2011-02-13",
      title: {
        en: "Swiss voters reject the popular initiative “For protection against gun violence”",
      },
      summary: {
        en: "On 13 February 2011 the people and cantons of Switzerland voted on the popular initiative “Für den Schutz vor Waffengewalt”, which a group of organisations had put to the vote with 106,037 signatures collected in 538 days. The Federal Council and both chambers of Parliament recommended rejection. 43.70% of voters said yes and 5.5 of 23 cantonal votes, so it failed on both counts. Turnout was 49.12%. No law changed.",
      },
      act: { authority: "ch", scheme: "systematic_number", value: "514.54" },
      process: [
        {
          on: "2011-02-13",
          step: {
            en: "Popular vote: rejected by 43.70% yes, and by cantons 5.5 yes to 17.5 no. The cantons of Basel-Stadt, Geneva, Jura, Neuchâtel, Vaud and Zürich voted yes.",
          },
          evidence: [SV_2011],
        },
      ],
      votes: [
        {
          body: { en: "National Council" },
          on: null,
          question: { en: "Parliament's position on the initiative (business 09.098)" },
          outcome: "rejected",
          for: 69,
          against: 119,
          evidence: [SV_2011],
        },
        {
          body: { en: "Council of States" },
          on: null,
          question: { en: "Parliament's position on the initiative (business 09.098)" },
          outcome: "rejected",
          for: 11,
          against: 30,
          evidence: [SV_2011],
        },
        {
          body: { en: "People and cantons" },
          on: "2011-02-13",
          question: { en: "Federal popular initiative “Für den Schutz vor Waffengewalt”" },
          outcome: "rejected",
          forPercent: 43.7,
          turnoutPercent: 49.12,
          evidence: [SV_2011],
        },
      ],
      actors: [
        {
          name: "Various organisations (“Verschiedene Organisationen”)",
          role: "initiator",
          note: { en: "Collected 106,037 signatures in 538 days." },
          evidence: [SV_2011],
        },
        { name: "Federal Council", role: "recommends_no", evidence: [SV_2011] },
        { name: "Parliament", role: "recommends_no", evidence: [SV_2011] },
        ...[
          "CSP (Christian Social Party)",
          "EVP (Evangelical People's Party)",
          "GLP (Green Liberal Party)",
          "GPS (Green Party)",
          "PdA (Swiss Party of Labour)",
          "SPS (Social Democratic Party)",
          "SGB (Swiss Federation of Trade Unions)",
          "TravS (Travail.Suisse)",
          "GSoA (Group for a Switzerland without an Army)",
        ].map((name) => ({ name, role: "recommends_yes" as const, evidence: [SV_2011] })),
        ...[
          "BDP (Conservative Democratic Party)",
          "CVP (Christian Democratic People's Party)",
          "EDU (Federal Democratic Union)",
          "FDP (The Liberals)",
          "FPS (Freedom Party)",
          "KVP (Catholic People's Party)",
          "Lega (Lega dei Ticinesi)",
          "SD (Swiss Democrats)",
          "SVP (Swiss People's Party)",
          "SBV (Swiss Farmers' Union)",
          "SGV (Swiss Trade Association)",
        ].map((name) => ({ name, role: "recommends_no" as const, evidence: [SV_2011] })),
      ],
      reported: [
        {
          kind: "context",
          by: SWISSVOTES,
          statement: {
            en: "Swissvotes puts the voters' share behind the yes recommendations at 34.0% of the electorate. Several cantonal CVP sections, one young CVP section and three young FDP sections recommended yes against their parties' line.",
          },
          evidence: [SV_2011],
        },
      ],
      series: ["crime.homicide.rate"],
      caveat: {
        en: "The initiative was rejected, so no law changed and nothing in the line can be an effect of it. The national homicide rate is shown for context only: it counts every intentional homicide, with or without a firearm.",
      },
      evidence: [SV_2011],
    },
  },
  {
    key: "event:ch:eu-weapons-directive-2019",
    kind: "event",
    metric: "crime.homicide.rate",
    body: {
      slug: "ch-eu-weapons-directive-2019",
      place: { scheme: "iso_3166_1", value: "CH" },
      category: "referendum",
      on: "2019-05-19",
      title: {
        en: "Swiss voters accept adopting the EU weapons directive (a Schengen development)",
      },
      summary: {
        en: "Parliament approved the exchange of notes with the EU on adopting Directive (EU) 2017/853, which amends the EU weapons directive, as a development of the Schengen acquis. A referendum was called with 125,233 signatures collected in 100 days by the “Interessengemeinschaft Schiessen Schweiz”, which Swissvotes describes as shaped by shooting associations and SVP politicians. On 19 May 2019, 63.74% of voters said yes, and every canton but Ticino voted yes. Turnout was 43.88%.",
      },
      act: { authority: "ch", scheme: "systematic_number", value: "514.54" },
      change: {
        law: { en: "Federal Act on Weapons, Weapons Accessories and Ammunition (SR 514.54)" },
        provision: "Federal decree approving the exchange of notes on Directive (EU) 2017/853",
        before: null,
        after: {
          text: "Bundesbeschluss über die Genehmigung und die Umsetzung des Notenaustauschs zwischen der Schweiz und der EU betreffend die Übernahme der Richtlinie (EU) 2017/853 zur Änderung der EU-Waffenrichtlinie (Weiterentwicklung des Schengen-Besitzstands)",
          lang: "de",
          translation: {
            en: "Federal decree on approving and implementing the exchange of notes between Switzerland and the EU on adopting Directive (EU) 2017/853 amending the EU Weapons Directive (development of the Schengen acquis)",
          },
          evidence: [SV_2019],
        },
      },
      process: [
        {
          on: "2019-05-19",
          step: {
            en: "Popular vote on the optional referendum: accepted by 63.74% yes. A majority of cantons was not required: the cantonal tally was 22 yes to 1 no, Ticino voting no.",
          },
          evidence: [SV_2019],
        },
      ],
      votes: [
        {
          body: { en: "National Council" },
          on: null,
          question: { en: "Parliament's position on the decree (business 18.027)" },
          outcome: "adopted",
          for: 120,
          against: 69,
          evidence: [SV_2019],
        },
        {
          body: { en: "Council of States" },
          on: null,
          question: { en: "Parliament's position on the decree (business 18.027)" },
          outcome: "adopted",
          for: 34,
          against: 6,
          evidence: [SV_2019],
        },
        {
          body: { en: "Voters" },
          on: "2019-05-19",
          question: { en: "Optional referendum on the federal decree" },
          outcome: "adopted",
          forPercent: 63.74,
          turnoutPercent: 43.88,
          evidence: [SV_2019],
        },
      ],
      actors: [
        {
          name: "Interessengemeinschaft Schiessen Schweiz",
          description: {
            en: "Called the referendum; Swissvotes: shaped by shooting associations and SVP politicians",
          },
          role: "initiator",
          note: { en: "Collected 125,233 signatures in 100 days." },
          evidence: [SV_2019],
        },
        { name: "Federal Council", role: "recommends_yes", evidence: [SV_2019] },
        { name: "Parliament", role: "recommends_yes", evidence: [SV_2019] },
        ...[
          "BDP (Conservative Democratic Party)",
          "CVP (Christian Democratic People's Party)",
          "EVP (Evangelical People's Party)",
          "FDP (The Liberals)",
          "GLP (Green Liberal Party)",
          "GPS (Green Party)",
          "KVP (Catholic People's Party)",
          "SPS (Social Democratic Party)",
          "economiesuisse (eco)",
          "KDK (Conference of Cantonal Governments)",
          "SAV (Swiss Employers' Association)",
          "SGB (Swiss Federation of Trade Unions)",
          "SGV (Swiss Trade Association)",
          "SSV (Swiss Association of Cities)",
          "Travail.Suisse",
          "Hotelleriesuisse",
          "Gastrosuisse",
          "Swiss Farmers' and Rural Women's Association (SBLV)",
        ].map((name) => ({ name, role: "recommends_yes" as const, evidence: [SV_2019] })),
        ...[
          "EDU (Federal Democratic Union)",
          "FPS (Freedom Party)",
          "SD (Swiss Democrats)",
          "SVP (Swiss People's Party)",
          "Young Liberals of the cantons of Schwyz and Geneva",
          "Schweizerische Offiziersgesellschaft (Swiss Officers' Society)",
          "Schweizerischer Unteroffiziersverband (Swiss NCO Association)",
          "Jagd Schweiz (hunting)",
          "Pro Tell",
          "Schweizer Büchsenmacher- und Waffenfachhändlerverband (gunsmiths and arms dealers)",
        ].map((name) => ({ name, role: "recommends_no" as const, evidence: [SV_2019] })),
      ],
      reported: [
        {
          kind: "context",
          by: SWISSVOTES,
          statement: {
            en: "Swissvotes summarises the campaign as “security and smooth cooperation with Europe more important than gun tradition”. The yes camp's share of voters was 64.5%. One section of the young FDP (Zürich) departed from its party and recommended no.",
          },
          evidence: [SV_2019],
        },
      ],
      series: ["crime.homicide.rate"],
      caveat: {
        en: "Solon has not read how and when the new rules reached the weapons act, and a national homicide rate counts every intentional homicide, with or without a firearm. The line is context, not a test of the law.",
      },
      evidence: [SV_2019],
    },
  },
  {
    key: "event:us:kennesaw-gun-ordinance-1982",
    kind: "event",
    metric: null,
    body: {
      slug: "us-kennesaw-gun-ordinance-1982",
      place: { scheme: "iso_3166_1", value: "US" },
      scope: { en: "City of Kennesaw, Georgia (about 5,000 people in 1982)" },
      category: "ordinance",
      on: "1982-03-15",
      effective: "1982-03-25",
      title: { en: "Kennesaw, Georgia, requires heads of household to keep a firearm" },
      summary: {
        en: "On 15 March 1982 the city council of Kennesaw, 24 miles north of Atlanta, passed by a unanimous vote an ordinance requiring every head of household in the city to maintain a firearm and ammunition; it took effect on 25 March. A council member told the press the vote was a reaction to Morton Grove, Illinois, which had voted the year before to ban firearms with few exceptions; another called it “a kind of protest”. The ordinance exempts heads of household who are disabled, paupers, conscientious objectors or felons. It carries a fine of up to $50, the police chief said he had “no idea” how to enforce it, and it has reportedly never been enforced.",
      },
      change: {
        law: { en: "City of Kennesaw code of ordinances" },
        provision: "Sec. 34-21",
        before: null,
        after: {
          text: "(a) In order to provide for the emergency management of the city, and further in order to provide for and protect the safety, security and general welfare of the city and its inhabitants, every head of household residing in the city limits is required to maintain a firearm, together with ammunition therefore.\n(b) Exempt from the effect of this section are those heads of households who suffer a physical or mental disability which would prohibit them from using such a firearm. Further exempt from the effect of this section are those heads of households who are paupers or who conscientiously oppose maintaining firearms as a result of beliefs or religious doctrine, or persons convicted of a felony.",
          lang: "en",
          evidence: [KN_WIKI],
        },
      },
      process: [
        {
          on: "1982-03-15",
          step: { en: "The Kennesaw city council passes the ordinance by a unanimous vote." },
          evidence: [KN_SCIAM],
        },
        {
          on: "1982-03-17",
          step: {
            en: "The Christian Science Monitor reports it, with the police chief, the National Rifle Association and the National Coalition to Ban Handguns responding.",
          },
          evidence: [KN_CSM],
        },
      ],
      votes: [
        {
          body: { en: "Kennesaw city council" },
          on: "1982-03-15",
          question: { en: "Ordinance requiring heads of household to maintain a firearm" },
          outcome: "adopted",
          note: {
            en: "“Passed by a unanimous vote of the City Council” (Christian Science Monitor). The reports read give no count and no sponsor.",
          },
          evidence: [KN_CSM],
        },
      ],
      actors: [
        {
          name: "Kennesaw city council",
          description: { en: "The body that enacted it" },
          role: "voted_for",
          note: { en: "Unanimous. The sources read name no sponsor." },
          evidence: [KN_CSM],
        },
        {
          name: "Jerry Wortham",
          description: { en: "Member of the Kennesaw city council in 1982" },
          role: "comments",
          note: {
            en: "“It's a kind of protest. I'm tired of hearing I can't do this and can't do that. I have no idea whether it's constitutional.”",
          },
          evidence: [KN_CSM],
        },
        {
          name: "An unnamed council member",
          description: { en: "Member of the Kennesaw city council in 1982" },
          role: "comments",
          note: {
            en: "Said the vote was a reaction to Morton Grove, Illinois, which had voted the year before to ban firearms with few exceptions.",
          },
          evidence: [KN_CSM],
        },
        {
          name: "Robert Ruble",
          description: { en: "Kennesaw police chief in 1982" },
          role: "comments",
          note: {
            en: "“With growth comes crime. We're trying to give the criminals a message: Stay out of Kennesaw.” He admitted he had “no idea” how to enforce it.",
          },
          evidence: [KN_CSM],
        },
        {
          name: "John Adkins",
          description: { en: "Spokesman, National Rifle Association (1982)" },
          role: "supports",
          note: {
            en: "Said the NRA “applauds” the action and “supports the freedom of choice” to bear firearms.",
          },
          evidence: [KN_CSM],
        },
        {
          name: "Paul Lavrakas and Sam Fields",
          description: { en: "National Coalition to Ban Handguns (1982)" },
          role: "opposes",
          note: {
            en: "Lavrakas: “It sounds like the silly season has hit early in Georgia.” Fields called it a “joke” and argued it probably violates the 1st, 5th, 9th and 14th Amendments.",
          },
          evidence: [KN_CSM],
        },
      ],
      reported: [
        {
          kind: "claim",
          by: "City officials of Kennesaw, as reported by Scientific American",
          statement: {
            en: "A year after the law was implemented, burglaries in Kennesaw dropped by more than half; by 1985 they were down by 80 percent.",
          },
          evidence: [KN_SCIAM],
        },
        {
          kind: "critique",
          by: "David McDowall, criminologist, University at Albany (paper of 1989), as reported by Scientific American",
          statement: {
            en: "1981 was an anomaly: there were 75 percent more burglaries that year than the average of the previous five years, so later years looked good by comparison. Measured from 1978, 1979 or 1980 instead of 1981, the purported drop disappears.",
          },
          evidence: [KN_SCIAM],
        },
        {
          kind: "context",
          by: "Lt. Craig Graydon, Kennesaw Criminal Investigations Division, as reported by Scientific American",
          statement: {
            en: "The rule has never been enforced, and he estimates only about half of Kennesaw's residents actually own firearms.",
          },
          evidence: [KN_SCIAM],
        },
        {
          kind: "context",
          by: "The author of the Scientific American article",
          statement: {
            en: "Kennesaw has always had pretty minimal crime, which may have more to do with its residents and location than with how many guns it has.",
          },
          evidence: [KN_SCIAM],
        },
      ],
      series: [],
      caveat: {
        en: "Solon holds no burglary series for a city this size, so the figures above are claims as reported, with who made them, not data Solon vouches for. A country's homicide rate cannot show what one city's ordinance did. The ordinance has exemptions and, reportedly, was never enforced.",
      },
      evidence: [KN_CSM, KN_SCIAM, KN_WIKI],
    },
  },
];

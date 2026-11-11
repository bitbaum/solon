/**
 * What statistical offices collect, place by place, and where the answer to
 * the same question is available in one country and not in another
 * (src/lib/statistics/gaps.ts). Pages were read on 2026-11-10; a line names
 * what a page says, never what the office or the law is "like". What was not
 * read is listed as unread.
 */
import { defineGaps } from "@/lib/statistics/gaps";
import { OFFICES } from "./offices";

const READ = "2026-11-10";
const ev = (publisher: string, url: string, expect: string[], unchecked = false) => ({
  publisher,
  url,
  read: READ,
  expect,
  ...(unchecked ? { unchecked: true as const } : {}),
});

export const GAPS = defineGaps({
  topics: [
    {
      key: "crime.by_background",
      label: { en: "Crime by a person's background" },
      question: {
        en: "Do people of different backgrounds appear in crime statistics at different rates once age, sex and circumstances are taken into account, and if so, what explains the difference?",
      },
      purposes: [
        {
          en: "To see whether a difference exists at all, in numbers, not in impressions: public argument about origin and crime runs on anecdote in any country whose offices publish nothing to check it against.",
        },
        {
          en: "To test explanations, not only show differences: a difference in raw counts that disappears when age, sex and income are held equal was about those, and a difference that persists needs another explanation. Only a breakdown crossed with them can tell the two apart.",
        },
        {
          en: "To find where integration or policy works and where it does not, by comparing the same group in different places and years, and cohorts of the same group over time.",
        },
        {
          en: "To catch error in both directions: a statistic that over-states a group is as much a failure of measurement as silence that hides one.",
        },
      ],
      variants: [
        { key: "citizenship", label: { en: "Citizenship of the person at the time of the event" } },
        { key: "country_of_birth", label: { en: "The person's country of birth" } },
        {
          key: "composite_background",
          label: {
            en: "A background the office defines from the person's and the parents' birthplace (immigrant, descendant of immigrants …)",
          },
        },
        {
          key: "ethnic_or_racial_group",
          label: { en: "An ethnic or racial category, self-declared or assigned" },
        },
      ],
      cautions: [
        {
          en: "A breakdown shows who appears in a register, not why. Registers record what is reported, policed and prosecuted, and those depend on where police look, who reports and how cases are handled; they are not a count of who offends.",
        },
        {
          en: "Raw rates by group are confounded by age and sex (a young, male group will show more crime in any population), by income and education, by where people live, and by the share of offences only some can commit (immigration offences). A figure that does not say what it was adjusted for should not be read as a comparison of groups.",
        },
        {
          en: "A group's definition changes the answer: citizenship, country of birth and parents' birthplace describe different people, and a change of definition between years or countries breaks a comparison.",
        },
        {
          en: "Small numbers move a rate a lot, and groups are not uniform: a national-origin average hides large differences between people from the same country, such as those who came as refugees and those who came to work.",
        },
      ],
      risks: [
        {
          risk: {
            en: "Stigma: a published difference is read as a verdict on everyone in the group, and used to justify treating individuals by their group.",
          },
          safeguard: {
            en: "Publish with the crossings that let the difference be explained, with the definition of the group and the uncertainty beside the figure, and with the same detail for people of every background, including the majority.",
          },
        },
        {
          risk: {
            en: "Privacy and the history of abuse of such registers: records of a person's origin have been used to persecute. Many countries restrict them for that reason.",
          },
          safeguard: {
            en: "Collect only what a stated question needs, at the coarsest level that answers it; no individual's category beyond what the person gave or the law already records (birth, citizenship); published tables only, with small cells suppressed; access for researchers under agreed terms.",
          },
        },
        {
          risk: {
            en: "Self-declaration versus assignment: categories assigned by an official reproduce the official's assumptions, and self-declared ones depend on whether people trust the question.",
          },
          safeguard: {
            en: "Prefer what a person's records already hold (country of birth, parents' country of birth, citizenship) to an official's classification, as the offices that publish this today do.",
          },
        },
      ],
      companions: [
        { en: "Age and sex, always." },
        {
          en: "Income or benefit status and education, so a difference can be put to the test of circumstances.",
        },
        {
          en: "Region or settlement type, so that where people live is not mistaken for who they are.",
        },
        { en: "Type of offence, so a difference in one kind is not read as a difference in all." },
        { en: "Years since arrival, so integration can be separated from origin." },
      ],
      proposal: {
        collect: {
          en: "Publish, as an office already does for another topic, persons found guilty of or registered for offences by sex, age and a background defined from records the office already holds (country of birth, parents' country of birth, citizenship), as tables with small cells suppressed.",
        },
        accompany: [
          {
            en: "The group's definition, and what the figures are and are not adjusted for, beside every table.",
          },
          {
            en: "Age and sex always; income or benefit status, education and region where the office holds them.",
          },
        ],
        author:
          "Solon's configuration (2026-11-11). A possibility stated for discussion, drawn from this topic's own purposes, cautions and companions; not a recommendation to any office and not a finding about one.",
      },
      author:
        "Solon's configuration (version 1, 2026-11-10). Descriptive and not a recommendation to any office.",
    },
  ],
  coverage: [
    {
      topic: "crime.by_background",
      place: { scheme: "iso_3166_1", value: "DK" },
      variant: "composite_background",
      status: "published",
      office: "dk.statistics-denmark",
      crossings: ["age", "sex"],
      publisher: "Statistics Denmark (Danmarks Statistik)",
      summary: {
        en: 'Table STRAFNA3, "Persons guilty in crimes by sex, age, country of origin and time", published in the open StatBank with 75 countries of origin and time series from 2000, crossed with sex and four age groups.',
      },
      unread: [
        'How Statistics Denmark defines "country of origin" in this table (immigrants, descendants of immigrants, or both)',
        "Whether other tables cross it with income, education or offence type",
      ],
      evidence: [
        ev(
          "Statistics Denmark: StatBank table STRAFNA3 (table description, as the open API returns it)",
          "https://api.statbank.dk/v1/tableinfo/STRAFNA3?lang=en&format=JSON",
          ["Persons guilty in crimes by sex, age, country of origin and time"],
        ),
      ],
    },
    {
      topic: "crime.by_background",
      place: { scheme: "iso_3166_1", value: "SE" },
      variant: "composite_background",
      status: "published",
      crossings: ["age", "sex"],
      publisher: "Brå, the Swedish National Council for Crime Prevention",
      summary: {
        en: "A 2021 report on persons registered as suspected of offences, aged 15 or older, by domestic or foreign background: born in Sweden with both parents born in Sweden, with one parent born abroad, with both parents born abroad, or born abroad. It asks what share of each group was registered and how much of the difference is explained by the groups' age and sex distributions.",
      },
      unread: [
        "Brå's current suspect statistics (the page answered 404)",
        "Why Brå publishes by background and not by ethnicity, if it says so",
        "SCB's two-group definition of foreign background, which counts a person born in Sweden with one foreign-born parent as Swedish background (read only in a search summary)",
      ],
      evidence: [
        ev(
          "Brå: Misstänkta för brott bland personer med inrikes respektive utrikes bakgrund (2021)",
          "https://bra.se/rapporter/arkiv/2021-08-25-misstankta-for-brott-bland-personer-med-inrikes-respektive-utrikes-bakgrund",
          ["personer som är 15 år eller äldre med inrikes respektive utrikes bakgrund"],
        ),
      ],
    },
    {
      topic: "crime.by_background",
      place: { scheme: "iso_3166_1", value: "NO" },
      variant: "composite_background",
      status: "published",
      crossings: [],
      publisher: "Statistics Norway (SSB)",
      summary: {
        en: "Charges and charged persons by immigration background, 2020–2023, as a rate per 1,000 inhabitants; immigrants and Norwegian-born persons with immigrant parents are taken together. SSB states that the tables are not fully adjusted for sex and age and gives separate rates for men aged 15 to 24, and that charges are not the share of persons charged, since one person can be charged more than once. An older SSB report (1992–2015) found that the over-representation shrinks when differences in sex and age composition are taken into account.",
      },
      unread: [
        "How SSB defines the Norwegian-born-with-immigrant-parents group",
        "Its reason for collecting by background",
      ],
      evidence: [
        ev(
          "Statistics Norway: Siktelser og siktede personer etter innvandringsbakgrunn",
          "https://www.ssb.no/sosiale-forhold-og-kriminalitet/kriminalitet-og-rettsvesen/statistikk/etterforskede-lovbrudd/artikler/siktelser-og-siktede-personer-etter-innvandringsbakgrunn",
          [
            "Innvandrere og norskfødte med innvandrerforeldre omtales samlet som personer med innvandrerbakgrunn",
          ],
        ),
        ev(
          "Statistics Norway: Kriminalitet blant innvandrere og norskfødte med innvandrerforeldre, 1992–2015",
          "https://www.ssb.no/sosiale-forhold-og-kriminalitet/artikler-og-publikasjoner/kriminalitet-blant-innvandrere-og-norskfodte-med-innvandrerforeldre",
          [
            "Når man tar hensyn til forskjeller i kjønns- og alderssammensetning, reduseres overrepresentasjonen",
          ],
        ),
      ],
    },
    {
      topic: "crime.by_background",
      place: { scheme: "iso_3166_1", value: "NL" },
      variant: "composite_background",
      status: "published",
      crossings: ["age", "sex"],
      publisher: "Statistics Netherlands (CBS)",
      summary: {
        en: "Table 81959NED, now discontinued (1999–2022): registered and arrested suspects distinguished by sex, age group, migration background and generation, in absolute numbers and per 10,000 persons of the chosen group. CBS is moving to a classification by origin that also counts the person's own country of birth.",
      },
      unread: [
        "How CBS defines migration background and generation",
        "The successor classification",
      ],
      evidence: [
        ev("CBS: table 81959NED, verdachten", "https://www.cbs.nl/nl-nl/cijfers/detail/81959NED", [
          "onderscheiden naar geslacht, leeftijdsgroep, migratieachtergrond en generatie",
        ]),
      ],
    },
    {
      topic: "crime.by_background",
      place: { scheme: "iso_3166_1", value: "DE" },
      variant: "citizenship",
      status: "published",
      crossings: [],
      publisher: "Bundeskriminalamt (BKA), Polizeiliche Kriminalstatistik",
      summary: {
        en: "The police crime statistics for 2025 divide suspects into German and non-German and give counts and a suspect rate per 100,000 residents of the group, excluding children under 8. The headline comparison excludes offences against immigration law, which only non-citizens can commit. The page shows no comparison adjusted for age and sex; it says the highest burdens are among male adolescents.",
      },
      unread: [
        "The tables with sex and age breakdowns by nationality",
        "How non-German is defined (the page gives no definition)",
        "The Destatis conviction statistics by nationality, sex and age group, and whether they give rates (read only in a search summary)",
      ],
      evidence: [
        ev(
          "BKA: Polizeiliche Kriminalstatistik 2025",
          "https://www.bka.de/DE/AktuelleInformationen/StatistikenLagebilder/PolizeilicheKriminalstatistik/PKS2025/Polizeiliche_Kriminalstatistik_2025/Polizeiliche_Kriminalstatistik_2025_node.html",
          ["Tatverdächtigenbelastungszahl"],
        ),
      ],
    },
    {
      topic: "crime.by_background",
      place: { scheme: "iso_3166_1", value: "CH" },
      variant: "citizenship",
      status: "published",
      crossings: ["age", "sex"],
      publisher: "Federal Statistical Office (BFS)",
      summary: {
        en: "The criminal-conviction statistics list, for adults, sex, age and nationality (Switzerland or abroad, by residence status), as counts.",
      },
      unread: [
        "The police statistics on accused persons (the page gave only a teaser)",
        "Whether a rate per resident population is published",
        "Whether Switzerland publishes any background beyond nationality",
      ],
      evidence: [
        ev(
          "BFS: Verurteilte Erwachsene",
          "https://statistik.admin.ch/de/redirect/bfs/de/home/statistiken/kriminalitaet-strafrecht/strafjustiz/verurteilte-erwachsene.html",
          ["Geschlecht, Alter, Staatsangehörigkeit (Schweiz oder Ausland nach Aufenthaltsstatus)"],
        ),
      ],
    },
    {
      topic: "crime.by_background",
      place: { scheme: "iso_3166_1", value: "GB" },
      variant: "ethnic_or_racial_group",
      status: "published",
      crossings: [],
      publisher: "Ministry of Justice, Statistics on Ethnicity and the Criminal Justice System",
      summary: {
        en: "The 2024 edition reports by ethnicity, recorded by self-reporting or as identified by a police officer or another third party, mostly as proportions against the Census population. It states that no controls have been applied for other characteristics of ethnic groups.",
      },
      unread: [
        "The Office for National Statistics' own crime tables",
        "Nationality or country-of-birth breakdowns",
      ],
      evidence: [
        ev(
          "Ministry of Justice: Statistics on Ethnicity and the Criminal Justice System 2024",
          "https://www.gov.uk/government/statistics/ethnicity-and-the-criminal-justice-system-2024/statistics-on-ethnicity-and-the-criminal-justice-system-2024-html",
          [
            "Ethnicity is recorded by either self-reporting or as identified by a police officer or other third-party",
          ],
        ),
      ],
    },
    {
      topic: "crime.by_background",
      place: { scheme: "iso_3166_1", value: "US" },
      variant: "ethnic_or_racial_group",
      status: "published",
      crossings: ["age", "sex"],
      publisher: "FBI Uniform Crime Reporting (NIBRS)",
      summary: {
        en: "Arrest records carry the arrestee's age, sex, race, ethnicity and resident status, in the categories of the Office of Management and Budget's directive on race and ethnicity; published as counts and percentages of arrestees.",
      },
      unread: [
        "The FBI Crime Data Explorer",
        "Whether per-capita rates are published",
        "The PDF's wording was read through a text extractor and could not be re-checked by the weekly program, which does not read PDFs",
      ],
      evidence: [
        ev(
          "FBI: NIBRS 2017 arrestees resource page (PDF)",
          "https://ucr.fbi.gov/nibrs/2017/resource-pages/arrestees-2017.pdf",
          ["age, sex, race, ethnicity, and resident status"],
          true,
        ),
      ],
    },
    {
      topic: "crime.by_background",
      place: { scheme: "iso_3166_1", value: "FR" },
      variant: "ethnic_or_racial_group",
      status: "barred_by_law",
      publisher: "Conseil constitutionnel (decision 2007-557 DC)",
      summary: {
        en: "Studies of the diversity of origins, of discrimination and of integration may use objective data, but may not rest on ethnic origin or race.",
      },
      frame: {
        en: 'Decision no. 2007-557 DC of 15 November 2007, paragraph 29: such studies "ne sauraient, sans méconnaître le principe énoncé par l\'article 1er de la Constitution, reposer sur l\'origine ethnique ou la race" (cannot, without violating the principle in Article 1 of the Constitution, rest on ethnic origin or race). The same paragraph accepts that they may rest on "données objectives".',
      },
      unread: [
        "Whether and how the Interior Ministry's statistical service (SSMSI) publishes nationality or country of birth of people charged (its site answers a program with HTTP 403, so it could not be read)",
        "INSEE's own sources on country of birth and parents' country of birth",
      ],
      evidence: [
        ev(
          "Conseil constitutionnel: décision n° 2007-557 DC du 15 novembre 2007",
          "https://www.conseil-constitutionnel.fr/decision/2007/2007557DC.htm",
          [
            "ne sauraient, sans méconnaître le principe énoncé par l'article 1 er de la Constitution, reposer sur l'origine ethnique ou la race",
            "peuvent porter sur des données objectives",
          ],
        ),
      ],
    },
    {
      topic: "crime.by_background",
      place: { scheme: "wikidata", value: "Q23427" },
      variant: "composite_background",
      status: "not_collected",
      office: "so.state-statistics-office",
      crossings: ["age", "sex"],
      publisher:
        "Управление государственной статистики Республики Южная Осетия (State Statistics Office of the Republic of South Ossetia)",
      summary: {
        en: "The 2025 statistical compendium reports registered crimes taken on record by the Ministry of Internal Affairs, and a table of offenders by sex, age at the offence and occupation. It has no breakdown by citizenship, country of birth or origin.",
      },
      unread: [
        "Whether the Ministry of Internal Affairs records an offender's citizenship or birthplace and does not publish it",
        "The compendia of earlier years and the quarterly compendia (read: the 2025 annual compendium only)",
        "Whether other publications of the Office or the Ministry carry such a table",
      ],
      evidence: [
        ev(
          "Управление государственной статистики РЮО: Статистический сборник за 2025 год (PDF; a program cannot read its words)",
          "https://ugosstat.ru/wp-content/uploads/2026/06/spravochnik-za-2025-g.pdf",
          [],
          true,
        ),
      ],
      proposal: {
        collect: {
          en: "Publish the offenders table also by citizenship and country of birth, taken from records the Ministry of Internal Affairs already keeps where it keeps them, as tables with small cells suppressed (the territory's population is under 60,000, so cells are small).",
        },
        accompany: [
          {
            en: "The definition of each group, and that the figures are registered offences, not who offends.",
          },
          { en: "Age and sex always, with the occupation breakdown the Office already publishes." },
        ],
        office: "so.state-statistics-office",
        author:
          "Solon's configuration (2026-11-11). A possibility stated for discussion; not a recommendation to the Office and not a finding about it.",
      },
    },
  ],
  offices: OFFICES,
});

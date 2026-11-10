/**
 * The official routes by which a place's law is changed from outside its
 * legislature: who may start one, how many must sign, in what time, before
 * whom, and the provision that says so (design:
 * docs/design/2026-11-amending-the-law.md, "The official route").
 *
 * A route is shipped only with its source and the day it was read. An
 * amendment's page shows the route's bar beside Solon's own count and never
 * adds the two together: support on Solon is not an official signature.
 */
import type { Locale } from "@/i18n/routing";
import type { ActKind } from "./index";

export type RouteVenue = "voters" | "legislature" | "town_meeting" | "authorities";

/**
 * A route's words in one language, written from the source's own words. Every
 * field replaces the English one; a field left out stays English. The numbers
 * are not repeated here: they are read from `signatures` and `window`.
 *
 * `whoMaySign` reads after "von" ("Unterschriften von ..."), so in German it
 * stands in the dative.
 */
export interface RouteText {
  name: string;
  whoMaySign: string;
  alsoRequired?: readonly string[];
  cannotChange?: string;
  outcome: string;
  /** The base of a share ("of those who voted ..."), when the route has one. */
  signatureBase?: string;
  /** The source's title and provision, as the source words them. */
  sourceTitle?: string;
  provision?: string;
}

export interface OfficialRoute {
  key: string;
  /** Key in LAW_AUTHORITIES whose law the route changes. */
  authority: string;
  name: string;
  /** What a route of this kind can change; an amendment to another kind of act cannot take it. */
  appliesTo: readonly ActKind[];
  /** Who decides once the route's bar is met. */
  venue: RouteVenue;
  /** Who may sign, in the source's own terms. */
  whoMaySign: string;
  /**
   * How many must sign: a number, or a share of a stated base (Wyoming's 15%
   * of those who voted in the last general election); null when the route has
   * no bar.
   */
  signatures: { count: number } | { percent: number; of: string } | null;
  /** What else the route requires, in the source's own terms (a spread across counties, sponsors). */
  alsoRequired?: readonly string[];
  /** What the route cannot be used for, in the source's own terms. */
  cannotChange?: string;
  /** How long the signatures may take, from the day the route says it starts; null when unbounded. */
  window: { months: number } | { days: number } | null;
  /** What the route obliges the authority to do once it is taken. */
  outcome: string;
  source: { title: string; provision: string; url: string; readOn: string };
  /** The route's words in other languages; English (the fields above) is the fallback. */
  text?: Partial<Record<Exclude<Locale, "en">, RouteText>>;
}

const LV_DE = "Verfassung des Fürstentums Liechtenstein (LR 101)";
const LANDESBUERGER =
  "wahlberechtigten Landesbürgern; Unterschrift und Stimmberechtigung beglaubigt die Gemeindevorstehung des Wohnsitzes";

/** Art. 41 and 42 Gemeindegesetz apply the same way in every commune. */
const COMMUNE_DE: RouteText = {
  name: "Initiative oder Referendum in der Gemeindeversammlung",
  whoMaySign: "Stimmberechtigten der Gemeinde",
  signatureBase: "der Stimmberechtigten der Gemeinde (ein Sechstel)",
  alsoRequired: [
    "Durch begründetes schriftliches Begehren, auf die in Art. 41 beschriebene Weise",
    "Nur für Angelegenheiten, die nach Art. 41 dem Referendum unterstehen: Beschlüsse des Gemeinderates über dem in der Gemeindeordnung festgelegten Höchstbetrag (100 000 bis 300 000 Franken) und immer Voranschlag und Gemeindesteuerzuschlag, Zonenplan und Bauordnung sowie Verkauf und Tausch von Grundstücken",
  ],
  cannotChange:
    "Nicht in Angelegenheiten, in denen die Referendumsfrist ungenutzt abgelaufen ist oder ein Referendum zustande gekommen ist; bei Bauordnungen, Zonenplänen und anderen Gemeinderatsbeschlüssen genereller Natur erst zwei Jahre nach der Beschlussfassung",
  outcome:
    "Die Gemeindeversammlung behandelt die Angelegenheit; bei einem Referendum gegen einen Beschluss des Gemeinderates findet sie binnen vier Monaten nach Einreichung des Begehrens statt (Art. 41 Abs. 5).",
  sourceTitle: "Gemeindegesetz (LR 141.0)",
  provision: "Art. 41 und Art. 42",
};

export const OFFICIAL_ROUTES: readonly OfficialRoute[] = [
  {
    key: "ch-popular-initiative",
    authority: "ch",
    name: "Federal popular initiative",
    appliesTo: ["constitution"],
    venue: "voters",
    whoMaySign: "Swiss citizens eligible to vote",
    signatures: { count: 100_000 },
    window: { months: 18 },
    outcome:
      "A partial revision of the Federal Constitution is put to the vote of the People and the Cantons.",
    source: {
      title: "Federal Constitution of the Swiss Confederation (SR 101)",
      provision: "Art. 139",
      url: "https://www.fedlex.admin.ch/eli/cc/1999/404/en#art_139",
      readOn: "2026-11-06",
    },
  },
  {
    key: "ch-petition",
    authority: "ch",
    name: "Petition to the federal authorities",
    appliesTo: ["constitution", "statute", "ordinance", "decree", "regulation", "other"],
    venue: "authorities",
    whoMaySign: "Every person",
    signatures: null,
    window: null,
    outcome: "The authorities must take note of the petition; nobody may be disadvantaged for it.",
    source: {
      title: "Federal Constitution of the Swiss Confederation (SR 101)",
      provision: "Art. 33",
      url: "https://www.fedlex.admin.ch/eli/cc/1999/404/en#art_33",
      readOn: "2026-11-06",
    },
  },
  {
    key: "us-wy-initiative",
    authority: "us-wy",
    name: "Citizen initiative",
    appliesTo: ["statute"],
    venue: "voters",
    whoMaySign: "qualified voters",
    signatures: { percent: 15, of: "those who voted in the preceding general election" },
    alsoRequired: [
      "An application signed by at least 100 qualified voters as sponsors, certified by the Secretary of State before the petition circulates",
      "Signatures from 15% of the voters in at least two-thirds of the counties, as counted in each county's preceding general election",
    ],
    cannotChange:
      "The initiative cannot dedicate revenues, make or repeal appropriations, create courts or set their jurisdiction or rules, enact local or special legislation, or enact what the Constitution forbids the legislature to enact.",
    window: null,
    outcome:
      "The measure goes on the ballot of the first statewide election held more than 120 days after the next legislative session adjourns; it is enacted if more than half of those voting in that general election vote for it.",
    source: {
      title: "Constitution of the State of Wyoming",
      provision: "Article 3, Section 52",
      url: "https://wyoleg.gov/statutes/compress/Title97.pdf",
      readOn: "2026-11-06",
    },
  },
  {
    key: "li-law-initiative",
    authority: "li",
    name: "Popular initiative for a law",
    appliesTo: ["statute"],
    venue: "legislature",
    whoMaySign:
      "Voting citizens of Liechtenstein (Landesbürger), each signature certified by the signer's commune",
    signatures: { count: 1_000 },
    alsoRequired: [
      "Or three communes, by matching resolutions of their municipal assemblies, instead of the signatures",
      "A proposal that would burden the State with a new or lasting expense must come with a proposal to cover it",
      "Registered first with the Government (Anmeldung), which has it announced officially; the six weeks for the signatures run from that announcement (Volksrechtegesetz, LR 161, Art. 70 paras. 1 b, 2)",
      "The Government checks it against the Constitution and the treaties; the Landtag takes it up at its next sitting and may declare it void, which can be appealed to the State Court (Volksrechtegesetz Art. 70b)",
    ],
    cannotChange:
      "After a vote has rejected a request on the same subject, a new one is allowed only after two years (Volksrechtegesetz Art. 70 para. 3)",
    window: { days: 42 },
    outcome:
      "The Landtag must take the proposal up at its next sitting (Art. 64 para. 2). A drafted initiative the Landtag does not accept goes to a popular vote (Volksrechtegesetz, LR 161, Art. 82).",
    source: {
      title: "Constitution of the Principality of Liechtenstein (LR 101)",
      provision: "Art. 64 paras. 1-3; Volksrechtegesetz Art. 70, 70b",
      url: "https://www.gesetze.li/konso/html/1921015000",
      readOn: "2026-10-23",
    },
    text: {
      de: {
        name: "Volksinitiative auf Erlassung, Abänderung oder Aufhebung eines Gesetzes",
        whoMaySign: LANDESBUERGER,
        alsoRequired: [
          "Oder wenigstens drei Gemeinden in Form übereinstimmender Gemeindeversammlungsbeschlüsse, anstelle der Unterschriften",
          "Ein Begehren, aus dessen Durchführung dem Land eine einmalige, im Finanzgesetz nicht vorgesehene oder eine länger andauernde Belastung erwächst, muss mit einem Bedeckungsvorschlag versehen sein",
          "Zuerst bei der Regierung anzumelden; sie lässt es amtlich kundmachen, und die sechs Wochen für die Unterschriften laufen ab dieser Kundmachung (Volksrechtegesetz, LR 161, Art. 70 Abs. 1 Bst. b und Abs. 2)",
          "Die Regierung prüft das Begehren auf Übereinstimmung mit der Verfassung und den Staatsverträgen; der Landtag zieht es in seiner nächsten Sitzung in Behandlung und kann es für nichtig erklären, wogegen Beschwerde an den Staatsgerichtshof zulässig ist (Volksrechtegesetz Art. 70b)",
        ],
        cannotChange:
          "Wurde ein Begehren über denselben Gegenstand in einer Volksabstimmung verworfen, so ist ein neues erst nach Ablauf von zwei Jahren zulässig (Volksrechtegesetz Art. 70 Abs. 3)",
        outcome:
          "Der Landtag hat das Begehren in der darauffolgenden Sitzung in Verhandlung zu ziehen (Art. 64 Abs. 2). Stimmt er einem ausgearbeiteten Initiativentwurf nicht zu, beauftragt er die Regierung mit der Anordnung einer Volksabstimmung (Volksrechtegesetz, LR 161, Art. 82).",
        sourceTitle: LV_DE,
        provision: "Art. 64 Abs. 1-3; Volksrechtegesetz Art. 70, 70b",
      },
    },
  },
  {
    key: "li-constitution-initiative",
    authority: "li",
    name: "Popular initiative for the Constitution",
    appliesTo: ["constitution"],
    venue: "legislature",
    whoMaySign:
      "Voting citizens of Liechtenstein (Landesbürger), each signature certified by the signer's commune",
    signatures: { count: 1_500 },
    alsoRequired: [
      "Or four communes, by matching resolutions of their municipal assemblies, instead of the signatures",
      "Registered first with the Government (Anmeldung), which has it announced officially; the six weeks for the signatures run from that announcement (Volksrechtegesetz, LR 161, Art. 70 paras. 1 b, 2)",
      "The Government checks it against the Constitution and the treaties; the Landtag takes it up at its next sitting and may declare it void, which can be appealed to the State Court (Volksrechtegesetz Art. 70b)",
    ],
    cannotChange:
      "After a vote has rejected a request on the same subject, a new one is allowed only after two years (Volksrechtegesetz Art. 70 para. 3)",
    window: { days: 42 },
    outcome:
      "The Landtag must take the proposal up at its next sitting (Art. 64 para. 2, by para. 4).",
    source: {
      title: "Constitution of the Principality of Liechtenstein (LR 101)",
      provision: "Art. 64 para. 4; Volksrechtegesetz Art. 70, 70b",
      url: "https://www.gesetze.li/konso/html/1921015000",
      readOn: "2026-10-23",
    },
    text: {
      de: {
        name: "Volksinitiative auf Abänderung der Verfassung",
        whoMaySign: LANDESBUERGER,
        alsoRequired: [
          "Oder wenigstens vier Gemeinden in Form übereinstimmender Gemeindeversammlungsbeschlüsse, anstelle der Unterschriften",
          "Zuerst bei der Regierung anzumelden; sie lässt es amtlich kundmachen, und die sechs Wochen für die Unterschriften laufen ab dieser Kundmachung (Volksrechtegesetz, LR 161, Art. 70 Abs. 1 Bst. b und Abs. 2)",
          "Die Regierung prüft das Begehren auf Übereinstimmung mit der Verfassung und den Staatsverträgen; der Landtag zieht es in seiner nächsten Sitzung in Behandlung und kann es für nichtig erklären, wogegen Beschwerde an den Staatsgerichtshof zulässig ist (Volksrechtegesetz Art. 70b)",
        ],
        cannotChange:
          "Wurde ein Begehren über denselben Gegenstand in einer Volksabstimmung verworfen, so ist ein neues erst nach Ablauf von zwei Jahren zulässig (Volksrechtegesetz Art. 70 Abs. 3)",
        outcome:
          "Der Landtag hat das Begehren in der darauffolgenden Sitzung in Verhandlung zu ziehen (Art. 64 Abs. 2, nach Abs. 4).",
        sourceTitle: LV_DE,
        provision: "Art. 64 Abs. 4; Volksrechtegesetz Art. 70, 70b",
      },
    },
  },
  {
    key: "li-law-referendum",
    authority: "li",
    name: "Referendum against a law the Landtag has passed",
    appliesTo: ["statute"],
    venue: "voters",
    whoMaySign: "Voting citizens of Liechtenstein (Landesbürger)",
    signatures: { count: 1_000 },
    alsoRequired: [
      "Or three communes, by matching resolutions of their municipal assemblies",
      "The 30 days run from the official announcement of the Landtag's decision in the official gazettes, counted from the first publication, the day itself not included (Volksrechtegesetz, LR 161, Art. 70 para. 1 a)",
    ],
    cannotChange:
      "A law the Landtag has declared urgent, and a financial decision below a one-off new expense of CHF 500,000 or a yearly new expense of CHF 250,000, are not subject to it",
    window: { days: 30 },
    outcome:
      "The law goes to a popular vote and takes effect only if the voters accept it (the absolute majority of valid votes cast in the whole country decides).",
    source: {
      title: "Constitution of the Principality of Liechtenstein (LR 101)",
      provision: "Art. 66 paras. 1, 4",
      url: "https://www.gesetze.li/konso/html/1921015000",
      readOn: "2026-10-23",
    },
    text: {
      de: {
        name: "Referendum gegen ein vom Landtag beschlossenes Gesetz",
        whoMaySign: "wahlberechtigten Landesbürgern",
        alsoRequired: [
          "Oder wenigstens drei Gemeinden in Form übereinstimmender Gemeindeversammlungsbeschlüsse",
          "Die 30 Tage laufen ab der amtlichen Kundmachung des Landtagsbeschlusses in den amtlichen Kundmachungsorganen, ab der zuerst erscheinenden Veröffentlichung gerechnet und der Tag dieser selbst nicht eingerechnet (Volksrechtegesetz, LR 161, Art. 70 Abs. 1 Bst. a)",
        ],
        cannotChange:
          "Ein vom Landtag als dringlich erklärtes Gesetz unterliegt dem Referendum nicht, ebenso kein Finanzbeschluss, der keine einmalige neue Ausgabe von mindestens 500 000 Franken und keine jährlich wiederkehrende neue Ausgabe von 250 000 Franken verursacht",
        outcome:
          "Das Gesetz wird der Volksabstimmung unterzogen und tritt nur in Kraft, wenn die Stimmberechtigten es annehmen; die absolute Mehrheit der im ganzen Lande gültig abgegebenen Stimmen entscheidet.",
        sourceTitle: LV_DE,
        provision: "Art. 66 Abs. 1, 4",
      },
    },
  },
  {
    key: "li-constitution-referendum",
    authority: "li",
    name: "Referendum against a change to the Constitution",
    appliesTo: ["constitution"],
    venue: "voters",
    whoMaySign: "Voting citizens of Liechtenstein (Landesbürger)",
    signatures: { count: 1_500 },
    alsoRequired: [
      "Or four communes, by matching resolutions of their municipal assemblies",
      "The 30 days run from the official announcement of the Landtag's decision in the official gazettes, counted from the first publication, the day itself not included (Volksrechtegesetz, LR 161, Art. 70 para. 1 a)",
    ],
    window: { days: 30 },
    outcome: "The change goes to a popular vote and takes effect only if the voters accept it.",
    source: {
      title: "Constitution of the Principality of Liechtenstein (LR 101)",
      provision: "Art. 66 para. 2",
      url: "https://www.gesetze.li/konso/html/1921015000",
      readOn: "2026-10-23",
    },
    text: {
      de: {
        name: "Referendum gegen eine Abänderung der Verfassung",
        whoMaySign: "wahlberechtigten Landesbürgern",
        alsoRequired: [
          "Oder wenigstens vier Gemeinden in Form übereinstimmender Gemeindeversammlungsbeschlüsse",
          "Die 30 Tage laufen ab der amtlichen Kundmachung des Landtagsbeschlusses in den amtlichen Kundmachungsorganen, ab der zuerst erscheinenden Veröffentlichung gerechnet und der Tag dieser selbst nicht eingerechnet (Volksrechtegesetz, LR 161, Art. 70 Abs. 1 Bst. a)",
        ],
        outcome:
          "Die Änderung wird der Volksabstimmung unterzogen und tritt nur in Kraft, wenn die Stimmberechtigten sie annehmen.",
        sourceTitle: LV_DE,
        provision: "Art. 66 Abs. 2",
      },
    },
  },
  {
    // Citizens hold no right of legislative initiative here; one deputy does, so a
    // proposal reaches the Parliament through any deputy willing to introduce it.
    key: "rso-deputy-initiative",
    authority: "rso",
    name: "A bill introduced by a deputy",
    appliesTo: ["statute"],
    venue: "legislature",
    whoMaySign:
      "Any one deputy of the Parliament, who holds the right of legislative initiative (as do the President, the Government, and the Constitutional Court, the Supreme Court, the Prosecutor General and the Central Electoral Commission on matters within their competence); citizens do not hold it themselves",
    signatures: null,
    window: null,
    outcome:
      "The bill is put before the Parliament of the Republic of South Ossetia by a holder of the right of legislative initiative.",
    source: {
      title: "Constitution of the Republic of South Ossetia",
      provision: "Art. 69",
      url: "https://parliamentrso.org/node/3567",
      readOn: "2026-11-10",
    },
    text: {
      ru: {
        name: "Законопроект, внесённый депутатом",
        whoMaySign:
          "Любой депутат Парламента, обладающий правом законодательной инициативы (как и Президент, Правительство, а также Конституционный Суд, Верховный Суд, Генеральный прокурор и Центральная избирательная комиссия по вопросам их ведения); сами граждане этим правом не обладают",
        outcome:
          "Законопроект вносится в Парламент Республики Южная Осетия обладателем права законодательной инициативы.",
        sourceTitle: "Конституция Республики Южная Осетия",
        provision: "Статья 69",
      },
      de: {
        name: "Ein von einem Abgeordneten eingebrachter Gesetzentwurf",
        whoMaySign:
          "Jeder einzelne Abgeordnete des Parlaments, der das Recht der Gesetzesinitiative hat (wie der Präsident, die Regierung sowie das Verfassungsgericht, das Oberste Gericht, der Generalstaatsanwalt und die Zentrale Wahlkommission in ihren Zuständigkeitsbereichen); die Bürgerinnen und Bürger selbst haben es nicht",
        outcome:
          "Der Gesetzentwurf wird dem Parlament der Republik Südossetien von einem Inhaber des Rechts der Gesetzesinitiative vorgelegt.",
        sourceTitle: "Verfassung der Republik Südossetien",
        provision: "Art. 69",
      },
      fr: {
        name: "Un projet de loi déposé par un député",
        whoMaySign:
          "Tout député du Parlement, titulaire du droit d'initiative législative (comme le Président, le Gouvernement, ainsi que la Cour constitutionnelle, la Cour suprême, le Procureur général et la Commission électorale centrale dans les domaines de leur compétence) ; les citoyens eux-mêmes ne le détiennent pas",
        outcome:
          "Le projet de loi est soumis au Parlement de la République d'Ossétie du Sud par un titulaire du droit d'initiative législative.",
        sourceTitle: "Constitution de la République d'Ossétie du Sud",
        provision: "Art. 69",
      },
      it: {
        name: "Un disegno di legge presentato da un deputato",
        whoMaySign:
          "Qualsiasi deputato del Parlamento, titolare del diritto di iniziativa legislativa (come il Presidente, il Governo, nonché la Corte costituzionale, la Corte suprema, il Procuratore generale e la Commissione elettorale centrale nelle materie di loro competenza); i cittadini stessi non lo hanno",
        outcome:
          "Il disegno di legge è presentato al Parlamento della Repubblica dell'Ossezia del Sud da un titolare del diritto di iniziativa legislativa.",
        sourceTitle: "Costituzione della Repubblica dell'Ossezia del Sud",
        provision: "Art. 69",
      },
    },
  },
  {
    key: "ru-bill",
    authority: "ru",
    name: "A bill put before the State Duma",
    appliesTo: ["statute"],
    venue: "legislature",
    whoMaySign:
      "The President, the Federation Council, senators, deputies of the State Duma, the Government and the legislatures of the subjects of the Federation, and the Constitutional Court and the Supreme Court on matters within their competence; citizens do not hold the right themselves",
    signatures: null,
    alsoRequired: [
      "A bill that introduces or abolishes a tax, grants an exemption, issues state loans, changes the state's financial obligations or calls for spending from the federal budget can be put forward only with the Government's opinion on it",
    ],
    window: null,
    outcome: "Bills are put before the State Duma.",
    source: {
      title: "Constitution of the Russian Federation (ConsultantPlus's consolidated text)",
      provision: "Art. 104",
      url: "https://www.consultant.ru/document/cons_doc_LAW_28399/3f8c850abc4dc2ba4207acc563b176d93bdcf5f7/",
      readOn: "2026-11-10",
    },
    text: {
      ru: {
        name: "Законопроект, внесённый в Государственную Думу",
        whoMaySign:
          "Президент, Совет Федерации, сенаторы, депутаты Государственной Думы, Правительство и законодательные (представительные) органы субъектов Российской Федерации, а также Конституционный Суд и Верховный Суд по вопросам их ведения; сами граждане этим правом не обладают",
        alsoRequired: [
          "Законопроекты о введении или отмене налогов, освобождении от их уплаты, о выпуске государственных займов, об изменении финансовых обязательств государства и другие законопроекты, предусматривающие расходы из федерального бюджета, вносятся только при наличии заключения Правительства",
        ],
        outcome: "Законопроекты вносятся в Государственную Думу.",
        sourceTitle: "Конституция Российской Федерации",
        provision: "Статья 104",
      },
    },
  },
  ...(
    [
      {
        authority: "ru",
        level: "federal",
        signatures: { count: 100_000 },
        ru: {
          name: "Российская общественная инициатива, федеральный уровень",
          group: "федерального",
        },
      },
      {
        authority: "ru-se",
        level: "regional",
        signatures: {
          percent: 5,
          of: "the region's population (100,000 votes where it exceeds 2 million)",
        },
        ru: {
          name: "Российская общественная инициатива, региональный уровень",
          group: "регионального",
        },
      },
    ] as const
  ).map(({ authority, level, signatures, ru }): OfficialRoute => ({
    key: `${authority}-roi`,
    authority,
    name: `Russian Public Initiative, ${level} level`,
    appliesTo: ["statute"],
    venue: "authorities",
    whoMaySign:
      "Citizens of the Russian Federation aged 18 or over with a SNILS number and a confirmed account on the state services portal, through which every vote is cast",
    signatures,
    alsoRequired: [
      "An initiative is a proposal on the country's social and economic development or on public and municipal administration",
      "Moderators check it against the rules before it is put to the vote, within two months",
    ],
    window: { months: 12 },
    outcome: `An initiative that gathers the votes in time is sent to the ${level} expert working group for consideration.`,
    source: {
      title:
        "Russian Public Initiative (roi.ru), under Presidential Decree No. 183 of 4 March 2013",
      provision: "How it works",
      url: "https://www.roi.ru/page/how-it-works/",
      readOn: "2026-11-10",
    },
    text: {
      ru: {
        name: ru.name,
        whoMaySign:
          "граждане Российской Федерации не моложе 18 лет, имеющие СНИЛС и подтверждённую учётную запись на Едином портале госуслуг, через которую подаётся каждый голос",
        ...(authority === "ru-se"
          ? { signatureBase: "населения региона (100 000 голосов, если население больше 2 млн)" }
          : {}),
        alsoRequired: [
          "Общественная инициатива — предложение по вопросам социально-экономического развития страны, совершенствования государственного и муниципального управления",
          "Модераторы проверяют её на соответствие Правилам до голосования, не более двух месяцев",
        ],
        outcome: `Инициатива, набравшая голоса в срок, направляется на рассмотрение в экспертную рабочую группу ${ru.group} уровня.`,
        sourceTitle:
          "Российская общественная инициатива (roi.ru), Указ Президента РФ № 183 от 4 марта 2013 года",
        provision: "Как это работает",
      },
    },
  })),
  ...[
    "li7001",
    "li7002",
    "li7003",
    "li7004",
    "li7005",
    "li7006",
    "li7007",
    "li7008",
    "li7009",
    "li7010",
    "li7011",
  ].map((authority): OfficialRoute => ({
    key: `${authority}-initiative`,
    authority,
    name: "Initiative or referendum in the municipal assembly",
    appliesTo: ["communal_act"],
    venue: "town_meeting",
    whoMaySign: "Voters of the commune",
    signatures: { percent: 16.67, of: "the commune's voters (one sixth)" },
    alsoRequired: [
      "In writing, with reasons, in the way Art. 41 describes for a referendum",
      "Only for matters Art. 41 makes subject to referendum: council decisions above the limit in the commune's Gemeindeordnung (CHF 100,000 to 300,000), and always the budget and tax surcharge, the zoning plan and building code, land sales and exchanges",
    ],
    cannotChange:
      "Not where the referendum period ran out unused or a referendum was held; for building codes, zoning plans and other general council decisions, only two years after the decision",
    window: null,
    outcome:
      "The municipal assembly deals with the matter; for a referendum against a council decision the assembly meets within four months of the filing (Art. 41 para. 5).",
    source: {
      title: "Gemeindegesetz (LR 141.0)",
      provision: "Art. 41 and Art. 42",
      url: "https://www.gesetze.li/konso/html/1996076000",
      readOn: "2026-10-23",
    },
    text: { de: COMMUNE_DE },
  })),
];

/**
 * The route in a reader's language: every field the language has words for
 * replaces the English one; English stays where it has none.
 */
export function localizeRoute(route: OfficialRoute, locale: Locale): OfficialRoute {
  const text = locale === "en" ? undefined : route.text?.[locale];
  if (!text) return route;
  return {
    ...route,
    name: text.name,
    whoMaySign: text.whoMaySign,
    alsoRequired: text.alsoRequired ?? route.alsoRequired,
    cannotChange: text.cannotChange ?? route.cannotChange,
    outcome: text.outcome,
    signatures:
      route.signatures && "percent" in route.signatures && text.signatureBase
        ? { percent: route.signatures.percent, of: text.signatureBase }
        : route.signatures,
    source: {
      ...route.source,
      title: text.sourceTitle ?? route.source.title,
      provision: text.provision ?? route.source.provision,
    },
  };
}

/** The routes an amendment to an act of this authority and kind can take. */
export const routesFor = (authority: string, kind: string): OfficialRoute[] =>
  OFFICIAL_ROUTES.filter(
    (r) => r.authority === authority && (r.appliesTo as readonly string[]).includes(kind),
  );

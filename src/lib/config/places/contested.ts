/**
 * Contested places, compared question by question (design:
 * docs/design/2026-11-contested-law.md). Who governs a place and who claims it
 * is stated once, in `src/lib/config/world.ts` (`claimedBy`); this file adds,
 * for a claimed place, what each side's own text says on the same questions.
 *
 * Nothing here is Solon's summary of the law. A provision is the words of the
 * text, in their language, with a translation, and the page they were read on;
 * `pnpm run statistics:verify` re-reads every page and fails when its words are
 * gone. A question nobody has read for a side is a gap with what would fill it,
 * never a blank. The topics are the same for every place, so every comparison
 * has one shape.
 */
import { defineContests, defineContestTopics } from "@/lib/places/contested";

/** The questions every contested place is asked, in this order. */
export const CONTEST_TOPICS = defineContestTopics([
  {
    key: "territory",
    label: {
      en: "The territory",
      de: "Das Gebiet",
      fr: "Le territoire",
      it: "Il territorio",
      ru: "Территория",
    },
    question: {
      en: "What territory does the text say the state consists of, and can it be changed?",
      de: "Aus welchem Gebiet besteht der Staat nach dem Text, und kann es geändert werden?",
      fr: "De quel territoire le texte dit-il que l'État se compose, et peut-il être modifié ?",
      it: "Di quale territorio il testo dice che lo Stato è composto, e può essere modificato?",
      ru: "Из какой территории, согласно тексту, состоит государство и может ли она быть изменена?",
    },
  },
  {
    key: "lawmaking",
    label: {
      en: "Who may propose a law",
      de: "Wer ein Gesetz vorschlagen darf",
      fr: "Qui peut proposer une loi",
      it: "Chi può proporre una legge",
      ru: "Кто может предложить закон",
    },
    question: {
      en: "Who has the right to put a bill before the legislature, and can citizens do it themselves?",
      de: "Wer darf dem Parlament einen Gesetzesentwurf vorlegen, und können Bürgerinnen und Bürger das selbst tun?",
      fr: "Qui a le droit de soumettre un projet de loi au parlement, et les citoyens peuvent-ils le faire eux-mêmes ?",
      it: "Chi ha il diritto di presentare un progetto di legge al parlamento, e i cittadini possono farlo da sé?",
      ru: "Кто вправе внести законопроект в парламент и могут ли граждане сделать это сами?",
    },
  },
  {
    key: "taxes",
    label: {
      en: "Taxes",
      de: "Steuern",
      fr: "Impôts",
      it: "Imposte",
      ru: "Налоги",
    },
    question: {
      en: "At what rates are a person's income, a company's profit and a sale taxed?",
      de: "Zu welchen Sätzen werden das Einkommen einer Person, der Gewinn eines Unternehmens und ein Verkauf besteuert?",
      fr: "À quels taux sont imposés le revenu d'une personne, le bénéfice d'une entreprise et une vente ?",
      it: "Con quali aliquote sono tassati il reddito di una persona, l'utile di un'impresa e una vendita?",
      ru: "По каким ставкам облагаются доход человека, прибыль компании и продажа?",
    },
  },
  {
    key: "citizenship",
    label: {
      en: "Citizenship",
      de: "Staatsbürgerschaft",
      fr: "Citoyenneté",
      it: "Cittadinanza",
      ru: "Гражданство",
    },
    question: {
      en: "May a citizen hold another citizenship, and can citizenship be taken away?",
      de: "Darf eine Bürgerin oder ein Bürger eine weitere Staatsbürgerschaft haben, und kann die Staatsbürgerschaft entzogen werden?",
      fr: "Un citoyen peut-il avoir une autre citoyenneté, et peut-on lui retirer la sienne ?",
      it: "Un cittadino può avere un'altra cittadinanza, e la cittadinanza può essere tolta?",
      ru: "Может ли гражданин иметь другое гражданство и может ли он быть лишён гражданства?",
    },
  },
  {
    key: "movement",
    label: {
      en: "Moving and leaving",
      de: "Bewegen und Ausreisen",
      fr: "Circuler et partir",
      it: "Circolare e partire",
      ru: "Передвижение и выезд",
    },
    question: {
      en: "May a person move freely, leave the country and come back?",
      de: "Darf man sich frei bewegen, das Land verlassen und zurückkehren?",
      fr: "Peut-on circuler librement, quitter le pays et y revenir ?",
      it: "Si può circolare liberamente, lasciare il paese e tornare?",
      ru: "Можно ли свободно передвигаться, выезжать из страны и возвращаться?",
    },
  },
  {
    key: "defence",
    label: {
      en: "Defence and service",
      de: "Verteidigung und Dienst",
      fr: "Défense et service",
      it: "Difesa e servizio",
      ru: "Защита и служба",
    },
    question: {
      en: "Does the text make defence a duty, and who decides how service is done?",
      de: "Macht der Text die Verteidigung zur Pflicht, und wer bestimmt, wie Dienst geleistet wird?",
      fr: "Le texte fait-il de la défense un devoir, et qui décide comment le service est accompli ?",
      it: "Il testo fa della difesa un dovere, e chi decide come si presta servizio?",
      ru: "Делает ли текст защиту обязанностью и кто определяет порядок прохождения службы?",
    },
  },
]);

const READ = "2026-11-10";

const SO_CONSTITUTION = {
  publisher:
    "Парламент Республики Южная Осетия: Конституция Республики Южная Осетия (Parliament of the Republic of South Ossetia: the Constitution), as read",
  url: "https://parliamentrso.org/node/3567",
  read: READ,
  expect: [
    "Республика Южная Осетия состоит из пяти административно-территориальных единиц",
    "Территория Республики Южная Осетия неприкосновенна и неотчуждаема",
    "Территория, статус и границы Республики Южная Осетия не могут быть изменены",
    "Республика Южная Осетия имеет свое гражданство",
    "не может быть лишен гражданства или права на его изменение",
    "В Республике Южная Осетия допускается двойное гражданство",
    "Каждый имеет право выезжать за пределы Республики Южная Осетия",
    "право беспрепятственного возвращения в Республику Южная Осетия",
    "Защита Отечества - священный долг каждого гражданина Республики Южная Осетия",
    "обязан защищать интересы государства",
    "Право законодательной инициативы принадлежит Президенту Республики Южная Осетия, депутатам Парламента Республики Южная Осетия",
  ],
};

const GE_CONSTITUTION = {
  publisher:
    "Constitute Project: Georgia's Constitution of 1995 with Amendments through 2018, English translation, as read",
  url: "https://www.constituteproject.org/constitution/Georgia_2018",
  read: READ,
  expect: [
    "Article 1. State sovereignty",
    "including the Autonomous Soviet Socialist Republic of Abkhazia and the former Autonomous Region of South Ossetia",
    "The alienation of the territory of the state of Georgia shall be prohibited",
    "Article 7. Basis of territorial arrangement",
    "after the complete restoration of the jurisdiction of Georgia over the entire territory of the country",
    "Article 14. Freedom of movement",
    "and to leave Georgia freely",
    "A citizen of Georgia shall be able to enter Georgia freely",
    "Article 32. Citizenship of Georgia",
    "the conditions for holding citizenship of another state by a citizen of Georgia shall be determined by the organic law",
    "The deprivation of citizenship shall be inadmissible",
    "Article 45. Law making and procedures for decision-making",
    "and not less than 25 000 voters shall have the right of legislative initiative",
    "Article 70. Defence Forces",
    "The procedure for performing military service shall be determined by law",
  ],
};

const SO_TAX_CODE_PAGE = {
  publisher:
    "Парламент Республики Южная Осетия: Налоговый кодекс Республики Южная Осетия. Часть вторая (the Parliament's page for the Tax Code, Part Two), as read",
  url: "https://parliamentrso.org/node/5469",
  read: READ,
  expect: ["Налоговый кодекс Республики Южная Осетия. Часть вторая", "Текст кодекса скачать тут"],
};

/**
 * The code's text is a Word file the page links ("Текст кодекса скачать тут"), read by
 * converting it with LibreOffice (sha256 230b30c4…6672 on 2026-11-10). The weekly check
 * cannot read a Word file, so it checks the page that links it.
 */
const SO_TAX_CODE_FILE = {
  publisher:
    "Парламент Республики Южная Осетия: Налоговый кодекс Республики Южная Осетия, часть вторая, the Word file the page links, as read",
  url: "https://parliamentrso.org/sites/default/files/sites/default/files/source_images/nalogovyy_kodeks_respubliki_yuzhnaya_osetiya_ch.2_ispr_parl_0.doc",
  read: READ,
  unchecked: true as const,
};

const SO_BUDGET_2023 = {
  publisher:
    "Парламент Республики Южная Осетия: Закон «Об исполнении Государственного бюджета Республики Южная Осетия за 2023 год» (the law approving the 2023 budget's execution), as read",
  url: "https://parliamentrso.org/node/4876",
  read: READ,
  expect: [
    "Об исполнении Государственного бюджета Республики Южная Осетия за 2023 год",
    "по доходам в сумме 9 108 338,6 тыс. рублей",
    "9 234 425,6 тыс. рублей",
    "Приложение №1, 2",
  ],
};

/** Appendix 1, the revenue lines, a spreadsheet the law's page links (sha256 6344138c…2c4a on 2026-11-10). */
const SO_BUDGET_2023_APPENDIX = {
  publisher:
    "Парламент Республики Южная Осетия: Приложение 1 к Закону «Об исполнении Государственного бюджета Республики Южная Осетия за 2023 год» (the revenue lines, a spreadsheet), as read",
  url: "https://parliamentrso.org/sites/default/files/sites/default/files/source_images/prilozhenie_1_2.xlsx",
  read: READ,
  unchecked: true as const,
};

const PWC = (path: string, expect: string[]) => ({
  publisher: `PwC Worldwide Tax Summaries: Georgia (reviewed 2 September 2026), a summary of the law and not the law, as read`,
  url: `https://taxsummaries.pwc.com/georgia/${path}`,
  read: READ,
  expect,
});
const GE_PIT = PWC("individual/taxes-on-personal-income", [
  "Personal income is subject to a flat tax rate of 20%",
]);
const GE_CIT = PWC("corporate/taxes-on-corporate-income", [
  "The CIT rate is a flat 15%",
  "Georgia adopted the Estonian model of CIT, under which retained profits are no longer taxable until they are distributed",
]);
const GE_VAT = PWC("corporate/other-taxes", ["The standard VAT rate is 18%"]);

/** The South Ossetian Constitution as Solon's register holds it: the Parliament's node 3567. */
const soAct = { authority: "rso", scheme: "publisher_ref", value: "parliamentrso:3567" };
/** The Tax Code, Part Two, as Solon's register holds it: the Parliament's node 5469. */
const soTaxCode = { authority: "rso", scheme: "publisher_ref", value: "parliamentrso:5469" };
const GE_TRANSLATOR = "Constitute Project (English translation; the authentic text is in Georgian)";

export const CONTESTS = defineContests(CONTEST_TOPICS, [
  {
    place: "south-ossetia",
    sides: [
      { key: "rso", role: "governs", lawAuthority: "rso" },
      { key: "georgia", role: "claims", lawAuthority: null },
    ],
    provisions: [
      {
        topic: "territory",
        side: "rso",
        label: "Constitution, Art. 3",
        act: soAct,
        provision: "art_3",
        quote: {
          text: "2. Республика Южная Осетия состоит из пяти административно-территориальных единиц: города Цхинвал, Дзауского, Знаурского, Ленингорского и Цхинвальского районов.\n3. Территория Республики Южная Осетия неприкосновенна и неотчуждаема. […]\n4. Территория, статус и границы Республики Южная Осетия не могут быть изменены без согласия ее народа.",
          lang: "ru",
          translation: {
            en: "2. The Republic of South Ossetia consists of five administrative-territorial units: the city of Tskhinval and the Dzau, Znaur, Leningor and Tskhinval districts.\n3. The territory of the Republic of South Ossetia is inviolable and inalienable. […]\n4. The territory, status and borders of the Republic of South Ossetia cannot be changed without the consent of its people.",
          },
          evidence: [SO_CONSTITUTION],
        },
      },
      {
        topic: "territory",
        side: "georgia",
        label: "Constitution, Art. 1",
        act: null,
        provision: null,
        translator: GE_TRANSLATOR,
        quote: {
          text: "Georgia is an independent, unified and indivisible state as confirmed by the Referendum of 31 March 1991 held in the entire territory of the country, including the Autonomous Soviet Socialist Republic of Abkhazia and the former Autonomous Region of South Ossetia, and by the Act of Restoration of State Independence of Georgia of 9 April 1991. […] The alienation of the territory of the state of Georgia shall be prohibited.",
          lang: "en",
          evidence: [GE_CONSTITUTION],
        },
      },
      {
        topic: "territory",
        side: "georgia",
        label: "Constitution, Art. 7",
        act: null,
        provision: null,
        translator: GE_TRANSLATOR,
        quote: {
          text: "The state territorial arrangement of Georgia shall be revised by a constitutional law of Georgia on the basis of the principle of the separation of powers after the complete restoration of the jurisdiction of Georgia over the entire territory of the country.",
          lang: "en",
          evidence: [GE_CONSTITUTION],
        },
      },
      {
        topic: "lawmaking",
        side: "rso",
        label: "Constitution, Art. 69",
        act: soAct,
        provision: "art_69",
        quote: {
          text: "Право законодательной инициативы принадлежит Президенту Республики Южная Осетия, депутатам Парламента Республики Южная Осетия, Правительству Республики Южная Осетия, а также Конституционному Суду Республики Южная Осетия, Верховному Суду Республики Южная Осетия, Генеральному прокурору Республики Южная Осетия и Центральной избирательной комиссии Республики Южная Осетия по вопросам их ведения.",
          lang: "ru",
          translation: {
            en: "The right of legislative initiative belongs to the President of the Republic of South Ossetia, to the deputies of the Parliament of the Republic of South Ossetia, to the Government of the Republic of South Ossetia, and to the Constitutional Court, the Supreme Court, the Prosecutor General and the Central Electoral Commission of the Republic of South Ossetia on matters within their competence.",
          },
          evidence: [SO_CONSTITUTION],
        },
      },
      {
        topic: "lawmaking",
        side: "georgia",
        label: "Constitution, Art. 45",
        act: null,
        provision: null,
        translator: GE_TRANSLATOR,
        quote: {
          text: "The Government, a Member of Parliament, a parliamentary faction, a parliamentary committee, the supreme representative bodies of the Autonomous Republics of Abkhazia and Ajara, and not less than 25 000 voters shall have the right of legislative initiative.",
          lang: "en",
          evidence: [GE_CONSTITUTION],
        },
      },
      {
        topic: "taxes",
        side: "rso",
        label: "Tax Code, Part Two, Art. 228 (income of a person)",
        act: soTaxCode,
        provision: null,
        quote: {
          text: "1. Налоговая ставка устанавливается в размере 12 процентов, если иное не предусмотрено настоящей статьей.",
          lang: "ru",
          translation: {
            en: "1. The tax rate is set at 12 percent, unless this article provides otherwise.",
          },
          evidence: [SO_TAX_CODE_FILE, SO_TAX_CODE_PAGE],
        },
      },
      {
        topic: "taxes",
        side: "rso",
        label: "Tax Code, Part Two, Art. 286 (profit of a company)",
        act: soTaxCode,
        provision: null,
        quote: {
          text: "1. Налоговая ставка устанавливается в размере 20 процентов, за исключением случаев, предусмотренных пунктами 2 - 6 настоящей статьи.",
          lang: "ru",
          translation: {
            en: "1. The tax rate is set at 20 percent, except in the cases provided by paragraphs 2 to 6 of this article.",
          },
          evidence: [SO_TAX_CODE_FILE, SO_TAX_CODE_PAGE],
        },
      },
      {
        topic: "taxes",
        side: "rso",
        label: "Tax Code, Part Two, Art. 166 para. 3 (value added)",
        act: soTaxCode,
        provision: null,
        quote: {
          text: "3. Налогообложение производится по налоговой ставке 10 процентов в случаях, не указанных в пунктах 1, 2 и 4 настоящей статьи.",
          lang: "ru",
          translation: {
            en: "3. Tax is charged at the rate of 10 percent in the cases not named in paragraphs 1, 2 and 4 of this article.",
          },
          evidence: [SO_TAX_CODE_FILE, SO_TAX_CODE_PAGE],
        },
      },
      {
        topic: "taxes",
        side: "georgia",
        label: "Income of a person (summary)",
        act: null,
        provision: null,
        quote: {
          text: "Personal income is subject to a flat tax rate of 20%.",
          lang: "en",
          evidence: [GE_PIT],
        },
      },
      {
        topic: "taxes",
        side: "georgia",
        label: "Profit of a company (summary)",
        act: null,
        provision: null,
        quote: {
          text: "The CIT rate is a flat 15%. […] From 1 January 2017, Georgia adopted the Estonian model of CIT, under which retained profits are no longer taxable until they are distributed.",
          lang: "en",
          evidence: [GE_CIT],
        },
      },
      {
        topic: "taxes",
        side: "georgia",
        label: "Value added (summary)",
        act: null,
        provision: null,
        quote: {
          text: "The standard VAT rate is 18%",
          lang: "en",
          evidence: [GE_VAT],
        },
      },
      {
        topic: "citizenship",
        side: "rso",
        label: "Constitution, Art. 16",
        act: soAct,
        provision: "art_16",
        quote: {
          text: "1. Республика Южная Осетия имеет свое гражданство.\n2. Гражданин Республики Южная Осетия не может быть лишен гражданства или права на его изменение. Основания и порядок приобретения гражданства определяются конституционным законом.\n3. В Республике Южная Осетия допускается двойное гражданство.",
          lang: "ru",
          translation: {
            en: "1. The Republic of South Ossetia has its own citizenship.\n2. A citizen of the Republic of South Ossetia cannot be deprived of citizenship or of the right to change it. The grounds and procedure for acquiring citizenship are set by a constitutional law.\n3. Dual citizenship is permitted in the Republic of South Ossetia.",
          },
          evidence: [SO_CONSTITUTION],
        },
      },
      {
        topic: "citizenship",
        side: "georgia",
        label: "Constitution, Art. 32",
        act: null,
        provision: null,
        translator: GE_TRANSLATOR,
        quote: {
          text: "Citizenship of Georgia shall be acquired by birth or naturalisation. The procedures for acquiring and losing the citizenship of Georgia, the conditions and procedures for granting citizenship of Georgia to a foreign citizen and the conditions for holding citizenship of another state by a citizen of Georgia shall be determined by the organic law.\nThe deprivation of citizenship shall be inadmissible.",
          lang: "en",
          evidence: [GE_CONSTITUTION],
        },
      },
      {
        topic: "movement",
        side: "rso",
        label: "Constitution, Art. 24",
        act: soAct,
        provision: "art_24",
        quote: {
          text: "1. Каждому, кто законно находится на территории Республики Южная Осетия, принадлежит право свободного передвижения по ее территории и свободного выбора места жительства, кроме случаев, оговоренных законом.\n2. Каждый имеет право выезжать за пределы Республики Южная Осетия.\n3. Граждане Республики Южная Осетия имеют право беспрепятственного возвращения в Республику Южная Осетия.",
          lang: "ru",
          translation: {
            en: "1. Everyone lawfully on the territory of the Republic of South Ossetia has the right to move freely within it and to choose freely where to live, except in cases provided by law.\n2. Everyone has the right to leave the Republic of South Ossetia.\n3. Citizens of the Republic of South Ossetia have the right to return to the Republic of South Ossetia without hindrance.",
          },
          evidence: [SO_CONSTITUTION],
        },
      },
      {
        topic: "movement",
        side: "georgia",
        label: "Constitution, Art. 14",
        act: null,
        provision: null,
        translator: GE_TRANSLATOR,
        quote: {
          text: "Everyone lawfully staying in Georgia shall have the right to move freely within the territory of the country, to choose a place of residence freely and to leave Georgia freely.\nThese rights may only be restricted in accordance with law, for ensuring national security or public safety, protecting health or administering justice, insofar as is necessary in a democratic society.\nA citizen of Georgia shall be able to enter Georgia freely.",
          lang: "en",
          evidence: [GE_CONSTITUTION],
        },
      },
      {
        topic: "defence",
        side: "rso",
        label: "Constitution, Art. 42",
        act: soAct,
        provision: "art_42",
        quote: {
          text: "1. Защита Отечества - священный долг каждого гражданина Республики Южная Осетия. […]\n2. Гражданин Республики Южная Осетия обязан защищать интересы государства, способствовать укреплению его обороноспособности.",
          lang: "ru",
          translation: {
            en: "1. Defending the Fatherland is the sacred duty of every citizen of the Republic of South Ossetia. […]\n2. A citizen of the Republic of South Ossetia is obliged to defend the interests of the state and to help strengthen its defence capability.",
          },
          evidence: [SO_CONSTITUTION],
        },
      },
      {
        topic: "defence",
        side: "georgia",
        label: "Constitution, Art. 70",
        act: null,
        provision: null,
        translator: GE_TRANSLATOR,
        quote: {
          text: "The defence of Georgia shall be every citizen's duty. The procedure for performing military service shall be determined by law.",
          lang: "en",
          evidence: [GE_CONSTITUTION],
        },
      },
    ],
    ledgers: [
      {
        side: "rso",
        year: 2023,
        currency: "RUB",
        unit: 1000,
        revenue: 9108338.64705,
        expenditure: 9234425.6,
        lines: [
          {
            label: {
              en: "Taxes and other own revenue",
              de: "Steuern und andere eigene Einnahmen",
              fr: "Impôts et autres recettes propres",
              it: "Imposte e altre entrate proprie",
              ru: "Налоговые и неналоговые доходы",
            },
            amount: 1707844.89695,
            kind: "own",
          },
          {
            label: {
              en: "Financial aid for social and economic development",
              de: "Finanzhilfe für die soziale und wirtschaftliche Entwicklung",
              fr: "Aide financière au développement social et économique",
              it: "Aiuto finanziario allo sviluppo sociale ed economico",
              ru: "Финансовая помощь на социально-экономическое развитие",
            },
            amount: 6226347.16,
            kind: "received",
            from: {
              en: "Russian Federation",
              de: "Russische Föderation",
              fr: "Fédération de Russie",
              it: "Federazione Russa",
              ru: "Российская Федерация",
            },
          },
          {
            label: {
              en: "Financial aid for public investment",
              de: "Finanzhilfe für öffentliche Investitionen",
              fr: "Aide financière aux investissements publics",
              it: "Aiuto finanziario agli investimenti pubblici",
              ru: "Финансовая помощь на бюджетные инвестиции",
            },
            amount: 1164146.5901,
            kind: "received",
            from: {
              en: "Russian Federation",
              de: "Russische Föderation",
              fr: "Fédération de Russie",
              it: "Federazione Russa",
              ru: "Российская Федерация",
            },
          },
          {
            label: {
              en: "Grants from non-state organisations",
              de: "Zuwendungen nichtstaatlicher Organisationen",
              fr: "Dons d'organisations non étatiques",
              it: "Contributi di organizzazioni non statali",
              ru: "Безвозмездные поступления от негосударственных организаций",
            },
            amount: 10000,
            kind: "received",
            from: {
              en: "Non-state organisations",
              de: "Nichtstaatliche Organisationen",
              fr: "Organisations non étatiques",
              it: "Organizzazioni non statali",
              ru: "Негосударственные организации",
            },
          },
        ],
        label: "Law on the execution of the State Budget for 2023, Art. 1 and Appendix 1",
        act: { authority: "rso", scheme: "publisher_ref", value: "parliamentrso:4876" },
        quote: {
          text: "Утвердить отчет об исполнении Государственного бюджета Республики Южная Осетия за 2023 год по доходам в сумме 9 108 338,6 тыс. рублей, по расходам в сумме 9 234 425,6 тыс. рублей с превышением расходов над доходами (дефицит Государственного бюджета) в сумме 126 087,0 тыс. рублей",
          lang: "ru",
          translation: {
            en: "To approve the report on the execution of the State Budget of the Republic of South Ossetia for 2023, with revenue of 9,108,338.6 thousand roubles and expenditure of 9,234,425.6 thousand roubles, expenditure exceeding revenue (a deficit of the State Budget) by 126,087.0 thousand roubles",
          },
          evidence: [SO_BUDGET_2023, SO_BUDGET_2023_APPENDIX],
        },
      },
    ],
    open: {
      en: "South Ossetia is quoted from its constitution, its Tax Code (Part Two) and its law on the 2023 budget, all as its Parliament publishes them. Georgia is quoted from the Constitute Project's English translation of its constitution, and its tax rates from PwC's summary, which is not the law: the authentic Georgian texts are on matsne.gov.ge, which refused Solon's reader on the day this was read. Not read yet: the statutes each constitution leaves the detail to (citizenship, military service), each side's budget in later years, Georgia's state budget, and what each side's law says about documents and property made under the other's. Solon's own copy of the South Ossetian Tax Code holds only the page that links the code's Word file; reading that file into the register is work in progress.",
      de: "Südossetien wird aus seiner Verfassung, seinem Steuergesetzbuch (zweiter Teil) und seinem Gesetz über den Haushalt 2023 zitiert, jeweils wie sein Parlament sie veröffentlicht. Georgien wird aus der englischen Übersetzung seiner Verfassung durch das Constitute Project zitiert und seine Steuersätze aus der Zusammenfassung von PwC, die nicht das Gesetz ist: die verbindlichen georgischen Texte stehen auf matsne.gov.ge, das Solons Leseprogramm am Tag der Lektüre abwies. Noch nicht gelesen: die Gesetze, denen jede Verfassung die Einzelheiten überlässt (Staatsbürgerschaft, Militärdienst), die Haushalte späterer Jahre, Georgiens Staatshaushalt und was das Recht jeder Seite über Dokumente und Eigentum sagt, die nach dem Recht der anderen entstanden sind. Solons eigene Kopie des südossetischen Steuergesetzbuchs enthält nur die Seite, die auf dessen Word-Datei verweist; diese Datei in das Register einzulesen, ist in Arbeit.",
      fr: "L'Ossétie du Sud est citée d'après sa constitution, son code des impôts (deuxième partie) et sa loi sur le budget 2023, tels que son parlement les publie. La Géorgie est citée d'après la traduction anglaise de sa constitution par le Constitute Project, et ses taux d'imposition d'après le résumé de PwC, qui n'est pas la loi : les textes géorgiens authentiques sont sur matsne.gov.ge, qui a refusé le lecteur de Solon le jour de la lecture. Pas encore lus : les lois auxquelles chaque constitution renvoie le détail (citoyenneté, service militaire), les budgets des années suivantes, le budget de l'État géorgien, et ce que le droit de chaque côté dit des documents et biens établis sous le droit de l'autre. La copie de Solon du code des impôts sud-ossète ne contient que la page qui renvoie au fichier Word du code ; lire ce fichier dans le registre est en cours.",
      it: "L'Ossezia del Sud è citata dalla sua costituzione, dal suo codice tributario (seconda parte) e dalla sua legge sul bilancio 2023, come li pubblica il suo parlamento. La Georgia è citata dalla traduzione inglese della sua costituzione del Constitute Project, e le sue aliquote dal riassunto di PwC, che non è la legge: i testi georgiani autentici sono su matsne.gov.ge, che ha rifiutato il lettore di Solon il giorno della lettura. Non ancora letti: le leggi a cui ciascuna costituzione rinvia i dettagli (cittadinanza, servizio militare), i bilanci degli anni successivi, il bilancio dello Stato georgiano, e ciò che il diritto di ciascuna parte dice di documenti e beni nati sotto il diritto dell'altra. La copia di Solon del codice tributario sudossetino contiene solo la pagina che rimanda al file Word del codice; leggere quel file nel registro è in corso.",
      ru: "Южная Осетия процитирована по её Конституции, Налоговому кодексу (часть вторая) и закону об исполнении бюджета за 2023 год — так, как их публикует её Парламент. Грузия процитирована по английскому переводу её Конституции, сделанному Constitute Project, а её налоговые ставки — по обзору PwC, который не является законом: подлинные грузинские тексты опубликованы на matsne.gov.ge, который в день чтения отказал программе Solon. Пока не прочитаны: законы, которым каждая конституция оставляет подробности (гражданство, воинская служба), бюджеты следующих лет, государственный бюджет Грузии, а также что право каждой стороны говорит о документах и собственности, оформленных по праву другой. Собственная копия Налогового кодекса Южной Осетии в Solon содержит только страницу со ссылкой на файл Word; чтение этого файла в реестр — в работе.",
    },
  },
]);

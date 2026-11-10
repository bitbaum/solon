/**
 * South Ossetia's State Budget, as its Parliament publishes the laws on it
 * (parliamentrso.org). Two documents for 2023, kept apart because they answer
 * different questions: the law on the budget's execution states what came in
 * (Appendix 1, line by line); the spreadsheet that page links as Appendix 3
 * is headed as an appendix to the law on the 2023 budget itself, so it states
 * what was allocated to each section as amended, not what was spent.
 *
 * Every line is the publisher's own, in its words and amounts. Where each is
 * placed on the standard taxonomies is Solon's reading, said so on the page.
 */
import type { BudgetDocumentInput } from "@/lib/budgets/documents";
import { STATE_BUDGET } from "../scopes";

const READ = "2026-11-10";
const HOLDER = { scheme: "wikidata", value: "Q23427" };

export const SO_BUDGET_2023_LAW = {
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
const APPENDIX_1 = {
  publisher:
    "Парламент Республики Южная Осетия: Приложение 1 к Закону «Об исполнении Государственного бюджета Республики Южная Осетия за 2023 год» (the revenue lines, a spreadsheet), as read",
  url: "https://parliamentrso.org/sites/default/files/sites/default/files/source_images/prilozhenie_1_2.xlsx",
  read: READ,
  unchecked: true as const,
};

/**
 * The spreadsheet the execution law's page links as Appendix 3 (sha256 140fb687…a736 on
 * 2026-11-10). Its own heading names the Law on the 2023 State Budget, and its final column
 * the allocations as amended (8,952,405.3 thousand roubles), not the 9,234,425.6 spent.
 */
const APPENDIX_3 = {
  publisher:
    'Парламент Республики Южная Осетия: «Приложение 3 к Закону Республики Южная Осетия "О Государственном бюджете Республики Южная Осетия на 2023 год"» (allocations by section, a spreadsheet the execution law\'s page links), as read',
  url: "https://parliamentrso.org/sites/default/files/sites/default/files/source_images/prilozhenie_3.xls",
  read: READ,
  unchecked: true as const,
};

const ACT = { authority: "rso", scheme: "publisher_ref", value: "parliamentrso:4876" };

const REVENUE_PLACEMENT = {
  en: "Solon placed each revenue group of Appendix 1 on the European System of Accounts: profit and personal income taxes and the special regimes as taxes on income; VAT as VAT; excise, customs and the mineral extraction tax as taxes on production and imports; property taxes as taxes on wealth; state duty, paid services and licence fees as sales, fees and charges; state property and natural-resource payments as property income; fines and the current financial aid as other transfers; the investment aid as a capital transfer. Sales of assets and arrears on abolished taxes are not revenue in those accounts and are not placed.",
};

const EXPENDITURE_PLACEMENT = {
  en: "Solon placed each section of the budget classification on the nearest division of the Classification of the Functions of Government (COFOG): the judiciary and law enforcement under public order and safety, sport, youth and the media under recreation and culture, education and science under education. Transfers to the state's extra-budgetary funds are money passed to another part of the state, not a function, and are not placed.",
};

export const SOUTH_OSSETIA_BUDGETS: readonly BudgetDocumentInput[] = [
  {
    key: "rso-state-2023-executed",
    holder: HOLDER,
    scope: STATE_BUDGET.key,
    year: 2023,
    basis: "executed",
    currency: "RUB",
    unit: 1000,
    lang: "ru",
    title: "Закон «Об исполнении Государственного бюджета Республики Южная Осетия за 2023 год»",
    titleTranslation: {
      en: "Law on the execution of the State Budget of the Republic of South Ossetia for 2023",
    },
    act: ACT,
    quote: {
      text: "Утвердить отчет об исполнении Государственного бюджета Республики Южная Осетия за 2023 год по доходам в сумме 9 108 338,6 тыс. рублей, по расходам в сумме 9 234 425,6 тыс. рублей с превышением расходов над доходами (дефицит Государственного бюджета) в сумме 126 087,0 тыс. рублей",
      lang: "ru",
      translation: {
        en: "To approve the report on the execution of the State Budget of the Republic of South Ossetia for 2023, with revenue of 9,108,338.6 thousand roubles and expenditure of 9,234,425.6 thousand roubles, expenditure exceeding revenue (a deficit of the State Budget) by 126,087.0 thousand roubles",
      },
      evidence: [SO_BUDGET_2023_LAW],
    },
    totals: { revenue: 9108338.64705, expenditure: 9234425.6, balance: -126087.0 },
    lines: [
      {
        side: "revenue",
        code: "101 01 000",
        label: { ru: "Налог на прибыль организаций", en: "Profit tax of organisations" },
        amount: 341515.51316,
        category: "D51REC",
        origin: "own",
      },
      {
        side: "revenue",
        code: "101 02 000",
        label: { ru: "Налог на доходы физических лиц", en: "Personal income tax" },
        amount: 693966.75359,
        category: "D51REC",
        origin: "own",
      },
      {
        side: "revenue",
        code: "102 01 000",
        label: {
          ru: "Налог на добавленную стоимость на товары (работы, услуги), реализуемые на территории Республики Южная Осетия",
          en: "Value added tax on goods and services sold in the Republic",
        },
        amount: 313251.73144000006,
        category: "D211REC",
        origin: "own",
      },
      {
        side: "revenue",
        code: "102 02 000",
        label: {
          ru: "Акцизы по подакцизным товарам (продукции), производимым на территории Республики Южная Осетия",
          en: "Excise on goods produced in the Republic",
        },
        amount: 1578.835,
        category: "D2REC",
        origin: "own",
      },
      {
        side: "revenue",
        code: "103 01 000",
        label: {
          ru: "Налог на добавленную стоимость на товары, ввозимые на территорию Республики Южная Осетия",
          en: "Value added tax on imported goods",
        },
        amount: 68280.972,
        category: "D211REC",
        origin: "own",
      },
      {
        side: "revenue",
        code: "103 02 000",
        label: {
          ru: "Акцизы по подакцизным товарам (продукции), ввозимым на территорию Республики Южная Осетия",
          en: "Excise on imported goods",
        },
        amount: 86570.527,
        category: "D2REC",
        origin: "own",
      },
      {
        side: "revenue",
        code: "104 00 000",
        label: {
          ru: "НАЛОГИ НА СОВОКУПНЫЙ ДОХОД",
          en: "Taxes on total income (special regimes for small business)",
        },
        amount: 24034.86228,
        category: "D51REC",
        origin: "own",
      },
      {
        side: "revenue",
        code: "105 00 000",
        label: { ru: "НАЛОГИ НА ИМУЩЕСТВО", en: "Taxes on property" },
        amount: 10283.73369,
        category: "D59REC",
        origin: "own",
      },
      {
        side: "revenue",
        code: "106 00 000",
        label: {
          ru: "НАЛОГИ, СБОРЫ И РЕГУЛЯРНЫЕ ПЛАТЕЖИ ЗА ПОЛЬЗОВАНИЕ ПРИРОДНЫМИ РЕСУРСАМИ",
          en: "Taxes and payments for the use of natural resources",
        },
        amount: 1069.2959999999998,
        category: "D2REC",
        origin: "own",
      },
      {
        side: "revenue",
        code: "107 00 000",
        label: { ru: "ГОСУДАРСТВЕННАЯ ПОШЛИНА", en: "State duty" },
        amount: 19771.401340000004,
        category: "P11_P12_P131",
        origin: "own",
      },
      {
        side: "revenue",
        code: "108 00 000",
        label: {
          ru: "ЗАДОЛЖЕННОСТЬ И ПЕРЕРАСЧЕТЫ ПО ОТМЕНЕННЫМ НАЛОГАМ, СБОРАМ И ИНЫМ ОБЯЗАТЕЛЬНЫМ ПЛАТЕЖАМ",
          en: "Arrears and recalculations on abolished taxes",
        },
        amount: 0.011,
        category: null,
        origin: "own",
      },
      {
        side: "revenue",
        code: "110 00 000",
        label: { ru: "ДОХОДЫ ОТ ВНЕШНЕЭКОНОМИЧЕСКОЙ ДЕЯТЕЛЬНОСТИ", en: "Customs duties and fees" },
        amount: 62058.869,
        category: "D2REC",
        origin: "own",
      },
      {
        side: "revenue",
        code: "111 00 000",
        label: {
          ru: "ДОХОДЫ ОТ ИСПОЛЬЗОВАНИЯ ИМУЩЕСТВА, НАХОДЯЩЕГОСЯ В ГОСУДАРСТВЕННОЙ СОБСТВЕННОСТИ",
          en: "Income from state property",
        },
        amount: 51220.31305,
        category: "D4REC",
        origin: "own",
      },
      {
        side: "revenue",
        code: "112 00 000",
        label: {
          ru: "ПЛАТЕЖИ ПРИ ПОЛЬЗОВАНИИ ПРИРОДНЫМИ РЕСУРСАМИ",
          en: "Payments for the use of natural resources",
        },
        amount: 1580.85844,
        category: "D4REC",
        origin: "own",
      },
      {
        side: "revenue",
        code: "113 00 000",
        label: {
          ru: "ДОХОДЫ ОТ ОКАЗАНИЯ ПЛАТНЫХ УСЛУГ (РАБОТ) И КОМПЕНСАЦИИ ЗАТРАТ ГОСУДАРСТВА",
          en: "Paid services and compensation of state costs",
        },
        amount: 23045.73608,
        category: "P11_P12_P131",
        origin: "own",
      },
      {
        side: "revenue",
        code: "114 00 000",
        label: {
          ru: "ДОХОДЫ ОТ ПРОДАЖИ МАТЕРИАЛЬНЫХ И НЕМАТЕРИАЛЬНЫХ АКТИВОВ",
          en: "Sales of tangible and intangible assets",
        },
        amount: 374.003,
        category: null,
        origin: "own",
      },
      {
        side: "revenue",
        code: "115 00 000",
        label: { ru: "АДМИНИСТРАТИВНЫЕ ПЛАТЕЖИ И СБОРЫ", en: "Administrative payments and fees" },
        amount: 284.29,
        category: "P11_P12_P131",
        origin: "own",
      },
      {
        side: "revenue",
        code: "116 00 000",
        label: {
          ru: "ШТРАФЫ, САНКЦИИ, ВОЗМЕЩЕНИЕ УЩЕРБА",
          en: "Fines, sanctions and compensation for damage",
        },
        amount: 8858.81753,
        category: "D7REC",
        origin: "own",
      },
      {
        side: "revenue",
        code: "118 00 000",
        label: { ru: "ПРОЧИЕ НЕНАЛОГОВЫЕ ДОХОДЫ", en: "Other non-tax revenue" },
        amount: 98.37335,
        category: "D7REC",
        origin: "own",
      },
      {
        side: "revenue",
        code: "201 01 000",
        label: {
          ru: "Финансовая помощь Республике Южная Осетия на социально-экономическое развитие, за исключением мероприятий инвестиционного характера, предоставляемая Российской Федерацией",
          en: "Financial aid for social and economic development, other than investment",
        },
        amount: 6226347.16,
        category: "D7REC",
        origin: "received",
        from: {
          en: "Russian Federation",
          de: "Russische Föderation",
          fr: "Fédération de Russie",
          it: "Federazione Russa",
          ru: "Российская Федерация",
        },
      },
      {
        side: "revenue",
        code: "201 02 000",
        label: {
          ru: "Финансовая помощь Республике Южная Осетия в целях осуществления бюджетных инвестиций в рамках реализации Инвестиционной программы, предоставляемая Российской Федерацией",
          en: "Financial aid for public investment under the Investment Programme",
        },
        amount: 1164146.5901,
        category: "D9REC",
        origin: "received",
        from: {
          en: "Russian Federation",
          de: "Russische Föderation",
          fr: "Fédération de Russie",
          it: "Federazione Russa",
          ru: "Российская Федерация",
        },
      },
      {
        side: "revenue",
        code: "205 00 000",
        label: {
          ru: "БЕЗВОЗМЕЗДНЫЕ ПОСТУПЛЕНИЯ ОТ НЕГОСУДАРСТВЕННЫХ ОРГАНИЗАЦИЙ",
          en: "Grants from non-state organisations",
        },
        amount: 10000,
        category: "D7REC",
        origin: "received",
        from: {
          en: "Non-state organisations",
          de: "Nichtstaatliche Organisationen",
          fr: "Organisations non étatiques",
          it: "Organizzazioni non statali",
          ru: "Негосударственные организации",
        },
      },
    ],
    placement: REVENUE_PLACEMENT,
    evidence: [SO_BUDGET_2023_LAW, APPENDIX_1],
  },
  {
    key: "rso-state-2023-enacted",
    holder: HOLDER,
    scope: STATE_BUDGET.key,
    year: 2023,
    basis: "enacted",
    currency: "RUB",
    unit: 1000,
    lang: "ru",
    title:
      "Приложение 3 к Закону Республики Южная Осетия «О Государственном бюджете Республики Южная Осетия на 2023 год»",
    titleTranslation: {
      en: "Appendix 3 to the Law on the State Budget of the Republic of South Ossetia for 2023: allocations by section, as amended",
    },
    act: null,
    totals: { expenditure: 8952405.27462 },
    lines: [
      {
        side: "expenditure",
        code: "01",
        label: { ru: "Общегосударственные вопросы", en: "General public services" },
        amount: 1744404.18,
        category: "GF01",
      },
      {
        side: "expenditure",
        code: "02",
        label: { ru: "Судебная система", en: "The judiciary" },
        amount: 78936.34,
        category: "GF03",
      },
      {
        side: "expenditure",
        code: "03",
        label: { ru: "Национальная оборона", en: "National defence" },
        amount: 253369.88,
        category: "GF02",
      },
      {
        side: "expenditure",
        code: "04",
        label: {
          ru: "Национальная безопасность и правоохранительная деятельность",
          en: "National security and law enforcement",
        },
        amount: 1071388.26,
        category: "GF03",
      },
      {
        side: "expenditure",
        code: "05",
        label: { ru: "Национальная экономика", en: "The national economy" },
        amount: 925476.44,
        category: "GF04",
      },
      {
        side: "expenditure",
        code: "06",
        label: { ru: "Жилищно-коммунальное хозяйство", en: "Housing and utilities" },
        amount: 794166.06,
        category: "GF06",
      },
      {
        side: "expenditure",
        code: "07",
        label: { ru: "Охрана окружающей среды", en: "Environmental protection" },
        amount: 15111.75,
        category: "GF05",
      },
      {
        side: "expenditure",
        code: "08",
        label: { ru: "Образование и наука", en: "Education and science" },
        amount: 2151942.11,
        category: "GF09",
      },
      {
        side: "expenditure",
        code: "09",
        label: { ru: "Культура", en: "Culture" },
        amount: 323174.85,
        category: "GF08",
      },
      {
        side: "expenditure",
        code: "10",
        label: { ru: "Здравоохранение", en: "Health" },
        amount: 1133619.88,
        category: "GF07",
      },
      {
        side: "expenditure",
        code: "11",
        label: { ru: "Социальная политика", en: "Social policy" },
        amount: 147719.51,
        category: "GF10",
      },
      {
        side: "expenditure",
        code: "12",
        label: {
          ru: "Физическая культура и спорт, молодежная политика",
          en: "Sport and youth policy",
        },
        amount: 59535.94,
        category: "GF08",
      },
      {
        side: "expenditure",
        code: "13",
        label: { ru: "Средства массовой информации", en: "Mass media" },
        amount: 124980.05,
        category: "GF08",
      },
      {
        side: "expenditure",
        code: "14",
        label: {
          ru: "Межбюджетные трансферты",
          en: "Transfers to the state's extra-budgetary funds",
        },
        amount: 128580.01,
        category: null,
      },
    ],
    placement: EXPENDITURE_PLACEMENT,
    evidence: [APPENDIX_3, SO_BUDGET_2023_LAW],
  },
];

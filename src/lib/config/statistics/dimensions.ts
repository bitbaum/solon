/**
 * The dimensions the statistics pages hold in layers (src/lib/statistics/dimensions.ts):
 * what the law says, what happens in practice, what results. Add a series to
 * a layer by naming its metric key here; add a dimension by adding an entry. A
 * layer with no series must say what would fill it.
 */
import { placesConfig } from "@/lib/config/places";
import { defineDimensions } from "@/lib/statistics/dimensions";
import { RUBRICS } from "./rubrics";

const AUTHOR =
  "An example in Solon's configuration (version 1, 2026-11-09), built from OECD series. Not an index.";

export const DIMENSIONS = defineDimensions(
  [
    {
      key: "taxation",
      version: 1,
      label: {
        en: "What the state takes in tax",
        de: "Was der Staat an Steuern nimmt",
        fr: "Ce que l'État prélève en impôts",
        it: "Ciò che lo Stato preleva in imposte",
        ru: "Сколько государство берёт налогами",
      },
      summary: {
        en: "The headline rate is one thing, what the rules take from a typical pay packet another, and what the state ends up collecting a third. They can point different ways: a flat statutory rate says little about the burden once employers' contributions are counted.",
        de: "Der Spitzensatz ist das eine, was die Regeln einem typischen Lohn entnehmen das andere, und was der Staat am Ende einnimmt das Dritte. Sie können in verschiedene Richtungen zeigen: Ein einheitlicher gesetzlicher Satz sagt wenig über die Belastung, wenn die Beiträge der Arbeitgeber mitgezählt werden.",
        fr: "Le taux affiché est une chose, ce que les règles prélèvent sur une fiche de paie typique en est une autre, et ce que l'État finit par percevoir une troisième. Ils peuvent aller dans des sens différents : un taux légal unique dit peu de la charge une fois comptées les cotisations des employeurs.",
        it: "L'aliquota dichiarata è una cosa, ciò che le regole prelevano da una busta paga tipica un'altra, e ciò che lo Stato finisce per incassare una terza. Possono andare in direzioni diverse: un'aliquota legale unica dice poco sull'onere una volta contati i contributi dei datori di lavoro.",
        ru: "Заявленная ставка — одно, то, что правила забирают с типичной зарплаты, — другое, а то, что государство в итоге собирает, — третье. Они могут указывать в разные стороны: единая законная ставка мало говорит о нагрузке, если считать взносы работодателей.",
      },
      layers: {
        de_jure: {
          metrics: ["tax.income.top_rate", "tax.wedge.average"],
        },
        de_facto: {
          metrics: [],
          wanted: {
            en: "How much of the tax owed is actually collected: estimates of the tax gap and of compliance, from tax authorities or the OECD.",
            de: "Wie viel der geschuldeten Steuer tatsächlich eingeht: Schätzungen der Steuerlücke und der Befolgung, von Steuerbehörden oder der OECD.",
            fr: "Quelle part de l'impôt dû est effectivement perçue : estimations de l'écart fiscal et de la conformité, par les administrations fiscales ou l'OCDE.",
            it: "Quanta parte dell'imposta dovuta è effettivamente riscossa: stime del divario fiscale e dell'adempimento, da autorità fiscali o dall'OCSE.",
            ru: "Какая доля причитающегося налога реально собирается: оценки налогового разрыва и соблюдения, от налоговых органов или ОЭСР.",
          },
        },
        outcome: {
          metrics: ["tax.revenue.general", "economy.government.expenditure"],
        },
      },
      author: AUTHOR,
    },
    {
      key: "compulsion",
      version: 1,
      label: { en: "What the law compels" },
      summary: {
        en: "Where the law forces a person to take part in a collective arrangement, as against leaving them to join it or not. Each feature is read from the statute itself and placed on a written scale, with the articles it was read from, how sure the reader is and why, and whether a second person has checked it.",
      },
      layers: {
        de_jure: { rubrics: ["compulsion.military_service", "compulsion.health_insurance"] },
        de_facto: {
          wanted: {
            en: "What is done in practice: how many people are actually called up or serve in a replacement service each year, how many refuse and what happens to them, from defence ministries and justice statistics.",
          },
        },
        outcome: {
          wanted: {
            en: "What follows: the share of each age group that serves, and the cost of the service to those who serve, from defence ministries or statistical offices.",
          },
        },
      },
      author:
        "An example in Solon's configuration (version 1, 2026-11-09), coded from statutes. Not an index.",
    },
    {
      key: "exit",
      version: 1,
      label: { en: "What it costs to leave" },
      summary: {
        en: "How free a person is to leave: whether and on what conditions they can give up their citizenship, and whether leaving is taxed. Leaving is the other half of compulsion: an arrangement a person can walk away from cheaply compels less than one they cannot. Each feature is read from the statute and placed on a written scale, with the articles, how sure the reader is, and whether a second person has checked it.",
      },
      layers: {
        de_jure: { rubrics: ["exit.renounce_citizenship", "exit.departure_tax"] },
        de_facto: {
          wanted: {
            en: "What leaving takes in practice: how many people give up their citizenship each year (the United States publishes the names quarterly in the Federal Register), how long a release takes, and how often one is refused.",
          },
        },
        outcome: {
          wanted: {
            en: "What follows: emigration of citizens by year, from statistical offices.",
          },
        },
      },
      author:
        "An example in Solon's configuration (version 1, 2026-11-09), coded from statutes. Not an index.",
    },
    {
      key: "governance",
      version: 1,
      label: {
        en: "How governance is seen to work",
        de: "Wie die Regierungsführung wahrgenommen wird",
        fr: "Comment la gouvernance est perçue",
        it: "Come è percepito il governo",
        ru: "Как воспринимается управление",
      },
      summary: {
        en: "Six scores from the World Bank, each a composite of perceptions drawn from household and firm surveys and expert assessments. They say how rules are seen to work, not what the rules are or what a count of events shows, and the World Bank treats them as estimates. They sit beside what the law says and what results so a gap shows rather than averaging away.",
      },
      layers: {
        de_jure: {
          wanted: {
            en: "What the law says on the same subjects: constitutional and statutory features coded on written scales, as for compulsion and exit.",
          },
        },
        de_facto: {
          metrics: [
            "governance.wgi.rule_of_law",
            "governance.wgi.regulation",
            "governance.wgi.effectiveness",
            "governance.wgi.corruption",
            "governance.wgi.voice",
            "governance.wgi.stability",
          ],
        },
        outcome: {
          wanted: {
            en: "What follows that can be counted rather than perceived: contract enforcement times, court backlogs and clearance rates, from statistical offices and the World Bank's own enterprise surveys.",
          },
        },
      },
      author:
        "An example in Solon's configuration (version 1, 2026-11-09), built from the World Bank's Worldwide Governance Indicators. Not an index.",
    },
  ],
  new Set(placesConfig.metrics.filter((m) => m.statistic && !m.retired).map((m) => m.key)),
  new Set(RUBRICS.map((r) => r.key)),
);

/**
 * The dimensions the statistics pages hold in layers (src/lib/statistics/dimensions.ts):
 * what the law says, what happens in practice, what results. Add a series to
 * a layer by naming its metric key here; add a dimension by adding an entry. A
 * layer with no series must say what would fill it.
 */
import { placesConfig } from "@/lib/config/places";
import { defineDimensions } from "@/lib/statistics/dimensions";

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
  ],
  new Set(placesConfig.metrics.filter((m) => m.statistic && !m.retired).map((m) => m.key)),
);

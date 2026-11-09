/**
 * The example axes the statistics page offers until a group votes its own.
 * They are examples, credited as such, not an index: Solon does not say which
 * end of an axis is better, and the reader sets every weight. An axis uses
 * only series whose scope is the same in every country shown (general
 * government, all levels), so a federal country is not made to look small.
 */
import { placesConfig } from "@/lib/config/places";
import { axisSchema, type Axis } from "@/lib/statistics/axes";

const AUTHOR =
  "An example in Solon's configuration (version 1, 2026-11-09), built from World Bank and OECD series. Not an index.";

const AXES_INPUT = [
  {
    key: "government_share",
    version: 1,
    label: {
      en: "How much of the economy passes through government",
      de: "Wie viel der Wirtschaft durch den Staat geht",
      fr: "Quelle part de l'économie passe par l'État",
      it: "Quanta parte dell'economia passa per lo Stato",
      ru: "Какая доля экономики проходит через государство",
    },
    direction: {
      en: "Higher: a larger share of output is spent or taxed by government, at every level together.",
      de: "Höher: Ein grösserer Teil der Wirtschaftsleistung wird vom Staat ausgegeben oder besteuert, alle Ebenen zusammen.",
      fr: "Plus haut : une plus grande part de la production est dépensée ou prélevée par l'État, tous niveaux confondus.",
      it: "Più alto: una quota maggiore della produzione è spesa o tassata dallo Stato, tutti i livelli insieme.",
      ru: "Выше: большая доля выпуска расходуется или облагается государством, все уровни вместе.",
    },
    author: AUTHOR,
    components: [
      { metric: "economy.government.consumption", sign: 1, weight: 1 },
      { metric: "economy.government.expenditure", sign: 1, weight: 1 },
      { metric: "tax.revenue.general", sign: 1, weight: 1 },
      { metric: "tax.income.top_rate", sign: 1, weight: 1 },
    ],
  },
  {
    key: "centralisation",
    version: 1,
    label: {
      en: "Where tax is collected",
      de: "Wo Steuern erhoben werden",
      fr: "Où l'impôt est perçu",
      it: "Dove le imposte sono riscosse",
      ru: "Где собираются налоги",
    },
    direction: {
      en: "Higher: central government collects a larger share of all tax; lower: states, cantons, communes and social security funds collect more.",
      de: "Höher: Der Zentralstaat nimmt einen grösseren Teil aller Steuern ein; niedriger: Gliedstaaten, Kantone, Gemeinden und Sozialversicherungen nehmen mehr ein.",
      fr: "Plus haut : l'administration centrale perçoit une plus grande part de tous les impôts ; plus bas : les États fédérés, cantons, communes et administrations de sécurité sociale en perçoivent davantage.",
      it: "Più alto: l'amministrazione centrale riscuote una quota maggiore di tutte le imposte; più basso: stati federati, cantoni, comuni ed enti di previdenza ne riscuotono di più.",
      ru: "Выше: центральное правительство собирает большую долю всех налогов; ниже: больше собирают штаты, кантоны, общины и фонды социального страхования.",
    },
    author: AUTHOR,
    components: [{ metric: "tax.revenue.central_share", sign: 1, weight: 1 }],
  },
] as const;

export const EXAMPLE_AXES: readonly Axis[] = AXES_INPUT.map((input) => {
  const axis = axisSchema.parse(input);
  for (const c of axis.components) {
    const metric = placesConfig.metrics.find((m) => m.key === c.metric);
    if (!metric?.statistic || metric.retired) {
      throw new Error(`axis "${axis.key}": "${c.metric}" is not a live statistic in the catalog`);
    }
  }
  return axis;
});

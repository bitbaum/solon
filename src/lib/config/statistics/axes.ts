/**
 * The example axes the statistics page offers until a group votes its own.
 * They are examples, credited as such, not an index: Solon does not say which
 * end of an axis is better, and the reader sets every weight.
 */
import { placesConfig } from "@/lib/config/places";
import { axisSchema, type Axis } from "@/lib/statistics/axes";

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
      en: "Higher: a larger share of output is spent or taxed by government.",
      de: "Höher: Ein grösserer Teil der Wirtschaftsleistung wird vom Staat ausgegeben oder besteuert.",
      fr: "Plus haut : une plus grande part de la production est dépensée ou prélevée par l'État.",
      it: "Più alto: una quota maggiore della produzione è spesa o tassata dallo Stato.",
      ru: "Выше: большая доля выпуска расходуется или облагается государством.",
    },
    author:
      "An example in Solon's configuration (version 1, 2026-11-08), built from World Bank and OECD series. Not an index.",
    components: [
      { metric: "economy.government.consumption", sign: 1, weight: 1 },
      { metric: "economy.government.expense", sign: 1, weight: 1 },
      { metric: "tax.revenue.total", sign: 1, weight: 1 },
      { metric: "tax.income.top_rate", sign: 1, weight: 1 },
    ],
  },
] as const;

export const EXAMPLE_AXES: readonly Axis[] = AXES_INPUT.map((input) => {
  const axis = axisSchema.parse(input);
  for (const c of axis.components) {
    const metric = placesConfig.metrics.find((m) => m.key === c.metric);
    if (!metric?.statistic) {
      throw new Error(`axis "${axis.key}": "${c.metric}" is not a statistic in the metric catalog`);
    }
  }
  return axis;
});

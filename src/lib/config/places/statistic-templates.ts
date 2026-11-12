/**
 * Shared words for statistics, so a metric of a known family is a few lines:
 * a sentence with the label put into it in each language, the scopes several
 * metrics share, and the Worldwide Governance Indicators as one helper.
 */
import { configTranslation } from "@/lib/i18n/config-catalog";
import type { LocalizedText, MetricInput } from "./schema";

const LOCALES = ["en", "de", "fr", "it", "ru"] as const;
type Templates = Record<(typeof LOCALES)[number], string>;

/**
 * "{label}" put into a sentence in each language, the label from the catalog where it has no
 * word of its own for a language.
 */
export const sentence = (templates: Templates, label: LocalizedText): LocalizedText =>
  Object.fromEntries(
    LOCALES.map((l) => [
      l,
      templates[l].replace(
        "{label}",
        label[l] ?? configTranslation(label.en ?? "", l) ?? label.en ?? "",
      ),
    ]),
  ) as LocalizedText;

/** General government, every level counted: so a federal country is not made to look small. */
export const ALL_LEVELS_SCOPE: LocalizedText = {
  en: "General government: every level together, so a federal country's states and communes count.",
  de: "Der Staat insgesamt: alle Ebenen zusammen; Gliedstaaten und Gemeinden eines Bundesstaats zählen mit.",
  fr: "L'ensemble des administrations publiques : tous niveaux confondus, les États fédérés et les communes d'un pays fédéral y comptent.",
  it: "L'insieme delle amministrazioni pubbliche: tutti i livelli insieme; gli stati federati e i comuni di un paese federale vi rientrano.",
  ru: "Государственный сектор в целом: все уровни вместе, штаты и общины федеративной страны учитываются.",
};

/** What a score built from perceptions of the whole country covers, and what it is for. */
export const PERCEPTION_SCOPE: LocalizedText = {
  en: "The whole country. Scores move with the sources behind them and public perceptions can lag behind reforms; the World Bank intends them for research, policy analysis and reflection, not for credit or investment decisions.",
  de: "Das ganze Land. Die Werte folgen den zugrunde liegenden Quellen, und die Wahrnehmung kann Reformen hinterherhinken; die Weltbank sieht sie für Forschung, Politikanalyse und Reflexion vor, nicht für Kredit- oder Anlageentscheide.",
  fr: "Le pays entier. Les notes suivent les sources sous-jacentes et la perception peut retarder sur les réformes ; la Banque mondiale les destine à la recherche, à l'analyse des politiques et à la réflexion, pas aux décisions de crédit ou d'investissement.",
  it: "L'intero paese. I punteggi seguono le fonti sottostanti e la percezione può restare indietro rispetto alle riforme; la Banca mondiale li destina a ricerca, analisi delle politiche e riflessione, non a decisioni di credito o investimento.",
  ru: "Вся страна. Оценки зависят от исходных источников, а восприятие может отставать от реформ; Всемирный банк предназначает их для исследований, анализа политики и размышлений, а не для кредитных и инвестиционных решений.",
};

const WGI_LABEL: Templates = {
  en: "{label} (World Bank score, 0–100)",
  de: "{label} (Weltbank-Wert, 0–100)",
  fr: "{label} (note de la Banque mondiale, 0–100)",
  it: "{label} (punteggio della Banca mondiale, 0–100)",
  ru: "{label} (оценка Всемирного банка, 0–100)",
};

const WGI_DEFINITION: Templates = {
  en: "{label}, one of the six Worldwide Governance Indicators, as a score from 0 to 100 (higher is a better standing among the countries covered). It is a composite of perceptions drawn from 35 cross-country sources (household surveys, firm surveys and expert assessments), not a count of anything, and the World Bank treats it as an estimate rather than a definitive rating.",
  de: "{label}, einer der sechs Worldwide Governance Indicators, als Wert von 0 bis 100 (höher heisst eine bessere Stellung unter den erfassten Ländern). Ein Verbund von Wahrnehmungen aus 35 länderübergreifenden Quellen (Haushalts- und Unternehmensumfragen und Expertenbeurteilungen), keine Zählung; die Weltbank versteht ihn als Schätzung, nicht als endgültige Bewertung.",
  fr: "{label}, l'un des six Worldwide Governance Indicators, en note de 0 à 100 (plus élevée, meilleure position parmi les pays couverts). Un composite de perceptions tirées de 35 sources internationales (enquêtes auprès des ménages et des entreprises, évaluations d'experts), pas un dénombrement ; la Banque mondiale le considère comme une estimation, non comme une note définitive.",
  it: "{label}, uno dei sei Worldwide Governance Indicators, come punteggio da 0 a 100 (più alto, posizione migliore tra i paesi coperti). Un composito di percezioni tratte da 35 fonti internazionali (indagini presso famiglie e imprese, valutazioni di esperti), non un conteggio; la Banca mondiale lo considera una stima, non una valutazione definitiva.",
  ru: "{label} — один из шести Worldwide Governance Indicators, оценка от 0 до 100 (выше — лучше положение среди охваченных стран). Сводка восприятий из 35 международных источников (опросы домохозяйств и компаний, экспертные оценки), а не подсчёт; Всемирный банк считает её оценкой, а не окончательным рейтингом.",
};

/**
 * One of the World Bank's six Worldwide Governance Indicators (database 3), as a score from 0 to
 * 100. The name is given whole in each language, never assembled, so each language's grammar
 * holds; the rest is the family's.
 */
export function wgiMetric(metric: { key: string; code: string; name: LocalizedText }): MetricInput {
  return {
    key: metric.key,
    label: sentence(WGI_LABEL, metric.name),
    valueType: "number",
    unit: "none",
    plausible: { min: 0, max: 100 },
    statistic: {
      definition: sentence(WGI_DEFINITION, metric.name),
      scope: PERCEPTION_SCOPE,
      series: {
        publisher: "World Bank, Worldwide Governance Indicators",
        code: metric.code,
        url: "https://www.worldbank.org/en/publication/worldwide-governance-indicators",
        read: "worldbank_indicators",
        database: 3,
      },
    },
  };
}

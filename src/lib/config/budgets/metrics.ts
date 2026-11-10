/**
 * The metrics budgets are held in, generated from the taxonomies and the
 * requests that read them (./eurostat.ts), never listed by hand.
 */
import { categoryLabel } from "@/lib/budgets/taxonomy";
import type { LocalizedText, MetricInput } from "@/lib/config/places/schema";
import { EUROSTAT_PUBLISHER, EUROSTAT_REQUESTS, eurostatBrowserUrl, seriesOf } from "./eurostat";
import { GENERAL_GOVERNMENT } from "./scopes";

const LOCALES = ["en", "de", "fr", "it", "ru"] as const;

/** "{label}" put into a sentence in each language, the label falling back to English. */
const sentence = (templates: Record<(typeof LOCALES)[number], string>, label: LocalizedText) =>
  Object.fromEntries(
    LOCALES.map((l) => [l, templates[l].replace("{label}", label[l] ?? label.en ?? "")]),
  ) as LocalizedText;

const LABEL = {
  share: {
    en: "{label} (share of GDP)",
    de: "{label} (Anteil am BIP)",
    fr: "{label} (part du PIB)",
    it: "{label} (quota del PIL)",
    ru: "{label} (доля ВВП)",
  },
  meur: {
    en: "{label} (million euro)",
    de: "{label} (Millionen Euro)",
    fr: "{label} (millions d'euros)",
    it: "{label} (milioni di euro)",
    ru: "{label} (млн евро)",
  },
};

/**
 * What a figure may plausibly be: a share of GDP within the economy (a licence
 * sold, spectrum say, is booked as negative spending in its group), an amount in
 * million euro within the largest economy Eurostat covers several times over.
 */
const PLAUSIBLE = {
  share: { category: { min: -0.2, max: 1 }, balance: { min: -0.6, max: 0.6 } },
  meur: {
    category: { min: -500_000, max: 10_000_000 },
    balance: { min: -2_000_000, max: 2_000_000 },
  },
};

const DEFINITION = {
  expenditure: {
    en: "What general government spent on “{label}”, in per cent of GDP, on the United Nations' Classification of the Functions of Government (COFOG) as Eurostat publishes it.",
    de: "Was der Staat insgesamt für «{label}» ausgegeben hat, in Prozent des BIP, nach der Klassifikation der Aufgabenbereiche des Staates der Vereinten Nationen (COFOG), wie Eurostat sie veröffentlicht.",
    fr: "Ce que les administrations publiques ont dépensé pour « {label} », en pourcentage du PIB, selon la classification des fonctions des administrations publiques des Nations unies (CFAP), telle qu'Eurostat la publie.",
    it: "Ciò che le amministrazioni pubbliche hanno speso per «{label}», in percentuale del PIL, secondo la classificazione delle funzioni delle amministrazioni pubbliche delle Nazioni Unite (COFOG), come la pubblica Eurostat.",
    ru: "Сколько государственный сектор потратил на «{label}», в процентах ВВП, по Классификации функций органов государственного управления ООН (КФОГУ), как её публикует Евростат.",
  },
  revenue: {
    en: "What general government received as “{label}”, in per cent of GDP, as Eurostat's government finance statistics (ESA 2010) count it.",
    de: "Was der Staat insgesamt als «{label}» eingenommen hat, in Prozent des BIP, wie Eurostats Statistik der Staatsfinanzen (ESVG 2010) es zählt.",
    fr: "Ce que les administrations publiques ont reçu au titre de « {label} », en pourcentage du PIB, tel que les statistiques de finances publiques d'Eurostat (SEC 2010) le comptent.",
    it: "Ciò che le amministrazioni pubbliche hanno ricevuto come «{label}», in percentuale del PIL, come lo contano le statistiche di finanza pubblica di Eurostat (SEC 2010).",
    ru: "Сколько государственный сектор получил в виде «{label}», в процентах ВВП, как это считает статистика государственных финансов Евростата (ЕСС 2010).",
  },
};

const BALANCE_LABEL: LocalizedText = {
  en: "Government surplus (+) or deficit (−)",
  de: "Überschuss (+) oder Defizit (−) des Staates",
  fr: "Excédent (+) ou déficit (−) des administrations publiques",
  it: "Avanzo (+) o disavanzo (−) delle amministrazioni pubbliche",
  ru: "Профицит (+) или дефицит (−) государственного сектора",
};

const BALANCE_DEFINITION: LocalizedText = {
  en: "Net lending (+) or net borrowing (−) of general government, in per cent of GDP: revenue less expenditure, as Eurostat's government finance statistics (ESA 2010) count them.",
  de: "Finanzierungsüberschuss (+) oder -defizit (−) des Staates in Prozent des BIP: Einnahmen abzüglich Ausgaben, wie Eurostats Statistik der Staatsfinanzen (ESVG 2010) sie zählt.",
  fr: "Capacité (+) ou besoin (−) de financement des administrations publiques, en pourcentage du PIB : recettes moins dépenses, telles que les statistiques de finances publiques d'Eurostat (SEC 2010) les comptent.",
  it: "Accreditamento (+) o indebitamento (−) netto delle amministrazioni pubbliche, in percentuale del PIL: entrate meno spese, come le contano le statistiche di finanza pubblica di Eurostat (SEC 2010).",
  ru: "Чистое кредитование (+) или чистое заимствование (−) государственного сектора в процентах ВВП: доходы минус расходы, как их считает статистика государственных финансов Евростата (ЕСС 2010).",
};

/**
 * A division (depth 1), each total and the balance carry a `statistic` in
 * shares of GDP, so they chart, map and rank on /statistics; the amounts in
 * million euro and the groups feed the budget pages only.
 */
export const BUDGET_METRICS: readonly MetricInput[] = EUROSTAT_REQUESTS.flatMap((request) =>
  seriesOf(request).map(({ code, metric }): MetricInput => {
    const category = request.taxonomy.categories.find((c) => c.code === code);
    const charted = request.measure === "share" && (!category || category.depth <= 1);
    const series = {
      publisher: EUROSTAT_PUBLISHER,
      code: request.dataset,
      url: eurostatBrowserUrl(request.dataset),
      match: { ...request.filters, [request.dimension]: code },
    };
    const unit = request.measure === "share" ? ("ratio" as const) : ("none" as const);
    if (!category) {
      // The balance: revenue less expenditure, so it may be below zero.
      return {
        key: metric,
        label: request.measure === "share" ? BALANCE_LABEL : sentence(LABEL.meur, BALANCE_LABEL),
        valueType: "number",
        unit,
        plausible: PLAUSIBLE[request.measure].balance,
        ...(charted
          ? {
              statistic: {
                definition: BALANCE_DEFINITION,
                scope: GENERAL_GOVERNMENT.definition,
                series,
              },
            }
          : {}),
      };
    }
    const label = categoryLabel(category);
    return {
      key: metric,
      label: sentence(LABEL[request.measure], label),
      valueType: "number",
      unit,
      plausible: PLAUSIBLE[request.measure].category,
      ...(charted
        ? {
            statistic: {
              definition: sentence(DEFINITION[request.taxonomy.side], label),
              scope: GENERAL_GOVERNMENT.definition,
              series,
            },
          }
        : {}),
    };
  }),
);

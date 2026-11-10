/**
 * Every text in Solon's configuration written in more than one language (a
 * `LocalizedText`: `{ en, de, … }`), found by walking the configuration
 * itself, so a new rubric or a new budget law is found without being listed.
 * The sets are named, so a check can hold the ones readers see on translated
 * pages to every language, and report the rest.
 */
import { BUDGET_DOCUMENTS } from "@/lib/config/budgets";
import { COFOG } from "@/lib/config/budgets/cofog";
import { ESA_REVENUE } from "@/lib/config/budgets/revenue";
import { BUDGET_SCOPES } from "@/lib/config/budgets/scopes";
import { CONTEST_TOPICS, CONTESTS } from "@/lib/config/places/contested";
import { RATES } from "@/lib/config/money";
import { placesConfig } from "@/lib/config/places";
import { EXAMPLE_AXES } from "@/lib/config/statistics/axes";
import { DIMENSIONS } from "@/lib/config/statistics/dimensions";
import { GAPS } from "@/lib/config/statistics/gaps";
import { METHODOLOGIES } from "@/lib/config/statistics/methodologies";
import { RUBRICS } from "@/lib/config/statistics/rubrics";
import { STATISTIC_RECORDS } from "@/lib/config/statistics/records";

export type ConfigText = Readonly<Record<string, string>>;

const isLocalizedText = (o: Record<string, unknown>) => {
  const keys = Object.keys(o);
  return (
    keys.includes("en") && keys.every((k) => /^[a-z]{2,3}$/.test(k) && typeof o[k] === "string")
  );
};

/** Every localized text under a value, wherever it sits. */
export function textsIn(value: unknown, out: ConfigText[] = []): ConfigText[] {
  if (Array.isArray(value)) value.forEach((v) => textsIn(v, out));
  else if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    if (isLocalizedText(o)) out.push(o as ConfigText);
    else Object.values(o).forEach((v) => textsIn(v, out));
  }
  return out;
}

/** The configuration's texts, by the set they belong to. `core` sets are shown on translated pages. */
export const CONFIG_TEXT_SETS: readonly {
  key: string;
  core: boolean;
  value: unknown;
  /** Whether its citation strings are shown as written; a source is shown by its `attribution` instead. */
  citations?: false;
}[] = [
  { key: "statistics.dimensions", core: true, value: DIMENSIONS },
  { key: "statistics.axes", core: true, value: EXAMPLE_AXES },
  { key: "statistics.rubrics", core: true, value: RUBRICS },
  { key: "statistics.methodologies", core: false, value: METHODOLOGIES },
  { key: "statistics.gaps", core: false, value: GAPS },
  { key: "statistics.records", core: false, value: STATISTIC_RECORDS },
  { key: "places.contests", core: true, value: [CONTEST_TOPICS, CONTESTS] },
  { key: "places.packs", core: true, value: placesConfig.packs },
  { key: "places.sources", core: true, value: placesConfig.sources, citations: false },
  { key: "places.metrics", core: true, value: placesConfig.metrics },
  { key: "money", core: true, value: RATES.sources },
  { key: "budgets", core: true, value: [BUDGET_DOCUMENTS, COFOG, ESA_REVENUE, BUDGET_SCOPES] },
];

/**
 * The fields of the configuration that hold words a reader sees but are
 * written once, in English (who published a source, who wrote a rubric, who
 * translated a quote): the catalog gives them their other languages.
 */
export const CITATION_FIELDS = ["publisher", "dataset", "author", "translator"] as const;

/** Every citation string under a value, wherever it sits. */
export function citationsIn(value: unknown, out: string[] = []): string[] {
  if (Array.isArray(value)) value.forEach((v) => citationsIn(v, out));
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (typeof v === "string" && (CITATION_FIELDS as readonly string[]).includes(k)) out.push(v);
      else citationsIn(v, out);
    }
  }
  return out;
}

/** The core texts that have no words in `locale`, neither in the configuration nor in the catalog. */
export function untranslated(
  locale: string,
  translate: (english: string, locale: string) => string | undefined,
): { set: string; english: string }[] {
  return CONFIG_TEXT_SETS.filter((s) => s.core).flatMap((s) => {
    const texts = textsIn(s.value)
      .filter((t) => t[locale] === undefined && translate(t.en!, locale) === undefined)
      .map((t) => t.en!);
    const citations = (s.citations === false ? [] : citationsIn(s.value)).filter(
      (c) => translate(c, locale) === undefined,
    );
    return [...new Set([...texts, ...citations])].map((english) => ({ set: s.key, english }));
  });
}

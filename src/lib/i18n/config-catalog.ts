/**
 * Translations of the configuration's texts, kept apart from the
 * configuration so a rubric or a budget line is written once, in English,
 * beside its source, and its other languages are filled here
 * (`pnpm run i18n:config` reports what is missing). Keyed by the English
 * words: a changed English text has no translation until one is written for
 * it, so a stale translation is never shown.
 */
import catalog from "../../../data/i18n/config.json";

const CATALOG: Readonly<Record<string, Readonly<Record<string, string>>>> = catalog;

export function configTranslation(english: string, locale: string): string | undefined {
  return CATALOG[english]?.[locale];
}

/** A citation written once in English (who published, who translated) in the reader's language. */
export const cite = (text: string, locale: string): string =>
  configTranslation(text, locale) ?? text;

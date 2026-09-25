import { defineRouting } from "next-intl/routing";

/**
 * The languages Solon speaks — the one list every other file reads.
 *
 * English is the source every translation is made from, and the default: it
 * serves unprefixed (`/hire`), the others under their code (`/de/hire`).
 * German follows Swiss spelling (ss, never ß) — Solon's first readers are Swiss.
 */
export const locales = ["en", "de", "fr", "it", "ru"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

/** A route's `[locale]` segment as a Locale — English for anything unknown. */
export function toLocale(value: string): Locale {
  return (locales as readonly string[]).includes(value) ? (value as Locale) : defaultLocale;
}

/** Each language named in itself, as the switcher shows it. */
export const localeNames: Record<Locale, string> = {
  en: "English",
  de: "Deutsch",
  fr: "Français",
  it: "Italiano",
  ru: "Русский",
};

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "as-needed",
  // The URL decides, never the browser's Accept-Language: a reader who opened
  // an English link keeps reading English until they choose otherwise.
  localeDetection: false,
});

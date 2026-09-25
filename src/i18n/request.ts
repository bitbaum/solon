import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { defaultLocale, routing } from "./routing";
import en from "../../messages/en.json";

type Messages = Record<string, unknown>;

/**
 * English underneath, the requested language on top. A key a translation has
 * not reached yet falls back to the English sentence — never to a raw key name.
 * The parity test (src/i18n/__tests__) keeps such gaps from reaching main.
 */
function withFallback(base: Messages, over: Messages): Messages {
  const out: Messages = { ...base };
  for (const [key, value] of Object.entries(over)) {
    const b = base[key];
    out[key] =
      value && typeof value === "object" && !Array.isArray(value) && b && typeof b === "object"
        ? withFallback(b as Messages, value as Messages)
        : value;
  }
  return out;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : defaultLocale;
  const messages =
    locale === defaultLocale
      ? en
      : withFallback(en, (await import(`../../messages/${locale}.json`)).default);
  return { locale, messages };
});

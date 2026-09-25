"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { localeNames, routing, type Locale } from "@/i18n/routing";

/**
 * Change the language of the page you are on — same page, other language.
 * A native <select>: keyboard, screen reader and phone behave without help.
 * `list` renders every language as a link row, for the mobile menu.
 */
export default function LanguageSwitcher({
  list = false,
  onChange,
}: {
  list?: boolean;
  onChange?: () => void;
}) {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("Nav");
  const [pending, startTransition] = useTransition();

  const go = (next: Locale) => {
    startTransition(() => router.replace(pathname, { locale: next }));
    onChange?.();
  };

  if (list) {
    return (
      <div>
        <div className="kicker">{t("language")}</div>
        <ul className="mt-3 flex flex-wrap gap-2">
          {routing.locales.map((l) => (
            <li key={l}>
              <button
                type="button"
                lang={l}
                aria-current={l === locale ? "true" : undefined}
                onClick={() => go(l)}
                className={`min-h-11 px-4 text-sm font-semibold ${
                  l === locale
                    ? "bg-fg-primary text-fg-inverted"
                    : "border border-default text-fg-primary"
                }`}
              >
                {localeNames[l]}
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <label className="relative flex items-center">
      <span className="sr-only">{t("language")}</span>
      <select
        value={locale}
        disabled={pending}
        onChange={(e) => go(e.target.value as Locale)}
        className="cursor-pointer appearance-none bg-transparent py-2 pr-4 text-xs font-bold uppercase tracking-caps text-fg-primary"
      >
        {routing.locales.map((l) => (
          <option key={l} value={l} lang={l} className="bg-surface-base normal-case">
            {localeNames[l]}
          </option>
        ))}
      </select>
      <span
        className="pointer-events-none absolute right-0 text-xs text-fg-secondary"
        aria-hidden="true"
      >
        ▾
      </span>
    </label>
  );
}

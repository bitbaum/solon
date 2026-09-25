"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { TRANSLATED_ROUTES } from "@/lib/site-config";

/**
 * A page not yet translated says so, in the reader's own language, instead of
 * silently switching to English under a German menu.
 */
export default function TranslationNotice() {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("Notice");

  if (locale === routing.defaultLocale || TRANSLATED_ROUTES.has(pathname)) return null;

  return (
    <div className="border-b border-subtle bg-surface-raised">
      <p className="section-shell py-3 text-sm text-fg-secondary">{t("untranslated")}</p>
    </div>
  );
}

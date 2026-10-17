import { getPathname } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";

export type EntryMode = "sign-in" | "sign-up";

/**
 * The link to Solon's sign-in or create-an-account screen, remembering where
 * the person was so they come back to it.
 */
export function entryHref(mode: EntryMode, locale: string, from?: string): string {
  return getPathname({
    href: { pathname: mode === "sign-up" ? "/sign-up" : "/sign-in", query: from ? { from } : {} },
    locale: toLocale(locale),
  });
}

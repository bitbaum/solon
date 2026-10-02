import { getPathname } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import type { EntryMode } from "@bitbaum/accountkit/orangecat";

/**
 * The link that starts signing in or creating an account. /sign-in and
 * /sign-up are routes that hand over to OrangeCat at once, so they are linked
 * with a plain <a>, never a prefetching <Link>: a prefetch would start a
 * sign-in in the background on every page that shows the button.
 */
export function entryHref(mode: EntryMode, locale: string, from?: string): string {
  return getPathname({
    href: { pathname: mode === "sign-up" ? "/sign-up" : "/sign-in", query: from ? { from } : {} },
    locale: toLocale(locale),
  });
}

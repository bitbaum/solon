"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useSession } from "next-auth/react";
import { entryHref } from "@/lib/auth/entry-href";

/**
 * The header's session corner. Signed out: "Sign in", which opens OrangeCat's
 * sign-in screen (titled for Solon) and remembers this page so the reader
 * comes back to it. Signed
 * in: your name, linking to /account. Session state is fetched client-side so
 * the marketing pages stay static; until it arrives the signed-out label
 * shows, because most visitors are signed out.
 *
 * `compact` is the full-width version the mobile menu uses.
 */
export default function AuthControl({ compact = false }: { compact?: boolean }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const t = useTranslations("Nav");
  const locale = useLocale();

  const className = compact
    ? "btn-frame w-full"
    : "inline-flex min-h-11 min-w-11 items-center justify-center text-xs font-bold uppercase tracking-caps text-fg-primary transition-opacity hover:opacity-70";

  if (session?.actorId) {
    return (
      <Link href="/account" className={className}>
        {session.user?.name ?? t("account")}
      </Link>
    );
  }

  return (
    <a href={entryHref("sign-in", locale, pathname)} className={className}>
      {t("signIn")}
    </a>
  );
}

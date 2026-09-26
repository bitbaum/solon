"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useSession } from "next-auth/react";

/**
 * The header's session corner. Signed out: "Sign in", which opens Solon's own
 * sign-in page and remembers this page so the reader comes back to it. Signed
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

  const onEntryPage = pathname === "/sign-in" || pathname === "/sign-up";
  return (
    <Link
      href={onEntryPage ? "/sign-in" : { pathname: "/sign-in", query: { from: pathname } }}
      className={className}
    >
      {t("signIn")}
    </Link>
  );
}

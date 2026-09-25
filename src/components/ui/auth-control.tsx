"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { signIn, useSession } from "next-auth/react";

/**
 * The header's session corner. Signed out: "Sign in" — OrangeCat is the only
 * identity provider, so there is nothing to choose between. Signed in: your
 * name, linking to /account. Session state is fetched client-side so the
 * marketing pages stay static; until it arrives the signed-out label shows,
 * because most visitors are signed out.
 *
 * `compact` is the full-width version the mobile menu uses.
 */
export default function AuthControl({ compact = false }: { compact?: boolean }) {
  const { data: session } = useSession();
  const t = useTranslations("Nav");

  const className = compact
    ? "btn-frame w-full"
    : "text-xs font-bold uppercase tracking-caps text-fg-primary transition-opacity hover:opacity-70";

  if (session?.actorId) {
    return (
      <Link href="/account" className={className}>
        {session.user?.name ?? t("account")}
      </Link>
    );
  }

  return (
    <button type="button" onClick={() => signIn("orangecat")} className={className}>
      {t("signIn")}
    </button>
  );
}

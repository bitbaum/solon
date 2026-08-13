"use client";

import Link from "next/link";
import { signIn, useSession } from "next-auth/react";

/**
 * The nav's session corner. Signed out: one button, one provider — OrangeCat
 * is the stack's only identity root, so there is nothing to choose between.
 * Signed in: your name, linking to /account. Session state is fetched
 * client-side (SessionProvider) so the marketing pages stay static.
 */
export default function AuthControl({ compact = false }: { compact?: boolean }) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <span className={compact ? "block px-3 py-2" : "px-4 py-2"} aria-hidden="true" />;
  }

  if (session?.actorId) {
    return (
      <Link
        href="/account"
        className={
          compact
            ? "block px-3 py-2 text-sm font-medium text-navy hover:bg-surface-raised rounded-md"
            : "px-4 py-2 text-sm font-medium text-navy hover:text-navy-light transition-colors"
        }
      >
        {session.user?.name ?? "Account"}
      </Link>
    );
  }

  return (
    <button
      onClick={() => signIn("orangecat")}
      className={
        compact
          ? "block w-full text-left px-3 py-2 text-sm font-medium text-navy hover:bg-surface-raised rounded-md"
          : "px-4 py-2 text-sm font-medium text-navy border border-default rounded-md hover:bg-surface-raised transition-colors"
      }
    >
      Sign in with OrangeCat
    </button>
  );
}

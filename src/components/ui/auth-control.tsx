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
  const { data: session } = useSession();

  // While the session is still loading (including SSR, where it always is),
  // render the signed-out button: most visitors ARE signed out, and a blank
  // placeholder meant the control was invisible on first paint. A signed-in
  // user sees the button swap to their name once the session arrives.
  if (session?.actorId) {
    return (
      <Link
        href="/account"
        className={
          compact
            ? "block px-3 py-2 text-sm font-medium text-fg-primary hover:bg-surface-raised rounded-control"
            : "px-4 py-2 text-sm font-medium text-fg-primary hover:text-fg-primary transition-colors"
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
          ? "block w-full text-left px-3 py-2 text-sm font-medium text-fg-primary hover:bg-surface-raised rounded-control"
          : "px-4 py-2 text-sm font-medium text-fg-primary border border-default rounded-control hover:bg-surface-raised transition-colors"
      }
    >
      Sign in with OrangeCat
    </button>
  );
}

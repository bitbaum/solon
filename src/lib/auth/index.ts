import { createAuthMailer } from "@bitbaum/accountkit/auth/mail";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isDeliverable } from "@bitbaum/accountkit/auth";
import { createAuthRuntime } from "@bitbaum/accountkit/auth/next";
import { dbConfigured, getDb } from "@/lib/db/client";

/**
 * Accounts on Solon — the fleet's one account system
 * (@bitbaum/accountkit/auth). A person signs up here with an email and a
 * password, a passkey, or "Continue with OrangeCat"; an OrangeCat account is
 * one way in, never a requirement.
 *
 * A session says who you are; it grants nothing by itself. A seat you hold
 * lets you act with one click (proof ACCOUNT, recorded as exactly that), or
 * you sign an act with your own Bitcoin key (proof BIP137) so anyone can
 * re-verify it — see lib/auth/actor.ts. Either way the seat is looked up
 * fresh from the members table on every request.
 *
 * Seats were keyed on the OrangeCat actor id before Solon had accounts.
 * `legacyIdentityProvider` keeps it that way for everyone whose first way in
 * was OrangeCat, so their seats, votes and Loki grants stay theirs with no
 * data migration. Everyone else is their account id.
 */
export const authSite = {
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://solon.orangecat.ch",
  title: "Solon",
  slug: "solon",
};
export const authMail = createAuthMailer({ site: authSite });
export const mailConfigured = () => authMail.configured;

export const { GET, POST, getSession, requireUser, authStatus, getAuth } = createAuthRuntime({
  site: authSite,
  mail: authMail,
  isDatabaseConfigured: () => dbConfigured(),
  getDatabase: () => getDb(),
  legacyIdentityProvider: "orangecat",
});

const issuer = (process.env.ORANGECAT_OAUTH_ISSUER ?? "https://orangecat.ch").replace(/\/$/, "");

/** Where a person who came in through OrangeCat manages that account. */
export const orangecatSettingsUrl = new URL("/settings", issuer).toString();

/**
 * False when this deployment has no database or no session secret. The nav
 * then hides the sign-in control rather than offering one that cannot work.
 */
export const authEnabled = authStatus().ready;

/** The signed-in person as the rest of Solon reads them. */
export interface SolonSession {
  /** The id every seat, vote and grant uses (see legacyIdentityProvider above). */
  actorId: string;
  user: { name: string | null; email: string | null; image: string | null };
}

/**
 * The current session, or null. An address that cannot receive mail (one
 * invented for a person who came in without one) is never passed on as an
 * email.
 */
export async function auth(): Promise<SolonSession | null> {
  const session = await getSession();
  if (!session) return null;
  const { user } = session;
  return {
    actorId: user.actorId,
    user: {
      name: user.name || null,
      email: isDeliverable(user.email) ? user.email : null,
      image: user.image ?? null,
    },
  };
}

/** End the session and go where the caller asked. */
export async function signOut(options: { redirectTo: string }): Promise<never> {
  try {
    await getAuth().api.signOut({ headers: await headers() });
  } catch {
    // Already signed out, or accounts unavailable: either way, go on.
  }
  redirect(options.redirectTo);
}

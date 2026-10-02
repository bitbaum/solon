import NextAuth from "next-auth";
import { orangecatClient, orangecatProvider, syncOcSession } from "@bitbaum/accountkit/orangecat";
import { isRecognizableProfile } from "./recognition";

/**
 * "Sign in with OrangeCat" — the ONLY login Solon will ever have.
 *
 * OrangeCat is the stack's identity root; Solon is the legitimacy root.
 * A session identifies you; it grants nothing by itself. A signed-in member
 * may act through it with one click (proof ACCOUNT, recorded as exactly
 * that), or sign an act with their own Bitcoin key (proof BIP137) so anyone
 * can re-verify it — see lib/auth/actor.ts. Either way the seat is looked up
 * fresh. This config has no adapter and no database tables: the JWT carries the OrangeCat actor id
 * and profile claims, and membership is looked up fresh from the members
 * table wherever it matters.
 *
 * The provider and the session refresh live once, in
 * @bitbaum/accountkit/orangecat, with their contract tests: client_secret_post,
 * PKCE, identity scopes only (Solon never asks for OC capability scopes —
 * governance authority flows the other way, via Bitcoin-signed votes), and a
 * session that ends when OrangeCat revokes the grant.
 */

const orangecat = orangecatClient();
const issuer = orangecat?.issuer ?? "https://orangecat.ch";

/** Where a person manages their one account, email included. */
export const orangecatSettingsUrl = new URL("/settings", issuer).toString();

/** True when the OrangeCat OAuth pair is configured; the nav hides the
 * sign-in control otherwise instead of mounting a provider that fails
 * opaquely at the code exchange. */
export const authEnabled = orangecat !== null;

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { error: "/auth/error" },
  providers: orangecat ? [orangecatProvider(orangecat)] : [],
  callbacks: {
    signIn({ profile }) {
      // Anonymous OrangeCat accounts (no email) cannot be recognized as a
      // governance identity — /auth/error explains this to the visitor.
      return isRecognizableProfile(profile);
    },
    async jwt({ token, profile, account }) {
      if (profile?.sub) {
        // id_token.sub is the OrangeCat actor id — the cross-product
        // identity boundary (never email; see loki's provider note).
        token.actorId = profile.sub;
        // The person's face as OrangeCat shows it: handle and picture. Read
        // here, written to the roster by the account page (member-identity.ts).
        token.ocUsername =
          typeof profile.preferred_username === "string" ? profile.preferred_username : null;
        token.picture = typeof profile.picture === "string" ? profile.picture : token.picture;
      }
      // Records the actor id and tokens on sign-in; afterwards refreshes, and
      // a refusal (Disconnect on OrangeCat, Sign out everywhere, account
      // deleted) ends the session.
      return syncOcSession({ token, profile, account }, orangecat);
    },
    session({ session, token }) {
      if (typeof token.actorId === "string") {
        session.actorId = token.actorId;
      }
      session.ocUsername = typeof token.ocUsername === "string" ? token.ocUsername : null;
      return session;
    },
  },
});

declare module "next-auth" {
  interface Session {
    /** OrangeCat actor id (id_token.sub) of the signed-in visitor. */
    actorId?: string;
    /** OrangeCat handle (id_token.preferred_username); null for an account without one. */
    ocUsername?: string | null;
  }
}

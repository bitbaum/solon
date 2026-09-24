import NextAuth from "next-auth";
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
 * The provider mirrors Loki's proven config (loki src/auth.ts):
 * OC's token endpoint accepts only client_secret_post, and requires PKCE
 * even for confidential clients.
 */

const clientId = process.env.ORANGECAT_OAUTH_CLIENT_ID;
const clientSecret = process.env.ORANGECAT_OAUTH_CLIENT_SECRET;

/** True when the OrangeCat OAuth pair is configured; the nav hides the
 * sign-in control otherwise instead of mounting a provider that fails
 * opaquely at the code exchange. */
export const authEnabled = Boolean(clientId && clientSecret);

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { error: "/auth/error" },
  providers: authEnabled
    ? [
        {
          id: "orangecat",
          name: "OrangeCat",
          type: "oidc",
          issuer: process.env.ORANGECAT_OAUTH_ISSUER ?? "https://orangecat.ch",
          clientId,
          clientSecret,
          client: { token_endpoint_auth_method: "client_secret_post" },
          checks: ["pkce", "state"],
          // Identity only — Solon never asks for OC capability scopes.
          // Governance authority flows the other way, via Bitcoin-signed
          // votes that OC re-verifies against pinned keys.
          authorization: { params: { scope: "openid profile email" } },
        },
      ]
    : [],
  callbacks: {
    signIn({ profile }) {
      // Anonymous OrangeCat accounts (no email) cannot be recognized as a
      // governance identity — /auth/error explains this to the visitor.
      return isRecognizableProfile(profile);
    },
    jwt({ token, profile }) {
      if (profile?.sub) {
        // id_token.sub is the OrangeCat actor id — the cross-product
        // identity boundary (never email; see loki's provider note).
        token.actorId = profile.sub;
      }
      return token;
    },
    session({ session, token }) {
      if (typeof token.actorId === "string") {
        session.actorId = token.actorId;
      }
      return session;
    },
  },
});

declare module "next-auth" {
  interface Session {
    /** OrangeCat actor id (id_token.sub) of the signed-in visitor. */
    actorId?: string;
  }
}

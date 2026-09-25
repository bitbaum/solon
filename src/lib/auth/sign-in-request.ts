/**
 * What Solon asks OrangeCat for when someone signs in or creates an account.
 *
 * Solon has its own "Create account" and "Sign in" screens, but not its own
 * user table: one account serves OrangeCat, Loki and Solon, and OrangeCat
 * holds it (docs/design/2026-09-uniform-auth.md, option A). So the choice the
 * person makes here travels to OrangeCat as authorization parameters, and
 * OrangeCat's screen opens already in that state:
 *
 *   prompt=create   open on "Create account" (OIDC Prompt Create 1.0)
 *   login_hint      the email they typed, pre-filled
 *   idp_hint        straight to Google or GitHub
 *
 * Auth.js merges these into the authorization URL verbatim, including over
 * its own parameters, so only the three keys above are ever produced and every
 * value is checked first.
 */

export type EntryMode = "sign-in" | "sign-up";

/** The providers OrangeCat has switched on that Solon offers a button for. */
export const SOCIAL_PROVIDERS = ["google", "github"] as const;
export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number];

const EMAIL = /^[^\s@<>"]{1,64}@[^\s@<>"]{1,255}$/;

export function isSocialProvider(value: unknown): value is SocialProvider {
  return typeof value === "string" && (SOCIAL_PROVIDERS as readonly string[]).includes(value);
}

export function authorizationParams(input: {
  mode: EntryMode;
  email?: string | null;
  provider?: string | null;
}): Record<string, string> {
  const params: Record<string, string> = {};
  if (input.mode === "sign-up") params.prompt = "create";
  const email = input.email?.trim();
  if (email && EMAIL.test(email)) params.login_hint = email;
  if (isSocialProvider(input.provider)) params.idp_hint = input.provider;
  return params;
}

/**
 * Where to land after signing in: the page they came from, if it is one of
 * ours. `from` arrives in a URL anyone can write.
 */
export function returnPath(from: unknown, fallback = "/account"): string {
  return typeof from === "string" && from.startsWith("/") && !from.startsWith("//")
    ? from
    : fallback;
}

import { createAuthMailer } from "@bitbaum/accountkit/auth/mail";

/**
 * Account mail — the reset link, the sign-in link and the address check —
 * through the fleet's one mailer (@bitbaum/accountkit/auth/mail, which sends
 * with @bitbaum/mail-kit). It reads RESEND_API_KEY and RESEND_FROM when it is
 * asked, never at build time. Without a usable key it reports itself as not
 * configured, and the sign-in screen offers no "Forgot your password?" and no
 * sign-in link: nothing is promised that cannot arrive.
 *
 * Kept apart from ./index.ts so it can be checked without a request.
 */
export const authSite = {
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://solon.orangecat.ch",
  title: "Solon",
  slug: "solon",
};

export const authMail = createAuthMailer({ site: authSite });

export const mailConfigured = (): boolean => authMail.configured;

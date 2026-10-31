import type { SignInMethods } from "@bitbaum/accountkit/auth";

/** A way back in for someone who has lost their password. */
export type LostPasswordWay = "passkey" | "orangecat" | "contact";

/**
 * What the sign-in screen tells someone who has lost their password while
 * this deployment cannot send email (no dead ends). With mail, the shared
 * "Forgot your password?" flow is the way back and nothing more is shown.
 * Without it, only the ways this deployment really offers: a passkey they
 * may have added, OrangeCat if it is switched on here, and writing to us.
 */
export function lostPasswordWays(methods: SignInMethods): LostPasswordWay[] {
  if (methods.passwordReset) return [];
  const ways: LostPasswordWay[] = [];
  if (methods.passkey) ways.push("passkey");
  if (methods.orangecat) ways.push("orangecat");
  ways.push("contact");
  return ways;
}

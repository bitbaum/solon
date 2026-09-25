"use server";

import { getPathname } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import { signIn } from "@/lib/auth";
import { authorizationParams, returnPath } from "@/lib/auth/sign-in-request";

/**
 * The one submit behind /sign-in and /sign-up: the email field's Continue and
 * every provider button post here. It hands the person to OrangeCat with what
 * they chose (see sign-in-request.ts) and brings them back to where they were,
 * in their language.
 */
export async function startSignIn(formData: FormData) {
  const field = (name: string) => {
    const v = formData.get(name);
    return typeof v === "string" ? v : null;
  };
  const locale = toLocale(field("locale") ?? "en");
  const redirectTo = getPathname({ href: returnPath(field("from")), locale });
  await signIn(
    "orangecat",
    { redirectTo },
    authorizationParams({
      mode: field("mode") === "sign-up" ? "sign-up" : "sign-in",
      email: field("email"),
      provider: field("provider"),
    }),
  );
}

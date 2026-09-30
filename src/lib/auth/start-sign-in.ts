"use server";

import { beginSignIn } from "@/lib/auth/begin-sign-in";

/**
 * The form version of GET /sign-in, for buttons that post (the error page's
 * "Try again"): the same hand-over to OrangeCat, with what the form carries.
 */
export async function startSignIn(formData: FormData) {
  const field = (name: string) => {
    const v = formData.get(name);
    return typeof v === "string" ? v : null;
  };
  await beginSignIn({
    mode: field("mode") === "sign-up" ? "sign-up" : "sign-in",
    locale: field("locale") ?? "en",
    from: field("from"),
    email: field("email"),
    provider: field("provider"),
  });
}

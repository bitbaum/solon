"use server";

import { redirect } from "next/navigation";
import { returnPath } from "@bitbaum/accountkit/orangecat";
import { toLocale } from "@/i18n/routing";
import { entryHref } from "@/lib/auth/entry-href";

/**
 * The form version of a sign-in link, for buttons that post (the error page's
 * "Try again"): Solon's own sign-in or sign-up screen, keeping where they
 * were going.
 */
export async function startSignIn(formData: FormData) {
  const field = (name: string) => {
    const v = formData.get(name);
    return typeof v === "string" ? v : null;
  };
  const mode = field("mode") === "sign-up" ? "sign-up" : "sign-in";
  redirect(
    entryHref(mode, toLocale(field("locale") ?? "en"), returnPath(field("from"), "/account")),
  );
}

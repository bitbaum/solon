import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { getPathname } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import { auth, authEnabled, signIn } from "@/lib/auth";
import { authorizationParams, returnPath, type EntryMode } from "@/lib/auth/sign-in-request";

export interface SignInStart {
  mode: EntryMode;
  locale: string;
  from?: string | null;
  email?: string | null;
  provider?: string | null;
}

/**
 * Hands the person to OrangeCat's sign-in screen, which is titled for Solon
 * and offers email and password, an emailed code, Google, GitHub and "Create
 * an account" (docs/design/2026-09-uniform-auth.md). Solon has no sign-in
 * screen of its own in front of it: one screen, the same in every product.
 * They come back to `from`, in their language.
 */
export async function beginSignIn(start: SignInStart): Promise<never> {
  const locale = toLocale(start.locale);
  const redirectTo = getPathname({ href: returnPath(start.from), locale });
  await signIn(
    "orangecat",
    { redirectTo },
    authorizationParams({ mode: start.mode, email: start.email, provider: start.provider }),
  );
  throw new Error("signIn did not redirect");
}

/**
 * GET /sign-in and /sign-up. Signed in already: straight to where they were
 * going. Sign-in not configured: the error page, which says so and offers the
 * way back.
 */
export function entryRoute(mode: EntryMode) {
  return async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ locale: string }> },
  ): Promise<never> {
    const locale = toLocale((await params).locale);
    const from = request.nextUrl.searchParams.get("from");
    if ((await auth())?.actorId) {
      redirect(getPathname({ href: returnPath(from), locale }));
    }
    if (!authEnabled) {
      redirect(getPathname({ href: "/auth/error?error=Configuration", locale }));
    }
    return beginSignIn({ mode, locale, from });
  };
}

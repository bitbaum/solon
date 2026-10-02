import { SignInError } from "@bitbaum/accountkit";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import { authEnabled, orangecatSettingsUrl } from "@/lib/auth";
import { startSignIn } from "@/lib/auth/start-sign-in";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const t = await getTranslations({
    locale: toLocale((await params).locale),
    namespace: "AuthError",
  });
  return { title: `${t("metaTitle")} — Solon`, robots: { index: false } };
}

/**
 * Auth.js sends a sign-in that did not finish here, with ?error=<code>.
 * AccessDenied is our signIn callback turning away an OrangeCat account with
 * no email, because a governance identity must be attributable; the way on is
 * to add one on OrangeCat, so that is the first button. Anything else gets a
 * retry that starts the sign-in again directly, without another screen.
 *
 * The screen is @bitbaum/accountkit's SignInError — this page was its model.
 */
export default async function AuthErrorPage({ params, searchParams }: Props) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations("AuthError");
  const error = (await searchParams).error;

  return (
    <main className="section-shell flex min-h-[calc(100svh-var(--public-nav-height))] items-center py-16">
      <div className="mx-auto w-full max-w-md">
        <SignInError
          error={error}
          retry={authEnabled ? startSignIn : getPathname({ href: "/", locale })}
          retryFields={{ mode: "sign-in", locale, provider: "" }}
          home={getPathname({ href: "/", locale })}
          labels={{
            kicker: t("kicker"),
            failedTitle: t("failedTitle"),
            failedBody: t("failedLede"),
            deniedTitle: t("deniedTitle"),
            deniedBody: t("deniedLede"),
            configurationTitle: t("failedTitle"),
            configurationBody: t("failedLede"),
            tryAgain: t("tryAgain"),
            home: t("back"),
          }}
        >
          {error === "AccessDenied" && (
            <a href={orangecatSettingsUrl} className="acct-signin-button" rel="noopener noreferrer">
              {t("addEmail")}
            </a>
          )}
        </SignInError>

        <p className="mt-10 border-t border-default pt-6 text-sm text-fg-secondary">
          {t("readFreely")}
        </p>
      </div>
    </main>
  );
}

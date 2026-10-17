import { SignInError } from "@bitbaum/accountkit";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import { authEnabled } from "@/lib/auth";
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
 * A sign-in that did not finish, for links that still arrive with
 * ?error=<code>. The retry goes back to Solon's sign-in screen, which offers
 * every way in. The screen is @bitbaum/accountkit's SignInError.
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
          retryFields={{ mode: "sign-in", locale }}
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
        />

        <p className="mt-10 border-t border-default pt-6 text-sm text-fg-secondary">
          {t("readFreely")}
        </p>
      </div>
    </main>
  );
}

import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
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
 */
export default async function AuthErrorPage({ params, searchParams }: Props) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations("AuthError");
  const denied = (await searchParams).error === "AccessDenied";

  const retry = authEnabled && (
    <form action={startSignIn}>
      <input type="hidden" name="mode" value="sign-in" />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="provider" value="" />
      <button
        type="submit"
        className={`${denied ? "btn-secondary" : "btn-primary"} min-h-12 w-full`}
      >
        {t("tryAgain")}
      </button>
    </form>
  );

  return (
    <main className="section-shell flex min-h-[calc(100svh-var(--public-nav-height))] items-center py-16">
      <div className="mx-auto w-full max-w-md">
        <div className="kicker">{t("kicker")}</div>
        <h1 className="headline mt-4 text-4xl">{denied ? t("deniedTitle") : t("failedTitle")}</h1>
        <p className="mt-5 text-lg text-fg-secondary">
          {denied ? t("deniedLede") : t("failedLede")}
        </p>

        <div className="mt-10 grid gap-3">
          {denied && (
            <a
              href={orangecatSettingsUrl}
              className="btn-primary min-h-12 w-full"
              rel="noopener noreferrer"
            >
              {t("addEmail")}
            </a>
          )}
          {retry}
          <Link
            href="/"
            className="min-h-11 text-center text-sm font-semibold leading-[2.75rem] text-fg-secondary underline-offset-4 hover:text-fg-primary hover:underline"
          >
            {t("back")}
          </Link>
        </div>

        <p className="mt-10 border-t border-default pt-6 text-sm text-fg-secondary">
          {t("readFreely")}
        </p>
      </div>
    </main>
  );
}

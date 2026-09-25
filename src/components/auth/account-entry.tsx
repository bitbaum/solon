import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PHOTOS } from "@/lib/content/photos";
import { authEnabled } from "@/lib/auth";
import { startSignIn } from "@/lib/auth/start-sign-in";
import { SOCIAL_PROVIDERS, type EntryMode } from "@/lib/auth/sign-in-request";

/**
 * /sign-in and /sign-up. One question per screen: your email, or a provider.
 *
 * What the person needs to decide is small, so the page is too: the form, one
 * sentence on what the account is, and one on what happens next — they finish
 * on OrangeCat's screen, which holds the account for all three products, and
 * come straight back. Reading anything on Solon never needs an account, and
 * the page says so, so nobody signs up just to look.
 */
export default async function AccountEntry({
  mode,
  from,
  locale,
}: {
  mode: EntryMode;
  from: string | undefined;
  locale: string;
}) {
  const t = await getTranslations("Entry");
  const alt = await getTranslations("Photos");
  const signUp = mode === "sign-up";
  const switchQuery = from ? { from } : undefined;

  return (
    <main className="grid min-h-[calc(100svh-var(--public-nav-height))] lg:grid-cols-2">
      <section className="section-shell flex flex-col justify-center py-16 lg:px-16">
        <div className="w-full max-w-md">
          <div className="kicker">{t("kicker")}</div>
          <h1 className="headline mt-4 text-4xl sm:text-5xl">
            {signUp ? t("signUpTitle") : t("signInTitle")}
          </h1>
          <p className="mt-5 text-lg text-fg-secondary">{t("lede")}</p>

          {authEnabled ? (
            <form action={startSignIn} className="mt-10">
              <input type="hidden" name="mode" value={mode} />
              <input type="hidden" name="locale" value={locale} />
              {from && <input type="hidden" name="from" value={from} />}

              <label htmlFor="entry-email" className="text-sm font-semibold text-fg-primary">
                {t("emailLabel")}
              </label>
              <input
                id="entry-email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                placeholder={t("emailPlaceholder")}
                className="field mt-2"
              />
              <button type="submit" className="btn-primary mt-4 min-h-12 w-full">
                {t("continue")}
              </button>

              <div className="my-8 flex items-center gap-4 text-xs uppercase tracking-caps text-fg-tertiary">
                <span className="h-px flex-1 bg-border-default" aria-hidden="true" />
                {t("or")}
                <span className="h-px flex-1 bg-border-default" aria-hidden="true" />
              </div>

              <div className="grid gap-3">
                {SOCIAL_PROVIDERS.map((provider) => (
                  <button
                    key={provider}
                    type="submit"
                    name="provider"
                    value={provider}
                    formNoValidate
                    className="btn-secondary min-h-12 w-full"
                  >
                    {t(`with.${provider}`)}
                  </button>
                ))}
                <button
                  type="submit"
                  name="provider"
                  value=""
                  formNoValidate
                  className="min-h-11 text-sm font-semibold text-fg-secondary underline-offset-4 hover:text-fg-primary hover:underline"
                >
                  {t("with.orangecat")}
                </button>
              </div>
            </form>
          ) : (
            <p className="mt-10 rounded-control border border-default p-4 text-sm text-fg-secondary">
              {t("unavailable")}
            </p>
          )}

          <p className="mt-10 text-sm text-fg-secondary">
            <Link
              href={{ pathname: signUp ? "/sign-in" : "/sign-up", query: switchQuery }}
              className="font-semibold text-fg-primary underline underline-offset-4"
            >
              {signUp ? t("toSignIn") : t("toSignUp")}
            </Link>
          </p>

          <details className="mt-10 border-t border-default pt-6 text-sm text-fg-secondary">
            <summary className="cursor-pointer font-semibold text-fg-primary">
              {t("howTitle")}
            </summary>
            <p className="mt-3 leading-relaxed">{t("how")}</p>
            <p className="mt-3 leading-relaxed">{t("readFreely")}</p>
          </details>
        </div>
      </section>

      <aside className="sticky top-nav hidden h-[calc(100svh-var(--public-nav-height))] overflow-hidden bg-surface-public lg:block">
        <Image
          src={PHOTOS.landsgemeinde.image}
          alt={alt("landsgemeinde")}
          fill
          sizes="50vw"
          placeholder="blur"
          priority
          className="object-cover"
          style={{ objectPosition: "center 65%" }}
        />
        <div className="scrim absolute inset-0" aria-hidden="true" />
        <p className="headline-caps absolute bottom-12 left-12 right-12 text-3xl">
          {t("photoLine")}
        </p>
      </aside>
    </main>
  );
}

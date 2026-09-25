import { use } from "react";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { toLocale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import FullBleed from "@/components/site/full-bleed";
import { PHOTOS } from "@/lib/content/photos";
import { CONTACT_EMAIL } from "@/lib/site-config";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params) {
  const t = await getTranslations({ locale: toLocale((await params).locale), namespace: "Hire" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

/**
 * For someone deciding whether to have Solon run their group's governance.
 * What they need: what they get, who it suits, how it starts, what it costs.
 * One action: write to us.
 */
export default function HirePage({ params }: Params) {
  setRequestLocale(toLocale(use(params).locale));
  const t = useTranslations("Hire");
  const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(t("mailSubject"))}`;

  return (
    <main>
      <FullBleed photo={PHOTOS.landsgemeinde} priority under position="center 65%" daylight>
        <div className="rise max-w-3xl">
          <div className="kicker">{t("hero.kicker")}</div>
          <h1 className="headline-caps mt-5 text-5xl sm:text-6xl lg:text-7xl">{t("hero.title")}</h1>
          <p className="mt-7 max-w-xl text-lg text-fg-primary sm:text-xl">{t("hero.lede")}</p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <a href={mailto} className="btn-frame-accent">
              {t("hero.talk")}
            </a>
            <a href="#what-you-get" className="btn-frame">
              {t("hero.whatYouGet")}
            </a>
          </div>
        </div>
      </FullBleed>

      <section id="what-you-get" className="section-shell py-section">
        <div className="kicker">{t("offer.kicker")}</div>
        <h2 className="headline-caps mt-5 max-w-3xl text-4xl sm:text-5xl">{t("offer.title")}</h2>
        <div className="mt-14 grid gap-x-10 gap-y-12 md:grid-cols-2">
          {(["rules", "decisions", "agent", "person"] as const).map((item, i) => (
            <div key={item} className="border-t border-strong pt-6">
              <div className="font-mono text-sm text-fg-tertiary">0{i + 1}</div>
              <h3 className="mt-3 text-2xl font-semibold text-fg-primary">
                {t(`offer.${item}.title`)}
              </h3>
              <p className="mt-3 max-w-lg text-fg-secondary">{t(`offer.${item}.body`)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-subtle bg-surface-public py-section">
        <div className="section-shell grid gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <div className="kicker">{t("suits.kicker")}</div>
            <h2 className="headline-caps mt-5 text-4xl sm:text-5xl">{t("suits.title")}</h2>
          </div>
          <ul className="divide-y divide-subtle border-y border-subtle">
            {(["companies", "towns", "associations", "communities"] as const).map((g) => (
              <li key={g} className="py-6">
                <h3 className="text-lg font-semibold text-fg-primary">{t(`suits.${g}.title`)}</h3>
                <p className="mt-2 text-fg-secondary">{t(`suits.${g}.body`)}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section-shell py-section">
        <div className="kicker">{t("start.kicker")}</div>
        <h2 className="headline-caps mt-5 max-w-3xl text-4xl sm:text-5xl">{t("start.title")}</h2>
        <ol className="mt-14 grid gap-12 md:grid-cols-3 md:gap-10">
          {(["tell", "write", "decide"] as const).map((s, i) => (
            <li key={s} className="border-t border-strong pt-6">
              <div className="font-mono text-sm text-fg-tertiary">0{i + 1}</div>
              <h3 className="headline-caps mt-4 text-2xl">{t(`start.${s}.title`)}</h3>
              <p className="mt-4 text-fg-secondary">{t(`start.${s}.body`)}</p>
            </li>
          ))}
        </ol>

        <div className="mt-20 grid gap-10 border-t border-strong pt-10 lg:grid-cols-2">
          <div>
            <h3 className="headline text-3xl">{t("cost.title")}</h3>
            <p className="mt-4 max-w-lg text-fg-secondary">{t("cost.body")}</p>
          </div>
          <div className="flex flex-col items-start justify-end gap-4">
            <a href={mailto} className="btn-frame-accent">
              {t("cost.write", { email: CONTACT_EMAIL })}
            </a>
            <Link
              href="/orgs/new"
              className="text-sm text-fg-secondary underline underline-offset-4 hover:text-fg-primary"
            >
              {t("cost.own")}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

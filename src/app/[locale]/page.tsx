import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { toLocale } from "@/i18n/routing";
import { use } from "react";
import { Link } from "@/i18n/navigation";
import FullBleed from "@/components/site/full-bleed";
import { MethodLab } from "@/components/learn/method-lab";
import { PHOTOS } from "@/lib/content/photos";
import AudienceTile from "@/components/site/audience-tile";
import { USE_CASES, type UseCase } from "@/lib/content/use-cases";
import { HIRE_HREF } from "@/lib/site-config";

/**
 * The front door. A visitor should leave knowing three things: Solon runs how a
 * group decides, it keeps that in the open, and they can have it run for them.
 * Each section makes one of those points and offers one way forward. Every
 * sentence lives in messages/<locale>.json under `Home`.
 */
export default function Home({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale(toLocale(use(params).locale));
  const t = useTranslations("Home");

  return (
    <main>
      <FullBleed photo={PHOTOS.earthAtNight} priority under position="center 70%">
        <div className="rise max-w-4xl">
          <div className="kicker">{t("hero.kicker")}</div>
          <h1 className="headline-caps mt-5 text-5xl sm:text-6xl lg:text-8xl">
            {t("hero.line1")}
            <br />
            {t("hero.line2")}
          </h1>
          <p className="mt-7 max-w-xl text-lg text-fg-primary sm:text-xl">{t("hero.lede")}</p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href={HIRE_HREF} className="btn-frame-accent">
              {t("hero.hire")}
            </Link>
            <a href="#how" className="btn-frame">
              {t("hero.how")}
            </a>
          </div>
        </div>
      </FullBleed>

      <FullBleed photo={PHOTOS.landsgemeinde} position="center 65%" daylight>
        <div className="max-w-3xl">
          <div className="kicker">{t("glarus.kicker")}</div>
          <h2 className="headline-caps mt-5 text-4xl sm:text-5xl lg:text-6xl">
            {t("glarus.title")}
          </h2>
          <p className="mt-6 max-w-xl text-lg text-fg-primary">{t("glarus.body")}</p>
          <div className="mt-9">
            <Link href="/governance" className="btn-frame">
              {t("glarus.cta")}
            </Link>
          </div>
        </div>
      </FullBleed>

      <section id="how" className="section-shell py-section">
        <div className="kicker">{t("how.kicker")}</div>
        <h2 className="headline-caps mt-5 max-w-3xl text-4xl sm:text-5xl">{t("how.title")}</h2>
        <ol className="mt-16 grid gap-12 md:grid-cols-3 md:gap-10">
          {(["propose", "decide", "carryOut"] as const).map((step, i) => (
            <li key={step} className="border-t border-strong pt-6">
              <div className="font-mono text-sm text-fg-tertiary">0{i + 1}</div>
              <h3 className="headline-caps mt-4 text-2xl">{t(`how.${step}.title`)}</h3>
              <p className="mt-4 text-base leading-relaxed text-fg-secondary">
                {t(`how.${step}.body`)}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t border-subtle bg-surface-public py-section">
        <div className="section-shell">
          <div className="grid gap-10 lg:grid-cols-5 lg:gap-16">
            <div className="min-w-0 lg:col-span-2">
              <div className="kicker">{t("rules.kicker")}</div>
              <h2 className="headline-caps mt-5 text-4xl sm:text-5xl">{t("rules.title")}</h2>
              <p className="mt-6 text-lg text-fg-secondary">{t("rules.body")}</p>
              <div className="mt-9">
                <Link href="/governance/methods" className="btn-frame">
                  {t("rules.cta")}
                </Link>
              </div>
            </div>
            {/* min-w-0: the lab's table is wider than a phone and scrolls inside
                its own box — without this the grid column grows to fit it and
                the whole page scrolls sideways. */}
            <div className="min-w-0 rounded-surface border border-default bg-surface-base p-5 sm:p-7 lg:col-span-3">
              <MethodLab />
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell py-section">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <div className="kicker">{t("agent.kicker")}</div>
            <h2 className="headline-caps mt-5 text-4xl sm:text-5xl">{t("agent.title")}</h2>
            <p className="mt-6 text-lg text-fg-secondary">{t("agent.body")}</p>
            <p className="mt-6 text-sm text-fg-tertiary">{t("agent.note")}</p>
          </div>
          <ul className="divide-y divide-subtle border-y border-subtle">
            {(["writes", "informs", "money", "explains"] as const).map((duty) => (
              <li key={duty} className="py-6">
                <h3 className="text-lg font-semibold text-fg-primary">
                  {t(`agent.${duty}.title`)}
                </h3>
                <p className="mt-2 text-fg-secondary">{t(`agent.${duty}.body`)}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-subtle py-section">
        <div className="section-shell">
          <div className="kicker">{t("audiences.kicker")}</div>
          <h2 className="headline-caps mt-5 max-w-3xl text-4xl sm:text-5xl">
            {t("audiences.title")}
          </h2>
          <div className="mt-14 grid gap-4 md:grid-cols-2">
            {HOME_AUDIENCES.map((u) => (
              <AudienceTile
                key={u.key}
                title={t(`audiences.${u.key}.title`)}
                body={t(`audiences.${u.key}.body`)}
                photo={u.photo}
                position={u.position}
                href={`/for/${u.slug}`}
                more={t("audiences.more")}
              />
            ))}
          </div>
          <div className="mt-10">
            <Link href="/for" className="btn-frame">
              {t("audiences.all")}
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-subtle bg-surface-public py-section">
        <div className="section-shell">
          <div className="kicker">{t("trust.kicker")}</div>
          <h2 className="headline-caps mt-5 max-w-3xl text-4xl sm:text-5xl">{t("trust.title")}</h2>
          <div className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {(["record", "grows", "money", "proof"] as const).map((p) => (
              <div key={p} className="border-t border-strong pt-6">
                <h3 className="text-lg font-semibold text-fg-primary">{t(`trust.${p}.title`)}</h3>
                <p className="mt-3 text-fg-secondary">{t(`trust.${p}.body`)}</p>
              </div>
            ))}
          </div>
          <div className="mt-14">
            <Link href="/security" className="btn-frame">
              {t("trust.cta")}
            </Link>
          </div>
        </div>
      </section>

      <FullBleed photo={PHOTOS.mountainValley} position="center 60%" daylight>
        <div className="max-w-3xl">
          <div className="kicker">{t("hire.kicker")}</div>
          <h2 className="headline-caps mt-5 text-4xl sm:text-5xl lg:text-6xl">{t("hire.title")}</h2>
          <p className="mt-6 max-w-xl text-lg text-fg-primary">{t("hire.body")}</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href={HIRE_HREF} className="btn-frame-accent">
              {t("hire.talk")}
            </Link>
            <Link href="/orgs/new" className="btn-frame">
              {t("hire.own")}
            </Link>
          </div>
        </div>
      </FullBleed>
    </main>
  );
}

/** The four groups the front page shows; network states and the comparison live on /for. */
const HOME_AUDIENCES = USE_CASES.filter(
  (u): u is UseCase & { key: "companies" | "towns" | "associations" | "communities" } =>
    u.key !== "networkStates",
);

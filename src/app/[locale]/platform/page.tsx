import { use } from "react";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { toLocale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import Deeper from "@/components/site/deeper";
import { ECOSYSTEM_PILLARS } from "@/lib/config/ecosystem";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params) {
  const t = await getTranslations({
    locale: toLocale((await params).locale),
    namespace: "Platform",
  });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

const PRODUCTS = ["solon", "orangecat", "loki"] as const;

/**
 * How Solon, OrangeCat and Loki work as one system, in plain words: three jobs,
 * one story from proposal to receipt, what works today, and — folded — why no
 * product simply obeys another.
 */
export default function PlatformPage({ params }: Params) {
  setRequestLocale(toLocale(use(params).locale));
  const t = useTranslations("Platform");
  const url = (key: string) => ECOSYSTEM_PILLARS.find((p) => p.key === key)?.url;

  return (
    <main>
      <section className="section-shell pb-16 pt-section-tight">
        <div className="kicker">{t("kicker")}</div>
        <h1 className="headline-caps mt-5 max-w-4xl text-5xl sm:text-6xl lg:text-7xl">
          {t("title")}
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-fg-secondary">{t("lede")}</p>
      </section>

      <section className="section-shell grid gap-4 md:grid-cols-3">
        {PRODUCTS.map((p) => (
          <div key={p} className="flex min-h-72 flex-col justify-between border border-default p-8">
            <div>
              <div className="kicker">{t(`${p}.role`)}</div>
              <h2 className="headline-caps mt-4 text-4xl">{t(`${p}.name`)}</h2>
            </div>
            <p className="mt-8 text-fg-secondary">{t(`${p}.body`)}</p>
          </div>
        ))}
      </section>

      <section className="section-shell py-section">
        <div className="grid gap-12 lg:grid-cols-[1fr_2fr] lg:gap-20">
          <div>
            <h2 className="headline-caps text-3xl sm:text-4xl">{t("story.title")}</h2>
            <p className="mt-5 text-lg text-fg-secondary">{t("story.lede")}</p>
          </div>
          <ol className="divide-y divide-subtle border-y border-subtle">
            {(["s1", "s2", "s3", "s4", "s5"] as const).map((s, i) => (
              <li key={s} className="flex gap-6 py-6">
                <span className="font-mono text-sm text-fg-tertiary">0{i + 1}</span>
                <span className="text-fg-primary">{t(`story.${s}`)}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-subtle bg-surface-public py-section">
        <div className="section-shell grid gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <h2 className="headline-caps text-3xl sm:text-4xl">{t("today.title")}</h2>
            <p className="mt-5 text-fg-secondary">{t("today.body")}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/security" className="btn-frame">
                {t("links.security")}
              </Link>
              <Link href="/integration" className="btn-frame">
                {t("links.api")}
              </Link>
            </div>
          </div>
          <div>
            <Deeper
              label={t("deeper.title")}
              technical={{ href: "/integration", label: t("links.api") }}
            >
              <p>{t("deeper.p1")}</p>
              <p>{t("deeper.p2")}</p>
            </Deeper>
            <div className="mt-8 flex flex-wrap gap-6 text-sm">
              <a href={url("orangecat")} className="text-fg-secondary underline underline-offset-4">
                {t("links.orangecat")} ↗
              </a>
              <a href={url("loki")} className="text-fg-secondary underline underline-offset-4">
                {t("links.loki")} ↗
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

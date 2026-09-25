import { use } from "react";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { toLocale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import FullBleed from "@/components/site/full-bleed";
import { PHOTOS } from "@/lib/content/photos";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params) {
  const t = await getTranslations({ locale: toLocale((await params).locale), namespace: "NewEra" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

const SHIFTS = ["records", "money", "work", "connection", "making", "energy"] as const;

/**
 * Why governing yourselves is newly possible — and, as plainly, what technology
 * still cannot do. Each shift states what changed, what it means for a group,
 * and its limit, so the page argues a direction without overselling it.
 */
export default function NewEraPage({ params }: Params) {
  setRequestLocale(toLocale(use(params).locale));
  const t = useTranslations("NewEra");

  return (
    <main>
      <FullBleed photo={PHOTOS.starlinkTownHall} priority under position="center 40%">
        <div className="rise max-w-3xl">
          <div className="kicker">{t("kicker")}</div>
          <h1 className="headline-caps mt-5 text-4xl sm:text-5xl lg:text-6xl">{t("title")}</h1>
          <p className="mt-7 max-w-2xl text-lg text-fg-primary">{t("lede")}</p>
        </div>
      </FullBleed>

      <section className="section-shell py-section">
        <div className="divide-y divide-subtle border-y border-subtle">
          {SHIFTS.map((s, i) => (
            <article
              key={s}
              className="grid gap-6 py-10 lg:grid-cols-[14rem_1fr_1fr_1fr] lg:gap-10"
            >
              <div>
                <div className="font-mono text-sm text-fg-tertiary">0{i + 1}</div>
                <h2 className="headline-caps mt-3 text-3xl">{t(`${s}.title`)}</h2>
              </div>
              <div>
                <div className="kicker">{t("changed")}</div>
                <p className="mt-2 text-fg-primary">{t(`${s}.changed`)}</p>
              </div>
              <div>
                <div className="kicker">{t("means")}</div>
                <p className="mt-2 text-fg-primary">{t(`${s}.means`)}</p>
              </div>
              <div>
                <div className="kicker">{t("limit")}</div>
                <p className="mt-2 text-fg-secondary">{t(`${s}.limit`)}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-subtle bg-surface-public py-section">
        <div className="section-shell grid gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <h2 className="headline-caps text-4xl sm:text-5xl">{t("choose.title")}</h2>
            <p className="mt-6 text-lg text-fg-primary">{t("choose.body")}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/platform" className="btn-frame">
                {t("links.platform")}
              </Link>
              <Link href="/for/network-states" className="btn-frame">
                {t("links.networkStates")}
              </Link>
            </div>
          </div>
          <div>
            <h2 className="headline-caps text-2xl">{t("cannot.title")}</h2>
            <ul className="mt-6 space-y-4">
              {(["c1", "c2", "c3", "c4"] as const).map((c) => (
                <li key={c} className="flex gap-4 text-fg-secondary">
                  <span className="mt-2.5 h-1 w-4 shrink-0 bg-accent" aria-hidden="true" />
                  <span>{t(`cannot.${c}`)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}

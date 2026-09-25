import Image from "next/image";
import { use } from "react";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { toLocale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { PHOTOS } from "@/lib/content/photos";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params) {
  const t = await getTranslations({ locale: toLocale((await params).locale), namespace: "Ideas" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

/**
 * The ideas Solon is built on, each told as a story with its date, what Solon
 * takes from it, and a source — so a curious reader can check every claim.
 * Every fact here was checked against the sources linked (2026-09-25); the
 * notes carry the nuance the sources insist on.
 */
const IDEAS = [
  { key: "solon", source: "https://en.wikipedia.org/wiki/Solon", note: true },
  {
    key: "landsgemeinde",
    source: "https://en.wikipedia.org/wiki/Landsgemeinde",
    story2: true,
    painting: true,
  },
  {
    key: "counting",
    source: "https://en.wikipedia.org/wiki/Arrow%27s_impossibility_theorem",
    note: true,
    link: { href: "/governance/methods", label: "methods" },
  },
  { key: "ostrom", source: "https://en.wikipedia.org/wiki/Elinor_Ostrom", note: true },
  { key: "exit", source: "https://en.wikipedia.org/wiki/Exit,_Voice,_and_Loyalty", note: true },
  { key: "panarchy", source: "https://en.wikipedia.org/wiki/Panarchy_(political_philosophy)" },
  {
    key: "charterCities",
    source: "https://en.wikipedia.org/wiki/Charter_city_(economic_development)",
  },
  {
    key: "networkState",
    source: "https://thenetworkstate.com/the-network-state-in-one-sentence",
    link: { href: "/for/network-states", label: "networkState" },
  },
] as const;

export default function IdeasPage({ params }: Params) {
  setRequestLocale(toLocale(use(params).locale));
  const t = useTranslations("Ideas");
  const alt = useTranslations("Photos");

  return (
    <main>
      <section className="section-shell pb-8 pt-section-tight">
        <div className="kicker">{t("kicker")}</div>
        <h1 className="headline-caps mt-5 max-w-4xl text-5xl sm:text-6xl">{t("title")}</h1>
        <p className="mt-6 max-w-2xl text-lg text-fg-secondary">{t("lede")}</p>
      </section>

      <div className="section-shell">
        {IDEAS.map((idea, i) => (
          <article
            key={idea.key}
            className="grid gap-8 border-t border-strong py-14 lg:grid-cols-[14rem_1fr] lg:gap-16"
          >
            <div>
              <div className="font-mono text-sm text-fg-tertiary">0{i + 1}</div>
              <div className="kicker mt-3">{t(`${idea.key}.era`)}</div>
            </div>
            <div className="max-w-copy">
              <h2 className="headline text-3xl sm:text-4xl">{t(`${idea.key}.title`)}</h2>
              <p className="mt-6 text-lg leading-relaxed text-fg-primary">
                {t(`${idea.key}.story`)}
              </p>
              {"story2" in idea && (
                <p className="mt-5 text-lg leading-relaxed text-fg-primary">
                  {t("landsgemeinde.story2")}
                </p>
              )}
              {"painting" in idea && (
                <figure className="mt-8">
                  <Image
                    src={PHOTOS.landsgemeindePainting.image}
                    alt={alt("landsgemeindePainting")}
                    placeholder="blur"
                    sizes="(min-width: 1024px) 680px, 100vw"
                    className="h-auto w-full"
                  />
                  <figcaption className="mt-3 text-sm text-fg-tertiary">
                    {t("landsgemeinde.caption")}
                  </figcaption>
                </figure>
              )}
              <div className="mt-8 border-l-2 border-accent pl-5">
                <div className="kicker">{t("meaning")}</div>
                <p className="mt-2 text-fg-primary">{t(`${idea.key}.meaning`)}</p>
              </div>
              {"note" in idea && (
                <p className="mt-5 text-sm text-fg-tertiary">{t(`${idea.key}.note`)}</p>
              )}
              <div className="mt-6 flex flex-wrap items-center gap-6 text-sm">
                <a
                  href={idea.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-fg-secondary underline underline-offset-4 hover:text-fg-primary"
                >
                  {t("source")} ↗
                </a>
                {idea.key === "networkState" && (
                  <Link href="/for/network-states" className="btn-frame">
                    {t("networkState.link")}
                  </Link>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      <section className="border-t border-subtle bg-surface-public py-section">
        <div className="section-shell">
          <h2 className="headline-caps max-w-3xl text-4xl sm:text-5xl">{t("closing.title")}</h2>
          <ol className="mt-12 grid gap-8 md:grid-cols-5">
            {(["t1", "t2", "t3", "t4", "t5"] as const).map((k, i) => (
              <li key={k} className="border-t border-strong pt-5">
                <div className="font-mono text-sm text-fg-tertiary">0{i + 1}</div>
                <p className="mt-3 font-semibold text-fg-primary">{t(`closing.${k}`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  );
}

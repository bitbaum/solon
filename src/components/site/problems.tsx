import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { PROBLEM_SCALES, problemHref } from "@/lib/content/problems";
import { HIRE_HREF } from "@/lib/site-config";

/**
 * "What it solves": concrete problems, one person's first, then society's.
 * Each card is the problem, what happens on Solon, and the page where it
 * happens — named by that page's own title. Structure from
 * lib/content/problems.ts; every sentence from messages `Home.problems`.
 */
export default function Problems() {
  const t = useTranslations("Home.problems");
  const site = useTranslations("Site");

  return (
    <section
      id="solves"
      aria-labelledby="solves-title"
      className="border-t border-subtle py-section"
    >
      <div className="section-shell">
        <div className="kicker">{t("kicker")}</div>
        <h2 id="solves-title" className="headline-caps mt-5 max-w-3xl text-4xl sm:text-5xl">
          {t("title")}
        </h2>
        <p className="mt-6 max-w-copy text-lg text-fg-secondary">{t("lede")}</p>
        <p className="mt-4 max-w-copy text-sm text-fg-tertiary">{t("note")}</p>

        {PROBLEM_SCALES.map((scale) => (
          <div key={scale.key} className="mt-14 sm:mt-16">
            <h3 className="headline text-display-3 text-fg-primary">{t(`${scale.key}.title`)}</h3>
            <p className="mt-2 text-fg-secondary">{t(`${scale.key}.lede`)}</p>
            <ul className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {scale.items.map((item) => (
                <li
                  key={item.key}
                  className="flex min-w-0 flex-col rounded-surface border border-default bg-surface-base p-5 sm:p-6"
                >
                  <p className="text-lg font-semibold text-fg-primary">
                    {t(`items.${item.key}.problem`)}
                  </p>
                  <div className="mt-5 text-xs font-bold uppercase tracking-caps text-fg-tertiary">
                    {t("answer")}
                  </div>
                  <p className="mt-2 flex-1 leading-relaxed text-fg-secondary">
                    {t(`items.${item.key}.solution`)}
                  </p>
                  <Link
                    href={problemHref(item.link)}
                    className="mt-4 inline-flex min-h-11 items-center gap-2 self-start text-sm font-semibold text-fg-primary underline-offset-4 hover:underline"
                  >
                    {site(`links.${item.link}`)}
                    <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="mt-14 flex flex-col gap-6 border-t border-strong pt-8 lg:flex-row lg:items-center lg:justify-between">
          <p className="max-w-copy text-lg text-fg-primary">{t("closing.text")}</p>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:whitespace-nowrap">
            <Link href={HIRE_HREF} className="btn-frame-accent">
              {t("closing.talk")}
            </Link>
            <Link href={problemHref("whatYouCanDo")} className="btn-frame">
              {t("closing.all")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

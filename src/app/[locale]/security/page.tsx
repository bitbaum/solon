import { use } from "react";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { toLocale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import PageLayout from "@/components/ui/page-layout";
import { SOLON_GITHUB_URL } from "@/lib/config/ecosystem";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params) {
  const t = await getTranslations({
    locale: toLocale((await params).locale),
    namespace: "Security",
  });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

/** Each guarantee and the detail lines it carries in the messages. */
const GUARANTEES = [
  { key: "money", details: ["money.d1", "money.d2"] },
  { key: "keys", details: ["keys.d1", "keys.d2"] },
  { key: "proof", details: ["proof.d1", "proof.d2", "proof.d3"] },
  { key: "record", details: ["record.d1", "record.d2", "record.d3"] },
] as const;

/**
 * The trust page, stated plainly for someone deciding whether to put their
 * group's decisions here. Every claim maps to code in this repo — nothing
 * aspirational. The strongest claims are what Solon does NOT have: your money,
 * your keys, or a way to rewrite what happened.
 */
export default function SecurityPage({ params }: Params) {
  setRequestLocale(toLocale(use(params).locale));
  const t = useTranslations("Security");

  return (
    <PageLayout kicker={t("kicker")} title={t("title")} description={t("lede")}>
      <div className="grid gap-x-10 gap-y-14 md:grid-cols-2">
        {GUARANTEES.map((g) => (
          <section key={g.key} className="border-t border-strong pt-6">
            <h2 className="text-2xl font-semibold text-fg-primary">{t(`${g.key}.title`)}</h2>
            <p className="mt-3 max-w-xl text-fg-secondary">{t(`${g.key}.body`)}</p>
            <ul className="mt-5 space-y-2 text-sm text-fg-secondary">
              {g.details.map((d) => (
                <li key={d} className="flex gap-3">
                  <span className="mt-2 h-1 w-3 shrink-0 bg-accent" aria-hidden="true" />
                  <span>{t(d)}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="mt-24 border-t border-subtle pt-16">
        <h2 className="headline-caps text-3xl sm:text-4xl">{t("buys.title")}</h2>
        <div className="mt-10 grid gap-10 md:grid-cols-3">
          {(["seize", "forge", "rewrite"] as const).map((o) => (
            <div key={o}>
              <h3 className="text-lg font-semibold text-fg-primary">{t(`buys.${o}.title`)}</h3>
              <p className="mt-2 text-fg-secondary">{t(`buys.${o}.body`)}</p>
            </div>
          ))}
        </div>
        <div className="mt-14 flex flex-col gap-3 sm:flex-row">
          <Link href="/governance/voting" className="btn-frame">
            {t("links.voting")}
          </Link>
          <Link href="/governance/audit" className="btn-frame">
            {t("links.record")}
          </Link>
          <a
            href={SOLON_GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-frame"
          >
            {t("links.source")}
          </a>
        </div>
      </section>
    </PageLayout>
  );
}

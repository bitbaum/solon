import { use } from "react";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { toLocale } from "@/i18n/routing";
import AudienceTile from "@/components/site/audience-tile";
import { USE_CASES } from "@/lib/content/use-cases";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params) {
  const t = await getTranslations({
    locale: toLocale((await params).locale),
    namespace: "UseCases.index",
  });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

const ROWS = ["who", "typical", "count", "money", "law"] as const;

/**
 * For someone working out whether Solon fits their kind of group. First the
 * choice (one tile per group), then the differences side by side — so a reader
 * can see at a glance that the engine is the same and the defaults differ.
 */
export default function UseCasesIndex({ params }: Params) {
  setRequestLocale(toLocale(use(params).locale));
  const t = useTranslations("UseCases");

  return (
    <main>
      <section className="section-shell pb-16 pt-section-tight">
        <div className="kicker">{t("index.kicker")}</div>
        <h1 className="headline-caps mt-5 max-w-4xl text-5xl sm:text-6xl">{t("index.title")}</h1>
        <p className="mt-6 max-w-2xl text-lg text-fg-secondary">{t("index.lede")}</p>
      </section>

      <section className="section-shell grid gap-4 md:grid-cols-2">
        {USE_CASES.map((u) => (
          <AudienceTile
            key={u.key}
            title={t(`${u.key}.kicker`)}
            body={t(`${u.key}.title`)}
            photo={u.photo}
            position={u.position}
            href={`/for/${u.slug}`}
            more={t("index.more")}
          />
        ))}
      </section>

      <section className="section-shell py-section">
        <h2 className="headline-caps text-4xl sm:text-5xl">{t("compare.title")}</h2>
        <p className="mt-5 max-w-2xl text-fg-secondary">{t("compare.lede")}</p>

        {/* Phones get one card per group; wider screens get the table. */}
        <div className="mt-12 space-y-10 lg:hidden">
          {USE_CASES.map((u) => (
            <div key={u.key} className="border-t border-strong pt-6">
              <h3 className="headline-caps text-2xl">{t(`${u.key}.kicker`)}</h3>
              <dl className="mt-4 space-y-3 text-sm">
                {ROWS.map((r) => (
                  <div key={r}>
                    <dt className="kicker">{t(`compare.rows.${r}`)}</dt>
                    <dd className="mt-1 text-fg-secondary">{t(`compare.${u.key}.${r}`)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>

        <div className="mt-12 hidden overflow-x-auto lg:block">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-strong">
                <th className="w-40 py-4 pr-6" />
                {USE_CASES.map((u) => (
                  <th key={u.key} scope="col" className="px-4 py-4 align-bottom">
                    <span className="text-xs font-bold uppercase tracking-caps text-fg-primary">
                      {t(`${u.key}.kicker`)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r} className="border-b border-subtle align-top">
                  <th scope="row" className="py-5 pr-6 kicker">
                    {t(`compare.rows.${r}`)}
                  </th>
                  {USE_CASES.map((u) => (
                    <td key={u.key} className="px-4 py-5 text-fg-secondary">
                      {t(`compare.${u.key}.${r}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

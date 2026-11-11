import { getTranslations, setRequestLocale } from "next-intl/server";
import PageLayout from "@/components/ui/page-layout";
import StatusList from "@/components/site/status-list";
import { Link } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import { DATA_CAPABILITIES, type DataCapabilityKey } from "@/lib/content/capabilities";
import { CAPABILITY_HREF, WHY_SECTIONS, WHY_SOURCES, WORKED_EXAMPLE } from "@/lib/content/why-data";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const locale = toLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Statistics.why" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

/**
 * Why Solon keeps each place's law beside its statistics: the story, with
 * every claim's status read from capabilities.ts or why-data.ts, never from
 * the sentence that makes it.
 */
export default async function WhyPage({ params }: { params: Params }) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Statistics.why" });
  const status = await getTranslations({ locale, namespace: "Status" });
  const label = (s: Parameters<typeof status>[0]) => status(s);
  const capabilityItems = (keys: readonly DataCapabilityKey[]) =>
    keys.map((key) => {
      const href = DATA_CAPABILITIES[key] === "available" ? CAPABILITY_HREF[key] : undefined;
      return {
        key,
        name: t(`items.${key}.name`),
        body: t(`items.${key}.body`),
        status: DATA_CAPABILITIES[key],
        ...(href ? { href } : {}),
      };
    });
  const source = (key: keyof typeof WHY_SOURCES, name: string) => (
    <a
      href={WHY_SOURCES[key].url}
      className="underline underline-offset-4"
      rel="noopener noreferrer"
      target="_blank"
    >
      {name}
    </a>
  );
  const h2 = "headline text-2xl text-fg-primary sm:text-3xl";
  const body = "mt-4 max-w-3xl text-lg text-fg-secondary";
  const small = "mt-3 max-w-3xl text-sm text-fg-tertiary";

  return (
    <PageLayout kicker={t("kicker")} title={t("title")} description={t("intro")}>
      <div className="space-y-16">
        {WHY_SECTIONS.map((section) => (
          <section key={section.key} aria-labelledby={`why-${section.key}`}>
            <h2 id={`why-${section.key}`} className={h2}>
              {t(`${section.key}.title`)}
            </h2>
            <p className={body}>{t(`${section.key}.body`)}</p>
            {section.key === "gaps" && (
              <p className={small}>
                {t.rich("gaps.sources", {
                  denmark: (chunk) => source("denmark", String(chunk)),
                  france: (chunk) => source("france", String(chunk)),
                })}
              </p>
            )}
            <div className="mt-6">
              <StatusList items={capabilityItems(section.capabilities)} statusLabel={label} />
            </div>
          </section>
        ))}

        <section aria-labelledby="why-example">
          <div className="kicker">{t("example.kicker")}</div>
          <h2 id="why-example" className={`${h2} mt-4`}>
            {t("example.title")}
          </h2>
          <p className={body}>{t("example.status")}</p>
          <p className={body}>{t("example.why")}</p>
          <p className={small}>
            {t.rich("example.sources", {
              geostat: (chunk) => source("geostat", String(chunk)),
              ugosstat: (chunk) => source("ugosstat", String(chunk)),
            })}
          </p>
          <div className="mt-6">
            <StatusList
              items={WORKED_EXAMPLE.map((item) => ({
                key: item.key,
                name: t(`example.items.${item.key}.name`),
                body: t(`example.items.${item.key}.body`),
                status: item.status,
                ...("href" in item ? { href: item.href } : {}),
              }))}
              statusLabel={label}
            />
          </div>
          <p className={small}>
            {t.rich("example.note", {
              note: (chunk) => source("researchNote", String(chunk)),
            })}
          </p>
        </section>

        <section aria-labelledby="why-honest">
          <h2 id="why-honest" className={h2}>
            {t("honest.title")}
          </h2>
          <p className={body}>{t("honest.body")}</p>
          <div className="mt-6">
            <StatusList items={capabilityItems(["aiResearch"])} statusLabel={label} />
          </div>
          <p className="mt-4">
            <Link href="/statistics/methods" className="underline underline-offset-4">
              {t("honest.link")}
            </Link>
          </p>
        </section>

        <section aria-labelledby="why-decide" className="border-t border-subtle pt-12">
          <h2 id="why-decide" className={h2}>
            {t("decide.title")}
          </h2>
          <p className={body}>{t("decide.body")}</p>
          <div className="mt-6">
            <StatusList items={capabilityItems(["groupMeasures"])} statusLabel={label} />
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/propose" className="btn-primary min-h-11">
              {t("decide.cta")}
            </Link>
            <Link href="/statistics" className="btn-secondary min-h-11">
              {t("decide.secondary")}
            </Link>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}

import { use } from "react";
import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing, toLocale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import FullBleed from "@/components/site/full-bleed";
import Deeper from "@/components/site/deeper";
import CapabilityList from "@/components/site/capability-list";
import { USE_CASES, findUseCase, type UseCase } from "@/lib/content/use-cases";
import { HIRE_HREF } from "@/lib/site-config";

type Params = { params: Promise<{ locale: string; slug: string }> };

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => USE_CASES.map((u) => ({ locale, slug: u.slug })));
}

export async function generateMetadata({ params }: Params) {
  const { locale, slug } = await params;
  const u = findUseCase(slug);
  if (!u) return {};
  const t = await getTranslations({ locale: toLocale(locale), namespace: "UseCases" });
  return { title: t(`${u.key}.metaTitle`), description: t(`${u.key}.lede`) };
}

/**
 * One kind of group: what goes wrong for them today, how Solon helps, what
 * works now (from the capability registry, never from this page), and the
 * detail folded for whoever wants it. Network states get their own middle —
 * the definition and the path — because their problem is a sequence.
 */
export default function UseCasePage({ params }: Params) {
  const { locale, slug } = use(params);
  setRequestLocale(toLocale(locale));
  const u = findUseCase(slug);
  if (!u) notFound();
  const t = useTranslations("UseCases");

  return (
    <main>
      <FullBleed photo={u.photo} priority under position={u.position}>
        <div className="rise max-w-3xl">
          <div className="kicker">{t(`${u.key}.kicker`)}</div>
          <h1 className="headline-caps mt-5 text-4xl sm:text-5xl lg:text-6xl">
            {t(`${u.key}.title`)}
          </h1>
          <p className="mt-7 max-w-xl text-lg text-fg-primary sm:text-xl">{t(`${u.key}.lede`)}</p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href={HIRE_HREF} className="btn-frame-accent">
              {t("common.cta")}
            </Link>
            <Link href="/orgs/new" className="btn-frame">
              {t("common.ctaOwn")}
            </Link>
          </div>
        </div>
      </FullBleed>

      {u.key === "networkStates" ? <NetworkStateBody /> : <GroupBody u={u} />}

      <section className="section-shell grid gap-12 pb-section lg:grid-cols-2 lg:gap-20">
        <div>
          <h2 className="headline-caps text-3xl sm:text-4xl">{t("common.status")}</h2>
        </div>
        <CapabilityList items={u.capabilities} />
      </section>

      <section className="border-t border-subtle bg-surface-public py-section">
        <div className="section-shell grid gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <h2 className="headline-caps text-3xl sm:text-4xl">{t("common.rules")}</h2>
            <p className="mt-5 text-fg-secondary">{t("common.rulesBody")}</p>
            <Link href="/governance/profiles" className="btn-frame mt-8">
              {t("common.rulesLink")}
            </Link>
          </div>
          <Deeper
            label={t("common.deeper")}
            technical={{ href: "/security", label: t("common.technical") }}
          >
            <p>{t(`${u.key}.deeper.p1`)}</p>
            <p>{t(`${u.key}.deeper.p2`)}</p>
          </Deeper>
        </div>
      </section>
    </main>
  );
}

type GroupKey = Exclude<UseCase["key"], "networkStates">;

function GroupBody({ u }: { u: UseCase }) {
  const t = useTranslations("UseCases");
  const key = u.key as GroupKey;
  return (
    <>
      <section className="section-shell py-section">
        <h2 className="headline-caps text-3xl sm:text-4xl">{t("common.problems")}</h2>
        <div className="mt-12 grid gap-10 md:grid-cols-3">
          {(["p1", "p2", "p3"] as const).map((p) => (
            <div key={p} className="border-t border-strong pt-6">
              <h3 className="text-xl font-semibold text-fg-primary">
                {t(`${key}.problems.${p}.title`)}
              </h3>
              <p className="mt-3 text-fg-secondary">{t(`${key}.problems.${p}.body`)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-subtle bg-surface-public py-section">
        <div className="section-shell">
          <h2 className="headline-caps text-3xl sm:text-4xl">{t("common.how")}</h2>
          <div className="mt-12 grid gap-x-10 gap-y-12 md:grid-cols-2">
            {(["h1", "h2", "h3", "h4"] as const).map((h, i) => (
              <div key={h} className="border-t border-strong pt-6">
                <div className="font-mono text-sm text-fg-tertiary">0{i + 1}</div>
                <h3 className="mt-3 text-2xl font-semibold text-fg-primary">
                  {t(`${key}.how.${h}.title`)}
                </h3>
                <p className="mt-3 max-w-lg text-fg-secondary">{t(`${key}.how.${h}.body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-shell py-section">
        <h2 className="headline-caps text-3xl sm:text-4xl">{t("common.examples")}</h2>
        <ul className="mt-10 grid gap-3 sm:grid-cols-2">
          {(["e1", "e2", "e3", "e4"] as const).map((e) => (
            <li
              key={e}
              className="border border-default px-5 py-4 text-lg font-semibold text-fg-primary"
            >
              {t(`${key}.examples.${e}`)}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function NetworkStateBody() {
  const t = useTranslations("UseCases.networkStates");
  return (
    <>
      <section className="section-shell py-section">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <h2 className="headline-caps text-3xl sm:text-4xl">{t("definition.title")}</h2>
            <p className="mt-6 text-fg-secondary">{t("definition.body")}</p>
            <p className="mt-6 text-sm text-fg-tertiary">{t("definition.stance")}</p>
          </div>
          <figure className="border-l-2 border-accent pl-6">
            <blockquote className="text-2xl font-semibold leading-snug text-fg-primary">
              “{t("definition.quote")}”
            </blockquote>
            <figcaption className="mt-5 text-sm text-fg-secondary">
              — {t("definition.cite")}
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="border-t border-subtle bg-surface-public py-section">
        <div className="section-shell">
          <h2 className="headline-caps text-3xl sm:text-4xl">{t("path.title")}</h2>
          <ol className="mt-12 divide-y divide-subtle border-y border-subtle">
            {(["s1", "s2", "s3", "s4", "s5", "s6", "s7"] as const).map((s, i) => (
              <li key={s} className="grid gap-4 py-7 md:grid-cols-[4rem_1fr_1fr] md:gap-8">
                <div className="font-mono text-sm text-fg-tertiary">0{i + 1}</div>
                <div>
                  <h3 className="text-lg font-semibold text-fg-primary">{t(`path.${s}.step`)}</h3>
                  <p className="mt-2 text-sm text-fg-secondary">{t(`path.${s}.needs`)}</p>
                </div>
                <p className="text-fg-primary">{t(`path.${s}.solon`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}

import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import PageLayout from "@/components/ui/page-layout";
import { localized } from "@/lib/places/place-view";
import type { Methodology } from "@/lib/statistics/methodologies";
import type { StatisticsTranslator } from "./metric-view";

/** /statistics/methods: every index described the same way, and Solon's own beside them. */
export function MethodsIndex({
  methods,
  own,
  locale,
  t,
}: {
  methods: readonly Methodology[];
  own: { key: string; label: string }[];
  locale: Locale;
  t: StatisticsTranslator;
}) {
  return (
    <PageLayout
      title={t("methods.title")}
      kicker={t("methods.kicker")}
      description={t("methods.intro")}
    >
      <div className="max-w-5xl space-y-10">
        <ul className="divide-y divide-default rounded-surface border border-default bg-surface-base">
          {methods.map((m) => (
            <li
              key={m.key}
              className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="min-w-0">
                <span className="block font-medium text-fg-primary">{m.name}</span>
                <span className="block text-sm text-fg-secondary">
                  {m.publisher} · {m.kinds.map((k) => t(`methods.kinds.${k}`)).join(", ")}
                </span>
                <span className="block text-sm text-fg-tertiary">
                  {t("methods.colLicence")}: {t(`methods.verdicts.${m.licence.verdict}`)}
                </span>
                <span className="block text-sm text-fg-tertiary">
                  {localized(m.claims, locale)}
                </span>
              </span>
              <Link
                href={`/statistics/methods/${m.key}`}
                className="btn-secondary min-h-11 shrink-0"
              >
                {t("methods.open")}
              </Link>
            </li>
          ))}
        </ul>
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-fg-primary">{t("methods.ownTitle")}</h2>
          <p className="mb-0 text-sm text-fg-secondary">{t("methods.ownIntro")}</p>
          <ul className="space-y-2">
            {own.map((d) => (
              <li key={d.key}>
                <Link href={`/statistics/dimension/${d.key}`} className="text-fg-primary underline">
                  {d.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </PageLayout>
  );
}

/** One index: what it claims, how it is made, may its data be shown, what to ask of it, where this comes from. */
export function MethodView({
  m,
  questions,
  locale,
  explain,
  t,
}: {
  m: Methodology;
  questions: string[];
  locale: Locale;
  explain: React.ReactNode;
  t: StatisticsTranslator;
}) {
  const card = "space-y-2 rounded-surface border border-default bg-surface-base p-5";
  return (
    <PageLayout
      title={m.name}
      kicker={t("methods.kicker")}
      description={localized(m.claims, locale)}
    >
      <div className="max-w-4xl space-y-8">
        <p className="mb-0 text-sm text-fg-secondary">
          {m.publisher} ·{" "}
          <a href={m.homepage} className="underline" rel="noopener">
            {t("methods.homepage")}
          </a>{" "}
          ·{" "}
          <Link href="/statistics/methods" className="underline">
            {t("methods.back")}
          </Link>
        </p>
        <section className={card}>
          <h2 className="text-lg font-semibold text-fg-primary">{t("methods.about")}</h2>
          <p className="mb-0 text-sm text-fg-secondary">
            {m.kinds.map((k) => t(`methods.kinds.${k}`)).join(" · ")} —{" "}
            {m.layers.map((l) => t(`methods.layers.${l}`)).join(" · ")}
          </p>
          {m.coverage && (
            <p className="mb-0 text-sm text-fg-secondary">
              {t("methods.coverage")}: {localized(m.coverage, locale)}
            </p>
          )}
          <h3 className="pt-2 font-medium text-fg-primary">{t("methods.components")}</h3>
          {m.components.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5 text-sm text-fg-secondary">
              {m.components.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          ) : (
            <p className="mb-0 text-sm text-fg-secondary">{t("methods.noComponents")}</p>
          )}
          {m.draws_on.length > 0 && (
            <p className="mb-0 text-sm text-fg-secondary">
              {t("methods.drawsOn")}: {m.draws_on.join("; ")}
            </p>
          )}
        </section>
        <section className={card}>
          <h2 className="text-lg font-semibold text-fg-primary">{t("methods.licenceTitle")}</h2>
          <p className="mb-0 font-medium text-fg-primary">
            {t(`methods.verdicts.${m.licence.verdict}`)}
          </p>
          <p className="mb-0 text-sm text-fg-secondary">{localized(m.licence.why, locale)}</p>
          <blockquote className="border-l-2 border-default pl-3 text-sm text-fg-secondary wrap-anywhere">
            <span className="block text-xs text-fg-tertiary">{t("methods.terms")}</span>
            {m.licence.terms}
          </blockquote>
        </section>
        <section className={card}>
          <h2 className="text-lg font-semibold text-fg-primary">{t("methods.questionsTitle")}</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-fg-secondary">
            {questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </section>
        {m.unread.length > 0 && (
          <section className={card}>
            <h2 className="text-lg font-semibold text-fg-primary">{t("methods.unreadTitle")}</h2>
            <p className="mb-0 text-sm text-fg-tertiary">{t("methods.unreadIntro")}</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-fg-secondary">
              {m.unread.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
          </section>
        )}
        {explain}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-fg-primary">{t("methods.sources")}</h2>
          <ul className="space-y-2 text-sm text-fg-secondary">
            {m.evidence.map((e) => (
              <li key={e.url} className="wrap-anywhere">
                <a href={e.url} className="underline" rel="noopener">
                  {e.publisher}
                </a>{" "}
                ({e.read}, {e.unchecked ? t("methods.forPeople") : t("methods.checked")})
              </li>
            ))}
          </ul>
        </section>
      </div>
    </PageLayout>
  );
}

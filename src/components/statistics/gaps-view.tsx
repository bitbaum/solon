import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import PageLayout from "@/components/ui/page-layout";
import { DEFAULT_CATEGORY, proposeHref } from "@/lib/domain/proposal-draft";
import { localized } from "@/lib/places/place-view";
import { gapPlaceName } from "@/lib/statistics/gap-places";
import { gapsOf, placeId, topicHref, type Coverage, type Topic } from "@/lib/statistics/gaps";
import type { StatisticsTranslator } from "./shared";

const name = gapPlaceName;

/** /statistics/gaps: the topics where what is measured differs between places. */
export function GapsIndex({
  topics,
  locale,
  t,
}: {
  topics: readonly Topic[];
  locale: Locale;
  t: StatisticsTranslator;
}) {
  return (
    <PageLayout title={t("gaps.title")} kicker={t("gaps.kicker")} description={t("gaps.intro")}>
      <ul className="max-w-4xl divide-y divide-default rounded-surface border border-default bg-surface-base">
        {topics.map((topic) => (
          <li
            key={topic.key}
            className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="min-w-0">
              <span className="block font-medium text-fg-primary">
                {localized(topic.label, locale)}
              </span>
              <span className="block text-sm text-fg-secondary">
                {localized(topic.question, locale)}
              </span>
            </span>
            <Link href={topicHref(topic.key)} className="btn-secondary min-h-11 shrink-0">
              {t("gaps.open")}
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-6 max-w-3xl text-sm text-fg-secondary">
        {t("gaps.soFar", { count: topics.length })}
      </p>
      <p className="mt-2 text-sm">
        <Link href="/statistics/why" className="text-fg-primary underline">
          {t("gaps.why")}
        </Link>
      </p>
    </PageLayout>
  );
}

/**
 * One topic: the question and what answering it is for, what each place
 * publishes (and what has not been read), where the gaps are and what would
 * have to come with a breakdown, the objections with their safeguards, and who
 * decides. It describes places and proposes; it never characterises an office.
 */
export function GapsTopic({
  topic,
  coverage,
  solonPlaces,
  locale,
  selfUrl,
  explain,
  t,
}: {
  topic: Topic;
  coverage: readonly Coverage[];
  /** Places Solon models, shown as "not read" when no line covers them. */
  solonPlaces: readonly string[];
  locale: Locale;
  selfUrl: string;
  explain: React.ReactNode;
  t: StatisticsTranslator;
}) {
  const here = coverage.filter((c) => c.topic === topic.key);
  const places = [...new Set([...here.map((c) => placeId(c.place)), ...solonPlaces])].sort((a, b) =>
    name(a, locale).localeCompare(name(b, locale), locale),
  );
  const cell = (place: string, variant: string) =>
    here.find((c) => placeId(c.place) === place && c.variant === variant);
  const gaps = gapsOf(topic.key, coverage);
  const card = "space-y-3 rounded-surface border border-default bg-surface-base p-5";
  return (
    <PageLayout
      title={localized(topic.label, locale)}
      kicker={t("gaps.kicker")}
      description={localized(topic.question, locale)}
    >
      <div className="max-w-5xl space-y-10">
        <p className="mb-0 text-sm text-fg-secondary">
          {t("gaps.stance")}{" "}
          <Link href="/statistics/gaps" className="underline">
            {t("gaps.back")}
          </Link>
        </p>

        <section className={card}>
          <h2 className="text-xl font-semibold text-fg-primary">{t("gaps.purposesTitle")}</h2>
          <ul className="list-disc space-y-2 pl-5 text-fg-secondary">
            {topic.purposes.map((p, i) => (
              <li key={i}>{localized(p, locale)}</li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-fg-primary">{t("gaps.matrixTitle")}</h2>
          <p className="mb-0 text-sm text-fg-secondary">{t("gaps.matrixIntro")}</p>
          <div className="overflow-x-auto rounded-surface border border-default">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <caption className="sr-only">{t("gaps.matrixTitle")}</caption>
              <thead className="bg-surface-raised text-fg-primary">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    {t("gaps.colPlace")}
                  </th>
                  {topic.variants.map((v) => (
                    <th key={v.key} scope="col" className="px-4 py-3 font-medium">
                      {localized(v.label, locale)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-default">
                {places.map((place) => (
                  <tr key={place}>
                    <th scope="row" className="px-4 py-3 font-medium text-fg-primary">
                      {name(place, locale)}
                    </th>
                    {topic.variants.map((v) => {
                      const c = cell(place, v.key);
                      return (
                        <td key={v.key} className="px-4 py-3 align-top text-fg-secondary">
                          {c ? (
                            <>
                              <span className="font-medium text-fg-primary">
                                {t(`gaps.status.${c.status}`)}
                              </span>
                              {c.crossings.length > 0 && (
                                <span className="block text-xs text-fg-tertiary">
                                  {t("gaps.crossedWith")}{" "}
                                  {c.crossings.map((x) => t(`gaps.crossing.${x}`)).join(", ")}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-fg-tertiary">{t("gaps.notRead")}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-fg-primary">{t("gaps.detailsTitle")}</h2>
          <ul className="space-y-4">
            {here.map((c) => (
              <li key={`${placeId(c.place)}-${c.variant}`} className={card}>
                <h3 className="font-medium text-fg-primary">
                  {name(placeId(c.place), locale)} ·{" "}
                  {localized(topic.variants.find((v) => v.key === c.variant)!.label, locale)}
                </h3>
                <p className="mb-0 text-sm text-fg-secondary">{c.publisher}</p>
                <p className="mb-0 text-fg-secondary">{localized(c.summary, locale)}</p>
                {c.frame && (
                  <p className="mb-0 rounded-surface border border-default bg-surface-raised p-3 text-sm text-fg-secondary wrap-anywhere">
                    <span className="font-semibold text-fg-primary">{t("gaps.frame")}</span>{" "}
                    {localized(c.frame, locale)}
                  </p>
                )}
                {c.unread.length > 0 && (
                  <div className="text-sm text-fg-tertiary">
                    <span className="font-medium">{t("gaps.unread")}</span>
                    <ul className="list-disc pl-5">
                      {c.unread.map((u) => (
                        <li key={u}>{u}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="mb-0 text-xs text-fg-tertiary">
                  {c.evidence.map((e, i) => (
                    <span key={e.url}>
                      {i > 0 && " · "}
                      <a href={e.url} className="underline" rel="noopener">
                        {e.publisher}
                      </a>{" "}
                      ({e.read}, {e.unchecked ? t("gaps.byPerson") : t("gaps.byProgram")})
                    </span>
                  ))}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {gaps.length > 0 && (
          <section className={card}>
            <h2 className="text-xl font-semibold text-fg-primary">{t("gaps.gapsTitle")}</h2>
            <ul className="list-disc space-y-2 pl-5 text-fg-secondary">
              {gaps.map((g) => (
                <li key={`${g.place}-${g.variant}`}>
                  {t("gaps.gapLine", {
                    place: name(g.place, locale),
                    status: t(`gaps.status.${g.status}`),
                    variant: localized(
                      topic.variants.find((v) => v.key === g.variant)!.label,
                      locale,
                    ),
                    others: g.publishedElsewhere.map((p) => name(p, locale)).join(", "),
                  })}
                </li>
              ))}
            </ul>
            <p className="mb-0 text-sm text-fg-tertiary">{t("gaps.gapNote")}</p>
          </section>
        )}

        <section className={card}>
          <h2 className="text-xl font-semibold text-fg-primary">{t("gaps.companionsTitle")}</h2>
          <p className="mb-0 text-sm text-fg-secondary">{t("gaps.companionsIntro")}</p>
          <ul className="list-disc space-y-1 pl-5 text-fg-secondary">
            {topic.companions.map((c, i) => (
              <li key={i}>{localized(c, locale)}</li>
            ))}
          </ul>
          <h3 className="pt-2 font-medium text-fg-primary">{t("gaps.cautionsTitle")}</h3>
          <ul className="list-disc space-y-2 pl-5 text-fg-secondary">
            {topic.cautions.map((c, i) => (
              <li key={i}>{localized(c, locale)}</li>
            ))}
          </ul>
        </section>

        <section className={card}>
          <h2 className="text-xl font-semibold text-fg-primary">{t("gaps.risksTitle")}</h2>
          <p className="mb-0 text-sm text-fg-secondary">{t("gaps.risksIntro")}</p>
          <ul className="space-y-3">
            {topic.risks.map((r, i) => (
              <li key={i} className="space-y-1">
                <p className="mb-0 text-fg-secondary">
                  <span className="font-medium text-fg-primary">{t("gaps.risk")}</span>{" "}
                  {localized(r.risk, locale)}
                </p>
                <p className="mb-0 text-fg-secondary">
                  <span className="font-medium text-fg-primary">{t("gaps.safeguard")}</span>{" "}
                  {localized(r.safeguard, locale)}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className={card}>
          <h2 className="text-xl font-semibold text-fg-primary">{t("gaps.decidesTitle")}</h2>
          <p className="mb-0 text-fg-secondary">{t("gaps.decides")}</p>
          <Link
            href={proposeHref({
              category: DEFAULT_CATEGORY,
              title: t("gaps.proposeTitle", { topic: localized(topic.label, locale) }),
              body: t("gaps.proposeBody", { url: selfUrl }),
            })}
            className="btn-secondary min-h-11 self-start"
          >
            {t("gaps.propose")}
          </Link>
        </section>

        {explain}
      </div>
    </PageLayout>
  );
}

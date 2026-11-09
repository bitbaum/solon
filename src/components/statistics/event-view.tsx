import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import PageLayout from "@/components/ui/page-layout";
import { DEFAULT_CATEGORY, proposeHref } from "@/lib/domain/proposal-draft";
import { localized } from "@/lib/places/place-view";
import type { EventChart } from "@/lib/statistics/event-page";
import type { EventRow } from "@/lib/statistics/read";
import { eventPath } from "@/lib/statistics/present";
import { ActorList, NumbersAround, Sources, VoteCard } from "./event-parts";
import { formatDay, type StatisticsTranslator } from "./metric-view";

interface EventViewProps {
  event: EventRow;
  charts: EventChart[];
  act: { actId: string | null; title: string | null; versions: string[] } | null;
  related: EventRow[];
  pivot: number;
  locale: Locale;
  selfUrl: string;
  t: StatisticsTranslator;
}

const card = "space-y-3 rounded-surface border border-default bg-surface-base p-5";

/** The distinct pages an event rests on, once each, in the order they first appear. */
function allSources(body: EventRow["body"]) {
  const seen = new Map<string, { publisher: string; url: string; read: string }>();
  const add = (list: readonly { publisher: string; url: string; read: string }[]) => {
    for (const e of list) if (!seen.has(e.url)) seen.set(e.url, e);
  };
  add(body.evidence);
  if (body.change) {
    if (body.change.before) add(body.change.before.evidence);
    add(body.change.after.evidence);
  }
  for (const x of [...body.process, ...body.votes, ...body.actors, ...body.reported]) {
    add(x.evidence);
  }
  return [...seen.values()];
}

/**
 * One law event (/statistics/event/<slug>): what changed in the law in its own
 * words, how it came about step by step, how each body voted, who stood where,
 * what was reported about it (claims and critiques kept apart from facts), and
 * what the numbers did around it. Every line carries the page it was read on.
 */
export default function EventView({
  event,
  charts,
  act,
  related,
  pivot,
  locale,
  selfUrl,
  t,
}: EventViewProps) {
  const { body } = event;
  const title = localized(body.title, locale);
  const provisionAt = body.change?.provision.match(/^(art_\d+\w*|para\d+)$/)?.[0];
  const where = body.scope
    ? `${localized(body.scope, locale)} · ${event.placeName}`
    : event.placeName;
  return (
    <PageLayout
      title={title}
      kicker={`${t("event.kicker")} · ${t(`event.categories.${body.category}`)}`}
    >
      <div className="max-w-5xl space-y-12">
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-fg-tertiary">{t("event.facts.place")}</dt>
            <dd className="mb-0 font-medium text-fg-primary">{where}</dd>
          </div>
          <div>
            <dt className="text-sm text-fg-tertiary">{t("event.facts.decided")}</dt>
            <dd className="mb-0 font-medium text-fg-primary">{formatDay(body.on, locale)}</dd>
          </div>
          <div>
            <dt className="text-sm text-fg-tertiary">{t("event.facts.effective")}</dt>
            <dd className="mb-0 font-medium text-fg-primary">
              {body.effective ? formatDay(body.effective, locale) : t("event.facts.noneEffective")}
            </dd>
          </div>
        </dl>
        <p className="mb-0 text-sm text-fg-tertiary">{t("event.englishOnly")}</p>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-fg-primary">{t("event.summaryTitle")}</h2>
          <p className="mb-0 max-w-3xl text-lg text-fg-secondary">
            {localized(body.summary, locale)}
          </p>
        </section>

        {body.change && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-fg-primary">{t("event.changeTitle")}</h2>
            <p className="mb-0 text-fg-secondary">
              {t("event.changeLaw", {
                law: localized(body.change.law, locale),
                provision: body.change.provision,
              })}
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {(["before", "after"] as const).map((side) => {
                const w = body.change![side];
                return (
                  <div key={side} className={card}>
                    <h3 className="text-base font-semibold text-fg-primary">
                      {t(`event.${side}`)}
                    </h3>
                    {w ? (
                      <>
                        <blockquote
                          lang={w.lang}
                          className="mb-0 whitespace-pre-line border-l-2 border-default pl-4 text-fg-primary"
                        >
                          {w.text}
                        </blockquote>
                        {w.translation && (
                          <p className="mb-0 text-sm text-fg-secondary">
                            <span className="text-fg-tertiary">{t("event.translationLabel")} </span>
                            {localized(w.translation, locale)}
                          </p>
                        )}
                        <Sources evidence={w.evidence} t={t} />
                      </>
                    ) : (
                      <p className="mb-0 text-sm text-fg-secondary">{t("event.beforeUnknown")}</p>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {act?.actId ? (
                <>
                  <Link
                    href={
                      provisionAt
                        ? `/law/${act.actId}?at=${provisionAt}#${provisionAt}`
                        : `/law/${act.actId}`
                    }
                    className="btn-secondary min-h-11"
                  >
                    {t("event.readLaw")}
                  </Link>
                  <Link
                    href={
                      provisionAt
                        ? `/law/${act.actId}/amend?at=${provisionAt}`
                        : `/law/${act.actId}/amend`
                    }
                    className="btn-secondary min-h-11"
                  >
                    {t("event.proposeChange")}
                  </Link>
                </>
              ) : (
                <p className="mb-0 text-sm text-fg-secondary">{t("event.notInRegister")}</p>
              )}
            </div>
          </section>
        )}

        {body.process.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-fg-primary">{t("event.processTitle")}</h2>
            <ol className="space-y-3 border-l border-default pl-5">
              {body.process.map((step) => (
                <li
                  key={`${step.on}-${localized(step.step, "en").slice(0, 24)}`}
                  className="space-y-1"
                >
                  <p className="mb-0 text-sm text-fg-tertiary">{formatDay(step.on, locale)}</p>
                  <p className="mb-0 text-fg-primary">{localized(step.step, locale)}</p>
                  <Sources evidence={step.evidence} t={t} />
                </li>
              ))}
            </ol>
          </section>
        )}

        {body.votes.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-fg-primary">{t("event.votesTitle")}</h2>
            <div className="grid gap-4">
              {body.votes.map((v) => (
                <VoteCard
                  key={`${localized(v.body, "en")}-${v.on ?? "undated"}`}
                  vote={v}
                  locale={locale}
                  t={t}
                />
              ))}
            </div>
          </section>
        )}

        {body.actors.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-fg-primary">{t("event.actorsTitle")}</h2>
            <ActorList actors={body.actors} locale={locale} t={t} />
          </section>
        )}

        <section className="space-y-5">
          <h2 className="text-xl font-semibold text-fg-primary">{t("event.numbersTitle")}</h2>
          {charts.length > 0 ? (
            charts.map((c) => (
              <NumbersAround
                key={c.metric.key}
                chart={c}
                placeCode={event.placeCode}
                pivot={pivot}
                locale={locale}
                t={t}
              />
            ))
          ) : (
            <p className="mb-0 rounded-surface border border-default bg-surface-base p-5 text-fg-secondary">
              {t("event.noNumbers")}
            </p>
          )}
        </section>

        {body.reported.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-fg-primary">{t("event.reportedTitle")}</h2>
            <p className="mb-0 text-sm text-fg-secondary">{t("event.reportedIntro")}</p>
            <ul className="space-y-3">
              {body.reported.map((r) => (
                <li
                  key={`${r.kind}-${r.by}-${localized(r.statement, "en").slice(0, 24)}`}
                  className={card}
                >
                  <p className="mb-0 text-sm text-fg-tertiary">
                    <span className="font-semibold uppercase tracking-wide">
                      {t(`event.reportedKinds.${r.kind}`)}
                    </span>{" "}
                    · {r.by}
                  </p>
                  <p className="mb-0 text-fg-primary">{localized(r.statement, locale)}</p>
                  <Sources evidence={r.evidence} t={t} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {body.caveat && (
          <section className="space-y-2 rounded-surface border border-default bg-surface-raised p-5">
            <h2 className="text-lg font-semibold text-fg-primary">{t("event.caveatTitle")}</h2>
            <p className="mb-0 text-fg-secondary">{localized(body.caveat, locale)}</p>
          </section>
        )}

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-fg-primary">{t("event.sourcesTitle")}</h2>
          <ul className="space-y-1 text-sm">
            {allSources(body).map((e) => (
              <li key={e.url} className="text-fg-secondary wrap-anywhere">
                <a href={e.url} className="underline" rel="noopener">
                  {e.publisher}
                </a>{" "}
                <span className="text-fg-tertiary">({t("event.read", { date: e.read })})</span>
              </li>
            ))}
          </ul>
        </section>

        {related.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-fg-primary">{t("event.related")}</h2>
            <ul className="divide-y divide-default rounded-surface border border-default bg-surface-base">
              {related.map((r) => (
                <li key={r.recordKey} className="flex items-center justify-between gap-4 px-5 py-3">
                  <span className="min-w-0">
                    <span className="block text-sm text-fg-tertiary">
                      {r.placeName} · {formatDay(r.body.on, locale)}
                    </span>
                    <span className="block text-fg-primary">{localized(r.body.title, locale)}</span>
                  </span>
                  <Link href={eventPath(r.body.slug)} className="btn-secondary min-h-11 shrink-0">
                    {t("metric.eventOpen")}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="flex flex-wrap gap-3">
          <Link
            href={proposeHref({
              category: DEFAULT_CATEGORY,
              title: t("event.proposeTitle", { title }),
              body: t("event.proposeBody", { url: selfUrl }),
            })}
            className="btn-primary min-h-11"
          >
            {t("event.propose")}
          </Link>
          <Link
            href={proposeHref({
              category: DEFAULT_CATEGORY,
              title: t("event.suggestTitle", { title }),
              body: t("event.suggestBody", { url: selfUrl }),
            })}
            className="btn-secondary min-h-11"
          >
            {t("event.suggest")}
          </Link>
          <Link href="/statistics/events" className="btn-secondary min-h-11">
            {t("event.allEvents")}
          </Link>
        </div>
      </div>
    </PageLayout>
  );
}

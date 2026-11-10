import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { DEFAULT_CATEGORY, proposeHref } from "@/lib/domain/proposal-draft";
import { cite } from "@/lib/i18n/config-catalog";
import { localized } from "@/lib/places/place-view";
import { pointOf, type Rubric } from "@/lib/statistics/assessments";
import type { AssessmentRow } from "@/lib/statistics/read";
import { Sources } from "./event-parts";
import type { StatisticsTranslator } from "./shared";

/** The pages a coding rests on, as links: Solon's own law page where it holds the act, else the publisher's. */
function ProvisionLinks({ row }: { row: AssessmentRow }) {
  return (
    <ul className="mb-0 flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {row.provisions.map((p) => (
        <li key={p.label}>
          {p.actId ? (
            <Link
              href={
                p.provision
                  ? `/law/${p.actId}?at=${encodeURIComponent(p.provision)}#${p.provision}`
                  : `/law/${p.actId}`
              }
              className="underline"
            >
              {p.label}
            </Link>
          ) : (
            <span className="text-fg-secondary">{p.label}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * Features coded from the law, for a dimension: the rubric (the question, every
 * point of the scale with its definition, the edge cases decided), then each
 * place's coding with what it was read from (articles, the words), how sure the
 * reader is and why, what the reading leaves open, who coded it and whether a
 * second person has checked it. A coding no second person has checked says so.
 */
export default function AssessmentSection({
  coded,
  selfUrl,
  locale,
  t,
}: {
  coded: { rubric: Rubric; rows: AssessmentRow[] }[];
  selfUrl: string;
  locale: Locale;
  t: StatisticsTranslator;
}) {
  if (coded.length === 0) return null;
  return (
    <section className="space-y-8">
      <h2 className="text-xl font-semibold text-fg-primary">{t("coded.title")}</h2>
      <p className="mb-0 max-w-3xl text-sm text-fg-secondary">{t("coded.intro")}</p>
      {coded.map(({ rubric, rows }) => (
        <div key={rubric.key} className="space-y-4">
          <div className="space-y-3 rounded-surface border border-default bg-surface-raised p-5">
            <h3 className="text-lg font-semibold text-fg-primary">
              {localized(rubric.label, locale)}
            </h3>
            <p className="mb-0 text-fg-primary">{localized(rubric.question, locale)}</p>
            <ol className="mb-0 space-y-2 text-sm text-fg-secondary">
              {rubric.scale.map((p) => (
                <li key={p.value}>
                  <span className="font-semibold text-fg-primary">
                    {p.value} · {localized(p.label, locale)}
                  </span>
                  : {localized(p.definition, locale)}
                </li>
              ))}
            </ol>
            {rubric.edgeCases.length > 0 && (
              <details className="text-sm text-fg-secondary">
                <summary className="cursor-pointer">{t("coded.edgeCases")}</summary>
                <ul className="mt-2 space-y-1">
                  {rubric.edgeCases.map((e) => (
                    <li key={localized(e, "en").slice(0, 30)}>{localized(e, locale)}</li>
                  ))}
                </ul>
              </details>
            )}
            <p className="mb-0 text-xs text-fg-tertiary">
              {t("coded.rubricAuthor", {
                version: rubric.version,
                author: cite(rubric.author, locale),
              })}
            </p>
          </div>

          {rows.length === 0 ? (
            <p className="mb-0 text-fg-secondary">{t("coded.none")}</p>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {rows.map((row) => {
                const point = pointOf(rubric, row.body.value);
                const title = `${row.placeName}: ${localized(rubric.label, locale)}`;
                return (
                  <li
                    key={row.recordKey}
                    className="min-w-0 space-y-3 rounded-surface border border-default bg-surface-base p-5"
                  >
                    <div className="space-y-1">
                      <p className="mb-0 text-sm text-fg-tertiary">{row.placeName}</p>
                      <p className="mb-0 text-xl font-semibold text-fg-primary">
                        {row.body.value} · {point ? localized(point.label, locale) : ""}
                      </p>
                    </div>
                    <p className="mb-0 text-fg-secondary">{localized(row.body.reading, locale)}</p>
                    <p className="mb-0 text-sm">
                      <span className="font-semibold text-fg-primary">
                        {t(`coded.confidence.${row.body.confidence}`)}
                      </span>{" "}
                      <span className="text-fg-secondary">
                        {localized(row.body.confidenceNote, locale)}
                      </span>
                    </p>
                    <p
                      className={`mb-0 rounded-surface border border-default px-3 py-2 text-sm ${
                        row.status === "settled"
                          ? "bg-surface-raised text-fg-primary"
                          : "text-fg-secondary"
                      }`}
                    >
                      {row.status === "settled"
                        ? t("coded.settled", { by: row.body.reviewedBy.join(", ") })
                        : t("coded.awaiting")}
                    </p>
                    <ProvisionLinks row={row} />
                    {row.body.quotes.map((q) => (
                      <figure key={q.text.slice(0, 40)} className="space-y-1">
                        <blockquote
                          lang={q.lang}
                          className="mb-0 whitespace-pre-line border-l-2 border-default pl-3 text-sm text-fg-primary"
                        >
                          {q.text}
                        </blockquote>
                        {q.translation && (
                          <p className="mb-0 text-xs text-fg-secondary">
                            <span className="text-fg-tertiary">{t("event.translationLabel")} </span>
                            {localized(q.translation, locale)}
                          </p>
                        )}
                        <Sources evidence={q.evidence} t={t} />
                      </figure>
                    ))}
                    {row.body.open && (
                      <p className="mb-0 text-sm text-fg-secondary">
                        <span className="font-semibold text-fg-primary">{t("coded.open")}</span>{" "}
                        {localized(row.body.open, locale)}
                      </p>
                    )}
                    <p className="mb-0 text-xs text-fg-tertiary">
                      {t("coded.codedBy", { by: row.body.codedBy, from: row.body.validFrom })}
                    </p>
                    {row.status !== "settled" && (
                      <Link
                        href={proposeHref({
                          category: DEFAULT_CATEGORY,
                          title: t("coded.reviewTitle", { title }),
                          body: t("coded.reviewBody", { url: selfUrl, key: row.recordKey }),
                        })}
                        className="btn-secondary min-h-11"
                      >
                        {t("coded.review")}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ))}
    </section>
  );
}

import { Link } from "@/i18n/navigation";
import PageLayout from "@/components/ui/page-layout";
import type { ActKind } from "@/lib/config/law";
import { routesFor } from "@/lib/config/law/routes";
import { formatDay } from "@/lib/format-date";
import type { Locale } from "@/i18n/routing";
import { archiveCopyOf } from "@/lib/law/archive-copy";
import { authorityOf } from "@/lib/law/places";
import type { ActTranslation } from "@/lib/law/act-translation";
import { PROVISIONS_PER_PAGE, type ActView } from "@/lib/law/view";
import type { LawTranslator } from "./coverage-report";
import type { AmendmentSummary } from "@/lib/law/amend/store";
import AmendmentList from "./amendment-list";
import OfficialRoutes from "./official-routes";
import PlaceTrail from "./place-trail";
import TranslationLoader from "./translation-loader";
import { statusLabel } from "./status-label";
import { authorityName, readerAuthorityNames } from "@/lib/law/authority-names";

interface ActViewProps {
  act: ActView;
  page: number;
  /** Every provision's anchor and heading, so a reader can jump anywhere in the act. */
  contents: { path: string; heading: string }[];
  t: LawTranslator;
  /** Proposed changes to this act, newest first. */
  amendments: AmendmentSummary[];
  /** The words for proposing a change (messages `Amend.act`). */
  amendLabels: { propose: string; proposals: string; noProposals: string };
  /** The reader's language: the dates and the official routes are written in it. */
  locale: Locale;
  /** The page in the reader's language, when the authentic text is in another. */
  translation: ActTranslation | null;
  /** The reader asked for the authentic words instead of the translation. */
  original: boolean;
}

const cardClass = "rounded-surface border border-default bg-surface-base p-6";

/**
 * An act as Solon holds it: what the publisher calls it, where it publishes it,
 * and the provisions of the version in force, with the page they were read from
 * and the hash that proves the copy. A version dated only by the day it was
 * read says so, rather than claiming a day it took effect.
 */
export default async function ActViewPage({
  act,
  page,
  contents,
  t,
  amendments,
  amendLabels,
  locale,
  translation,
  original,
}: ActViewProps) {
  // The reader's language unless they asked for the original: the translation where Solon holds it.
  const shown = translation && !original ? translation : null;
  const title = shown?.title ?? act.title;
  const provisions = shown?.provisions ?? act.provisions;
  const language = (code: string) =>
    new Intl.DisplayNames([locale], { type: "language" }).of(code) ?? code;
  const here = `/law/${act.id}?page=${page}`;
  const names = await readerAuthorityNames();
  const { version } = act;
  const day = (iso: string) => formatDay(iso, locale);
  // A text read from the Internet Archive's copy says so, and when the copy was captured.
  const archived = archiveCopyOf(version?.sourceUrl);
  const pages = version ? Math.max(1, Math.ceil(version.provisionCount / PROVISIONS_PER_PAGE)) : 1;
  const meta = [
    authorityName(names, act.authority),
    act.systematicNumber,
    t(`kinds.${act.kind}` as `kinds.${ActKind}`),
    statusLabel(act, t),
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <PageLayout title={title ?? act.systematicNumber ?? act.id} kicker={t("act.kicker")}>
      <div className="max-w-3xl space-y-8">
        <PlaceTrail authority={act.authority} t={t} />
        <p className="text-fg-secondary">{meta}</p>
        {translation && (
          <div className={`${cardClass} space-y-2 text-sm`}>
            <p className="mb-0 text-fg-secondary">
              {original
                ? t("act.originalNote", { from: language(translation.from) })
                : t("act.translatedNote", {
                    to: language(translation.lang),
                    from: language(translation.from),
                  })}
            </p>
            <Link
              href={original ? here : `${here}&original=1`}
              className="inline-block font-medium text-fg-primary underline"
            >
              {original
                ? t("act.showTranslation", { to: language(translation.lang) })
                : t("act.showOriginal", { from: language(translation.from) })}
            </Link>
            {!original && !translation.complete && (
              <TranslationLoader
                act={act.id}
                page={page}
                to={translation.lang}
                labels={{ translating: t("act.translating"), failed: t("act.translationFailed") }}
              />
            )}
          </div>
        )}
        {act.titleDerived ? (
          <p className="text-sm text-fg-tertiary">{t("act.titleDerived")}</p>
        ) : null}
        <p className="space-x-4 text-sm">
          <Link href="/law/ask" className="font-medium text-fg-primary underline">
            {t("act.askAbout")}
          </Link>
          <Link href={`/law/place/${act.authority}`} className="text-fg-secondary underline">
            {t("act.morePlace", { place: authorityName(names, act.authority) })}
          </Link>
          <a href={`/api/v1/law/acts/${act.id}?format=md`} className="text-fg-secondary underline">
            {t("act.asMarkdown")}
          </a>
        </p>

        <div className={`${cardClass} space-y-2 text-sm`}>
          {act.officialUrl && (
            <p>
              <a
                href={act.officialUrl}
                className="font-medium text-fg-primary underline"
                rel="noopener"
              >
                {t("act.atPublisher")}
              </a>
            </p>
          )}
          {version ? (
            <>
              <p className="text-fg-secondary">
                {version.dateBasis === "publisher"
                  ? t("act.inForceSince", { date: day(version.inForceFrom) })
                  : t("act.readOn", { date: day(version.inForceFrom) })}
              </p>
              {archived ? (
                <p className="text-fg-secondary">
                  {t("act.copyArchived", {
                    date: day(version.retrievedOn),
                    captured: day(archived.capturedOn),
                  })}{" "}
                  <a href={archived.url} className="underline" rel="noopener">
                    {t("act.copyArchivedFrom")}
                  </a>
                </p>
              ) : (
                <p className="text-fg-secondary">
                  {t("act.copy", { date: day(version.retrievedOn) })}{" "}
                  {version.sourceUrl && (
                    <a href={version.sourceUrl} className="underline" rel="noopener">
                      {t("act.copyFrom")}
                    </a>
                  )}
                </p>
              )}
              {/* The notice the publisher's terms of reuse ask for, as they word it. */}
              {authorityOf(act.authority)?.attribution && (
                <p className="text-fg-secondary">{authorityOf(act.authority)!.attribution}</p>
              )}
              <p className="break-all font-mono text-xs text-fg-tertiary">
                sha256 {version.contentSha256}
              </p>
            </>
          ) : (
            <p className="text-fg-secondary">{t("act.noText")}</p>
          )}
        </div>

        {contents.length > 1 && (
          <details className={cardClass}>
            <summary className="cursor-pointer font-medium text-fg-primary">
              {t("act.contents", { count: contents.length })}
            </summary>
            <ol className="mt-4 space-y-2 text-sm">
              {contents.map((entry) => (
                <li key={entry.path}>
                  <Link
                    href={`/law/${act.id}?at=${encodeURIComponent(entry.path)}#${entry.path}`}
                    className="text-fg-secondary underline"
                  >
                    {entry.heading || entry.path}
                  </Link>
                </li>
              ))}
            </ol>
          </details>
        )}

        {version && (
          <section className="space-y-4" aria-labelledby="proposals">
            <h2 id="proposals" className="font-semibold text-fg-primary">
              {amendLabels.proposals}
            </h2>
            <AmendmentList
              amendments={amendments}
              showAct={false}
              empty={amendLabels.noProposals}
            />
          </section>
        )}

        {version && <OfficialRoutes routes={routesFor(act.authority, act.kind)} locale={locale} />}

        {version && (
          <section className="space-y-6" aria-label={t("act.provisions")}>
            <h2 className="font-semibold text-fg-primary">
              {t("act.provisionCount", { count: version.provisionCount })}
            </h2>
            {provisions.map((provision) => (
              <article key={provision.path} id={provision.path} className="space-y-2">
                <h3 className="font-medium text-fg-primary">{provision.heading}</h3>
                <p className="whitespace-pre-line text-fg-secondary">{provision.text}</p>
                <Link
                  href={`/law/${act.id}/amend?at=${encodeURIComponent(provision.path)}`}
                  className="inline-flex min-h-11 items-center text-sm text-fg-secondary underline"
                >
                  {amendLabels.propose}
                </Link>
              </article>
            ))}
            {pages > 1 && (
              <nav
                className="flex items-center justify-between text-sm"
                aria-label={t("act.pages")}
              >
                {page > 1 ? (
                  <Link href={`/law/${act.id}?page=${page - 1}`} className="underline">
                    {t("act.previous")}
                  </Link>
                ) : (
                  <span />
                )}
                <span className="text-fg-tertiary">{t("act.pageOf", { page, pages })}</span>
                {page < pages ? (
                  <Link href={`/law/${act.id}?page=${page + 1}`} className="underline">
                    {t("act.next")}
                  </Link>
                ) : (
                  <span />
                )}
              </nav>
            )}
          </section>
        )}

        <p className="text-sm">
          <Link href="/law" className="text-fg-secondary underline">
            {t("act.back")}
          </Link>
        </p>
      </div>
    </PageLayout>
  );
}

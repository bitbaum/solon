import { Link } from "@/i18n/navigation";
import PageLayout from "@/components/ui/page-layout";
import { LAW_AUTHORITIES, type ActKind } from "@/lib/config/law";
import { PROVISIONS_PER_PAGE, type ActView } from "@/lib/law/view";
import type { LawTranslator } from "./coverage-report";

interface ActViewProps {
  act: ActView;
  page: number;
  t: LawTranslator;
}

const authorityName = (key: string): string =>
  LAW_AUTHORITIES.find((a) => a.key === key)?.name ?? key;

const cardClass = "rounded-surface border border-default bg-surface-base p-6";

/**
 * An act as Solon holds it: what the publisher calls it, where it publishes it,
 * and the provisions of the version in force, with the page they were read from
 * and the hash that proves the copy. A version dated only by the day it was
 * read says so, rather than claiming a day it took effect.
 */
export default function ActViewPage({ act, page, t }: ActViewProps) {
  const { version } = act;
  const pages = version ? Math.max(1, Math.ceil(version.provisionCount / PROVISIONS_PER_PAGE)) : 1;
  const meta = [
    authorityName(act.authority),
    act.systematicNumber,
    t(`kinds.${act.kind}` as `kinds.${ActKind}`),
    act.inForce ? null : t("index.notInForce"),
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <PageLayout title={act.title ?? act.systematicNumber ?? act.id} kicker={t("act.kicker")}>
      <div className="max-w-3xl space-y-8">
        <p className="text-fg-secondary">{meta}</p>

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
                  ? t("act.inForceSince", { date: version.inForceFrom })
                  : t("act.readOn", { date: version.inForceFrom })}
              </p>
              <p className="text-fg-secondary">
                {t("act.copy", { date: version.retrievedOn })}{" "}
                {version.sourceUrl && (
                  <a href={version.sourceUrl} className="underline" rel="noopener">
                    {t("act.copyFrom")}
                  </a>
                )}
              </p>
              <p className="break-all font-mono text-xs text-fg-tertiary">
                sha256 {version.contentSha256}
              </p>
            </>
          ) : (
            <p className="text-fg-secondary">{t("act.noText")}</p>
          )}
        </div>

        {version && (
          <section className="space-y-6" aria-label={t("act.provisions")}>
            <h2 className="font-semibold text-fg-primary">
              {t("act.provisionCount", { count: version.provisionCount })}
            </h2>
            {act.provisions.map((provision) => (
              <article key={provision.path} id={provision.path} className="space-y-2">
                <h3 className="font-medium text-fg-primary">{provision.heading}</h3>
                <p className="whitespace-pre-line text-fg-secondary">{provision.text}</p>
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

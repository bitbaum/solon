import { notFound } from "next/navigation";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { toLocale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import PageLayout from "@/components/ui/page-layout";
import Redline from "@/components/law/redline";
import SupportButton from "@/components/law/support-button";
import { auth } from "@/lib/auth";
import { entryHref } from "@/lib/auth/entry-href";
import { db } from "@/lib/db/client";
import { redline } from "@/lib/law/amend/changes";
import { loadAmendment, supportsNow } from "@/lib/law/amend/store";
import { authorityName, loadAuthorityNames } from "@/lib/law/authority-names";
import { loadActView } from "@/lib/law/view";

export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string; id: string }>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/** The chain every proposal and support is recorded in, for anyone to verify. */
const CHAIN_URL = "/api/v1/law/amendments/log";
const card = "rounded-surface border border-default bg-surface-base p-5 sm:p-6";

export async function generateMetadata({ params }: { params: Params }) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale: toLocale(locale), namespace: "Amend.amendment" });
  if (!UUID.test(id)) return { title: t("kicker") };
  const amendment = await loadAmendment(db, id).catch(() => null);
  return { title: amendment?.revisions.at(-1)?.title ?? t("kicker") };
}

/**
 * One proposed change (design: docs/design/2026-11-amending-the-law.md): what
 * it changes as a redline, whether the law has moved under it, who supports
 * it, the official route its law can take, and every revision with its hash.
 */
export default async function AmendmentPage({ params }: { params: Params }) {
  const { locale: raw, id } = await params;
  const locale = toLocale(raw);
  setRequestLocale(locale);
  if (!UUID.test(id)) notFound();
  const amendment = await loadAmendment(db, id);
  if (!amendment) notFound();
  const t = await getTranslations({ locale, namespace: "Amend.amendment" });
  const format = await getFormatter({ locale });
  const act = await loadActView(db, { id: amendment.actId, lang: "de", page: 1 });
  const latest = amendment.revisions.at(-1)!;
  const session = await auth().catch(() => null);
  const supports = session ? await supportsNow(db, latest.id, `actor:${session.actorId}`) : false;
  const changed = amendment.amended.filter((p) => p.status !== "unchanged");
  const day = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "medium" });
  const actName = act?.title ?? act?.systematicNumber ?? amendment.actId;
  const place = authorityName(await loadAuthorityNames(locale), amendment.authority);

  return (
    <PageLayout title={latest.title} kicker={t("kicker")}>
      <div className="max-w-3xl space-y-8">
        <p className="text-fg-secondary">
          <Link href={`/law/${amendment.actId}`} className="text-fg-primary underline">
            {t("to", { act: actName })}
          </Link>{" "}
          · {place} · {t("filed", { revision: latest.revision, date: day(latest.recordedAt) })}
        </p>

        <p className={`${card} text-sm text-fg-secondary`}>
          {amendment.standing.state === "current" ? t("current") : t("outdated")}
        </p>

        <section className="space-y-4" aria-labelledby="support">
          <h2 id="support" className="headline text-2xl text-fg-primary">
            {t("support", { total: latest.support.total })}
          </h2>
          {latest.support.total > 0 && (
            <p className="text-sm text-fg-tertiary">
              {t("supportSplit", {
                account: latest.support.account,
                signed: latest.support.signed,
              })}
            </p>
          )}
          <SupportButton
            amendmentId={amendment.id}
            revision={latest.revision}
            supports={supports}
            signedIn={Boolean(session)}
            signInHref={entryHref("sign-in", locale, `/law/amendments/${amendment.id}`)}
          />
          <p className="text-sm text-fg-tertiary">{t("notLaw")}</p>
        </section>

        <section className="space-y-4" aria-labelledby="changes">
          <h2 id="changes" className="headline text-2xl text-fg-primary">
            {t("changes")}
          </h2>
          {changed.map((p, i) => (
            <article key={`${p.path ?? "new"}-${i}`} className={`${card} space-y-2`}>
              <div className="kicker">{t(p.status as "replaced" | "repealed" | "inserted")}</div>
              <h3 className="font-medium text-fg-primary">{p.heading}</h3>
              <Redline
                parts={
                  p.status === "replaced"
                    ? (p.redline ?? redline(p.before.text, p.text))
                    : p.status === "repealed"
                      ? redline(p.text, "")
                      : redline("", p.text)
                }
              />
            </article>
          ))}
        </section>

        {latest.rationale.trim() && (
          <section className="space-y-3" aria-labelledby="why">
            <h2 id="why" className="headline text-2xl text-fg-primary">
              {t("rationale")}
            </h2>
            <p className="whitespace-pre-line text-fg-secondary">{latest.rationale}</p>
          </section>
        )}

        <section className="space-y-4" aria-labelledby="routes">
          <h2 id="routes" className="headline text-2xl text-fg-primary">
            {t("routes")}
          </h2>
          {amendment.routes.length === 0 ? (
            <p className="text-fg-secondary">{t("noRoute")}</p>
          ) : (
            <ul className="space-y-4">
              {amendment.routes.map((route) => (
                <li key={route.key} className={`${card} space-y-2`}>
                  <h3 className="font-medium text-fg-primary">{route.name}</h3>
                  <p className="text-sm text-fg-secondary">
                    {route.signatures === null
                      ? t("routeNoBar", { who: route.whoMaySign })
                      : "count" in route.signatures
                        ? t("routeBar", {
                            count: format.number(route.signatures.count),
                            who: route.whoMaySign,
                          })
                        : t("routeShare", {
                            percent: route.signatures.percent,
                            of: route.signatures.of,
                            who: route.whoMaySign,
                          })}
                    {route.window &&
                      ` ${
                        "months" in route.window
                          ? t("routeWindowMonths", { months: route.window.months })
                          : t("routeWindowDays", { days: route.window.days })
                      }`}
                  </p>
                  {route.alsoRequired && route.alsoRequired.length > 0 && (
                    <ul className="list-disc space-y-1 pl-5 text-sm text-fg-secondary">
                      {route.alsoRequired.map((requirement) => (
                        <li key={requirement}>{requirement}</li>
                      ))}
                    </ul>
                  )}
                  <p className="text-sm text-fg-secondary">{route.outcome}</p>
                  {route.cannotChange && (
                    <p className="text-sm text-fg-tertiary">{route.cannotChange}</p>
                  )}
                  <p className="text-xs text-fg-tertiary">
                    <a href={route.source.url} className="underline" rel="noopener">
                      {t("routeSource", {
                        provision: route.source.provision,
                        title: route.source.title,
                      })}
                    </a>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3" aria-labelledby="revisions">
          <h2 id="revisions" className="headline text-2xl text-fg-primary">
            {t("revisions")}
          </h2>
          <ol className="divide-y divide-subtle border-y border-subtle">
            {amendment.revisions.map((r) => (
              <li key={r.id} className="space-y-1 py-4">
                <p className="text-sm text-fg-primary">
                  {t("revisionRow", {
                    revision: r.revision,
                    date: day(r.recordedAt),
                    support: t("support", { total: r.support.total }),
                  })}
                </p>
                <p className="break-all font-mono text-xs text-fg-tertiary">
                  sha256 {r.contentHash}
                </p>
              </li>
            ))}
          </ol>
          <p className="text-sm text-fg-tertiary">
            {t("chain")}{" "}
            <a href={CHAIN_URL} className="underline">
              {t("chainLink")}
            </a>
          </p>
        </section>

        <Link
          href={`/law/${amendment.actId}/amend?fork=${latest.id}`}
          className="btn-frame inline-flex w-full justify-center sm:w-auto"
        >
          {t("fork")}
        </Link>
      </div>
    </PageLayout>
  );
}

import { count, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPathname, Link } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import AxisPanel from "@/components/statistics/axis-panel";
import MetricView from "@/components/statistics/metric-view";
import PageLayout from "@/components/ui/page-layout";
import { scoreAxis } from "@/lib/statistics/axes";
import { loadSeriesFor } from "@/lib/statistics/read";
import { placesConfig } from "@/lib/config/places";
import { db } from "@/lib/db/client";
import { proposalEvidence } from "@/lib/db/statistics-schema";
import { DEFAULT_CATEGORY, proposeHref } from "@/lib/domain/proposal-draft";
import { SITE } from "@/lib/law/site";
import { localized } from "@/lib/places/place-view";
import { loadMetricPage, specQuery } from "@/lib/statistics/metric-page";
import { findStatistic, metricPath } from "@/lib/statistics/present";
import { loadView, viewPath } from "@/lib/statistics/views";

export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string; sha: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { locale: raw, sha } = await params;
  const locale = toLocale(raw);
  const view = await loadView(db, sha);
  const metric = view ? findStatistic(placesConfig, view.spec.metric) : undefined;
  if (!metric) return {};
  const t = await getTranslations({ locale, namespace: "Statistics" });
  return { title: t("view.metaTitle", { metric: localized(metric.label, locale) }) };
}

/**
 * A saved view: the places and years someone chose, under the hash of that
 * choice. The figures are today's; the choice never changes. From here a
 * decision can be proposed with the view as its evidence.
 */
export default async function SavedViewPage({ params }: { params: Params }) {
  const { locale: raw, sha } = await params;
  const locale = toLocale(raw);
  setRequestLocale(locale);
  const view = await loadView(db, sha);
  if (!view) notFound();
  const { spec } = view;
  if (spec.axis) {
    // A saved axis: the definition and the weights it was saved with, scored on today's figures.
    const { definition, weights } = spec.axis;
    const t = await getTranslations({ locale, namespace: "Statistics" });
    const metrics = new Map(
      placesConfig.metrics.filter((m) => m.statistic && !m.retired).map((m) => [m.key, m]),
    );
    // Scored as the index scores it: each place's latest plausible value.
    const byMetric = await loadSeriesFor(
      db,
      placesConfig,
      definition.components.map((c) => c.metric),
      locale,
      { latestOnly: true },
    );
    const url = `${SITE}${getPathname({ href: viewPath(sha), locale })}`;
    return (
      <PageLayout title={t("view.axisTitle")} kicker={t("view.kicker")}>
        <div className="max-w-5xl space-y-6">
          <p className="mb-0 text-sm text-fg-secondary">
            {t("view.saved", {
              date: view.recordedAt.toISOString().slice(0, 10),
              hash: sha.slice(0, 12),
            })}
          </p>
          <AxisPanel
            axis={definition}
            scores={scoreAxis(definition, byMetric, weights)}
            weights={weights}
            metrics={metrics}
            selfUrl={url}
            locale={locale}
            t={t}
          />
          <Link
            href={proposeHref({
              category: DEFAULT_CATEGORY,
              title: t("view.axisProposeTitle"),
              body: t("view.proposeBody", { url }),
            })}
            className="btn-primary min-h-11"
          >
            {t("view.propose")}
          </Link>
        </div>
      </PageLayout>
    );
  }
  const page = await loadMetricPage(db, placesConfig, spec.metric, locale, {
    places: spec.places,
    from: spec.from?.toString(),
    to: spec.to?.toString(),
  });
  if (!page) notFound();
  const t = await getTranslations({ locale, namespace: "Statistics" });
  const url = `${SITE}${getPathname({ href: viewPath(sha), locale })}`;
  const label = localized(page.metric.label, locale);
  const [{ n }] = await db
    .select({ n: count() })
    .from(proposalEvidence)
    .where(eq(proposalEvidence.viewSha256, sha));
  const banner = (
    <div className="space-y-3 rounded-surface border border-default bg-surface-raised p-5">
      <p className="mb-0 text-sm text-fg-secondary">
        {t("view.saved", {
          date: view.recordedAt.toISOString().slice(0, 10),
          hash: sha.slice(0, 12),
        })}
        {n > 0 ? ` ${t("view.evidenceOf", { count: n })}` : ""}
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          href={proposeHref({
            category: DEFAULT_CATEGORY,
            title: t("view.proposeTitle", { metric: label }),
            body: t("view.proposeBody", { url }),
          })}
          className="btn-primary min-h-11"
        >
          {t("view.propose")}
        </Link>
        <Link
          href={`${metricPath(page.metric.key)}${specQuery(spec)}`}
          className="btn-secondary min-h-11"
        >
          {t("view.live")}
        </Link>
      </div>
    </div>
  );
  return <MetricView {...page} spec={spec} locale={locale} selfUrl={url} banner={banner} t={t} />;
}

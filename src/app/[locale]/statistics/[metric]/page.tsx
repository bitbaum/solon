import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import MetricView from "@/components/statistics/metric-view";
import { placesConfig } from "@/lib/config/places";
import { db } from "@/lib/db/client";
import { SITE } from "@/lib/law/site";
import { localized } from "@/lib/places/place-view";
import { findStatistic, metricFromSlug, metricPath } from "@/lib/statistics/present";
import { loadMetricPage, placesFromQuery, specQuery } from "@/lib/statistics/metric-page";

export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string; metric: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export async function generateMetadata({ params }: { params: Params }) {
  const { locale: raw, metric: key } = await params;
  const locale = toLocale(raw);
  const metric = findStatistic(placesConfig, metricFromSlug(decodeURIComponent(key)));
  if (!metric) return {};
  const t = await getTranslations({ locale, namespace: "Statistics" });
  const name = localized(metric.label, locale);
  return {
    title: t("metric.metaTitle", { metric: name }),
    description: t("metric.metaDescription", { metric: name }),
  };
}

/** One statistic over time, beside the law it is about (design: 2026-11-freedom-laws-statistics). */
export default async function StatisticPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { locale: raw, metric: key } = await params;
  const locale = toLocale(raw);
  setRequestLocale(locale);
  const q = await searchParams;
  const page = await loadMetricPage(
    db,
    placesConfig,
    metricFromSlug(decodeURIComponent(key)),
    locale,
    {
      places: placesFromQuery(q),
      from: one(q.from),
      to: one(q.to),
    },
  );
  if (!page) notFound();
  const t = await getTranslations({ locale, namespace: "Statistics" });
  const selfUrl = `${SITE}${getPathname({ href: metricPath(page.metric.key), locale })}${specQuery(page.spec)}`;
  return <MetricView {...page} locale={locale} selfUrl={selfUrl} t={t} />;
}

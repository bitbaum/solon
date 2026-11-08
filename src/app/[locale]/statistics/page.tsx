import { and, eq } from "drizzle-orm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import StatisticsIndex from "@/components/statistics/statistics-index";
import { placesConfig } from "@/lib/config/places";
import { EXAMPLE_AXES } from "@/lib/config/statistics/axes";
import { db } from "@/lib/db/client";
import { policies } from "@/lib/db/schema";
import { orgBySlug } from "@/lib/domain/org";
import { SITE } from "@/lib/law/site";
import {
  axesPolicySchema,
  scoreAxis,
  STATISTIC_AXES_POLICY_KEY,
  weightsFromQuery,
  type Axis,
} from "@/lib/statistics/axes";
import { statisticMetrics } from "@/lib/statistics/present";
import { loadSeries } from "@/lib/statistics/read";

export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }) {
  const locale = toLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Statistics" });
  return { title: t("index.metaTitle"), description: t("index.metaDescription") };
}

/**
 * The axes to show: a group's own, voted as its `statistic_axes` policy, when
 * the link names the group (`?org=`), else the examples in config.
 */
async function axesFor(org: string | undefined): Promise<readonly Axis[]> {
  if (!org) return EXAMPLE_AXES;
  const found = await orgBySlug(org);
  if (!found) return EXAMPLE_AXES;
  const active = await db.query.policies.findFirst({
    where: and(
      eq(policies.organizationId, found.id),
      eq(policies.key, STATISTIC_AXES_POLICY_KEY),
      eq(policies.status, "ACTIVE"),
    ),
  });
  const parsed = axesPolicySchema.safeParse(active?.content);
  return parsed.success ? parsed.data.axes : EXAMPLE_AXES;
}

/** Every statistic at a glance, and the axes read with the reader's weights. */
export default async function StatisticsPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const q = await searchParams;
  const metrics = statisticMetrics(placesConfig);
  const statistics = await Promise.all(
    metrics.map(async (metric) => ({
      metric,
      series: await loadSeries(db, placesConfig, metric.key, locale),
    })),
  );
  const byMetric = new Map(statistics.map((s) => [s.metric.key, s.series]));
  const org = typeof q.org === "string" ? q.org : undefined;
  const base = `${SITE}${getPathname({ href: "/statistics", locale })}`;
  const axes = (await axesFor(org)).map((axis) => {
    const weights = weightsFromQuery(axis, q);
    const params = new URLSearchParams(
      Object.entries(weights).map(([k, v]) => [`w.${k}`, String(v)]),
    );
    if (org) params.set("org", org);
    return {
      axis,
      scores: scoreAxis(axis, byMetric, weights),
      weights: Object.fromEntries(
        axis.components.map((c) => [c.metric, weights[c.metric] ?? c.weight]),
      ),
      metrics: new Map(metrics.map((m) => [m.key, m])),
      selfUrl: params.size > 0 ? `${base}?${params}` : base,
    };
  });
  const t = await getTranslations({ locale, namespace: "Statistics" });
  return <StatisticsIndex statistics={statistics} axes={axes} locale={locale} t={t} />;
}

import { and, eq } from "drizzle-orm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import StatisticsIndex from "@/components/statistics/statistics-index";
import { placesConfig } from "@/lib/config/places";
import { EXAMPLE_AXES } from "@/lib/config/statistics/axes";
import { DIMENSIONS } from "@/lib/config/statistics/dimensions";
import { localized } from "@/lib/places/place-view";
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
import { customAxisFromQuery } from "@/lib/statistics/compare";
import { viewSpecSchema } from "@/lib/statistics/views";

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
  const metricMap = new Map(metrics.map((m) => [m.key, m]));
  const builtAxis = customAxisFromQuery(
    q,
    new Set(metrics.map((m) => m.key)),
    { en: t("index.customLabel") },
    { en: t("index.customDirection") },
    t("index.customAuthor"),
  );
  let custom = null;
  if (builtAxis) {
    const weights = Object.fromEntries(builtAxis.components.map((c) => [c.metric, c.weight]));
    const params = new URLSearchParams();
    for (const c of builtAxis.components) {
      params.append("use", c.metric);
      params.set(`w.${c.metric}`, String(c.weight));
      params.set(`d.${c.metric}`, String(c.sign));
    }
    const spec = viewSpecSchema.parse({
      version: 1,
      metric: builtAxis.components[0]!.metric,
      places: [],
      from: null,
      to: null,
      axis: { definition: builtAxis, weights },
    });
    custom = {
      axis: builtAxis,
      scores: scoreAxis(builtAxis, byMetric, weights),
      weights,
      metrics: metricMap,
      selfUrl: `${base}?${params}`,
      hidden: builtAxis.components.flatMap((c): [string, string][] => [
        ["use", c.metric],
        [`d.${c.metric}`, String(c.sign)],
      ]),
      saveSpec: JSON.stringify(spec),
    };
  }
  return (
    <StatisticsIndex
      statistics={statistics}
      axes={axes}
      dimensions={DIMENSIONS.map((d) => ({
        key: d.key,
        label: localized(d.label, locale),
        summary: localized(d.summary, locale),
      }))}
      custom={custom}
      builder={{ chosen: builtAxis }}
      locale={locale}
      t={t}
    />
  );
}

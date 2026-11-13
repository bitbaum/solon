import { getTranslations, setRequestLocale } from "next-intl/server";
import { toLocale } from "@/i18n/routing";
import CompareView from "@/components/statistics/compare-view";
import { placesConfig } from "@/lib/config/places";
import { db } from "@/lib/db/client";
import { scatterPoints } from "@/lib/statistics/compare";
import { statisticMetrics } from "@/lib/statistics/present";
import { loadSeriesFor } from "@/lib/statistics/read";

export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string }>;
type SearchParams = Promise<{ x?: string; y?: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const locale = toLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Statistics" });
  return { title: t("compare.metaTitle"), description: t("compare.metaDescription") };
}

/** Two measures against each other, one point per place, at the latest year it has both. */
export default async function ComparePage({
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
  const keys = new Set(metrics.map((m) => m.key));
  const x = metrics.find((m) => m.key === q.x) ?? metrics[0];
  const y =
    metrics.find((m) => m.key === q.y) ?? metrics.find((m) => m.key !== x?.key) ?? metrics[0];
  const loaded =
    x && y && keys.has(x.key) && keys.has(y.key)
      ? await loadSeriesFor(db, placesConfig, [x.key, y.key], locale)
      : new Map();
  const [xs, ys] = [loaded.get(x?.key ?? "") ?? [], loaded.get(y?.key ?? "") ?? []];
  const t = await getTranslations({ locale, namespace: "Statistics" });
  return (
    <CompareView
      metrics={metrics}
      x={x ?? null}
      y={y ?? null}
      points={scatterPoints(xs, ys)}
      locale={locale}
      t={t}
    />
  );
}

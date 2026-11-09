import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { toLocale } from "@/i18n/routing";
import DimensionView from "@/components/statistics/dimension-view";
import { placesConfig } from "@/lib/config/places";
import { DIMENSIONS } from "@/lib/config/statistics/dimensions";
import { db } from "@/lib/db/client";
import { localized } from "@/lib/places/place-view";
import { loadDimensionPage } from "@/lib/statistics/dimension-page";

export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string; key: string }>;
type SearchParams = Promise<{ x?: string; y?: string; p?: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { locale: raw, key } = await params;
  const locale = toLocale(raw);
  const d = DIMENSIONS.find((x) => x.key === key);
  if (!d) return {};
  const t = await getTranslations({ locale, namespace: "Statistics" });
  const label = localized(d.label, locale);
  return {
    title: t("dimension.metaTitle", { label }),
    description: t("dimension.metaDescription", { label }),
  };
}

/** One dimension in three layers: what the law says, what happens in practice, what results. */
export default async function DimensionPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { locale: raw, key } = await params;
  const locale = toLocale(raw);
  setRequestLocale(locale);
  const page = await loadDimensionPage(db, placesConfig, key, locale, await searchParams);
  if (!page) notFound();
  const t = await getTranslations({ locale, namespace: "Statistics" });
  return <DimensionView page={page} locale={locale} t={t} />;
}

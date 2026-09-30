import { getTranslations, setRequestLocale } from "next-intl/server";
import { toLocale } from "@/i18n/routing";
import CoverageReport from "@/components/places/coverage-report";
import { placesConfig } from "@/lib/config/places";
import { db } from "@/lib/db/client";
import { loadCoverage } from "@/lib/places/coverage";

export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string }>;

const today = () => new Date().toISOString().slice(0, 10);

export async function generateMetadata({ params }: { params: Params }) {
  const locale = toLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Places" });
  return { title: t("coverage.metaTitle"), description: t("coverage.metaDescription") };
}

/** What Places covers, counted from the data (design §9.2). */
export default async function PlacesCoveragePage({ params }: { params: Params }) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const on = today();
  const packs = await loadCoverage(db, placesConfig, on, locale);
  const t = await getTranslations({ locale, namespace: "Places" });
  return <CoverageReport packs={packs} on={on} t={t} />;
}

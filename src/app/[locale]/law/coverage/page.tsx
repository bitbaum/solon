import { getTranslations, setRequestLocale } from "next-intl/server";
import { toLocale } from "@/i18n/routing";
import LawCoverageReport from "@/components/law/coverage-report";
import { db } from "@/lib/db/client";
import { loadLawCoverage } from "@/lib/law/register/coverage";

export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const locale = toLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Law" });
  return { title: t("coverage.metaTitle"), description: t("coverage.metaDescription") };
}

/** What the law register holds, counted from the data. */
export default async function LawCoveragePage({ params }: { params: Params }) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const coverage = await loadLawCoverage(db);
  const t = await getTranslations({ locale, namespace: "Law" });
  return <LawCoverageReport coverage={coverage} t={t} />;
}

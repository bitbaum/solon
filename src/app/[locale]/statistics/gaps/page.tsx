import { getTranslations, setRequestLocale } from "next-intl/server";
import { GapsIndex } from "@/components/statistics/gaps-view";
import { toLocale } from "@/i18n/routing";
import { GAPS } from "@/lib/config/statistics/gaps";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const locale = toLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Statistics.gaps" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function GapsPage({ params }: { params: Params }) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Statistics" });
  return <GapsIndex topics={GAPS.topics} locale={locale} t={t} />;
}

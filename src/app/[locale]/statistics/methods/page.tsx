import { getTranslations, setRequestLocale } from "next-intl/server";
import { toLocale } from "@/i18n/routing";
import { MethodsIndex } from "@/components/statistics/methods-view";
import { DIMENSIONS } from "@/lib/config/statistics/dimensions";
import { METHODOLOGIES } from "@/lib/config/statistics/methodologies";
import { localized } from "@/lib/places/place-view";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const locale = toLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Statistics" });
  return { title: t("methods.metaTitle"), description: t("methods.metaDescription") };
}

/** How the rankings are made: every index described the same way. */
export default async function MethodsPage({ params }: { params: Params }) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Statistics" });
  return (
    <MethodsIndex
      methods={METHODOLOGIES}
      own={DIMENSIONS.map((d) => ({ key: d.key, label: localized(d.label, locale) }))}
      locale={locale}
      t={t}
    />
  );
}

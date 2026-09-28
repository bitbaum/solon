import { getTranslations, setRequestLocale } from "next-intl/server";
import DevelopmentRecords from "@/components/site/development-records";
import { toLocale } from "@/i18n/routing";

type Params = { params: Promise<{ locale: string }> };

/**
 * Re-read the fleet map at most every five minutes — it is cached that long
 * upstream. A literal, because Next reads segment config statically; it
 * mirrors MAP_REVALIDATE_SECONDS in lib/development-records.ts.
 */
export const revalidate = 300;

export async function generateMetadata({ params }: Params) {
  const t = await getTranslations({
    locale: toLocale((await params).locale),
    namespace: "Development",
  });
  return { title: t("changelogTitle"), description: t("changelogDescription") };
}

/** Solon's changelog, read from the fleet map (the record lives in CHANGELOG.md). */
export default async function ChangelogPage({ params }: Params) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  return <DevelopmentRecords section="changelog" locale={locale} />;
}

import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import CompareIndex from "@/components/places/compare-index";
import { placesConfig } from "@/lib/config/places";
import { REGISTER_POLICY_DEFAULTS } from "@/lib/config/places/policies";
import { db } from "@/lib/db/client";
import { loadComparison } from "@/lib/places/compare";
import { comparedPaths } from "@/lib/places/compare-request";
import { searchPlaces } from "@/lib/places/search";

export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string }>;
type SearchParams = Promise<{ p?: string | string[]; q?: string }>;

const today = () => new Date().toISOString().slice(0, 10);

export async function generateMetadata({ params }: { params: Params }) {
  const locale = toLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Places" });
  return { title: t("compare.metaTitle"), description: t("compare.metaDescription") };
}

/** Places side by side (design §9.2). The estimate runs in the browser; no income reaches here. */
export default async function ComparePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const { p, q = "" } = await searchParams;
  const limit = REGISTER_POLICY_DEFAULTS.compareLimit;
  const slugPaths = comparedPaths(p, limit);
  const query = q.trim().slice(0, 100);
  const on = today();

  const [comparison, search] = await Promise.all([
    loadComparison(db, placesConfig, slugPaths, on, locale),
    query ? searchPlaces(db, placesConfig, query, on, locale) : null,
  ]);
  const t = await getTranslations({ locale, namespace: "Places" });
  return (
    <CompareIndex
      slugPaths={comparison.columns.map((c) => c.slugPath)}
      comparison={comparison}
      limit={limit}
      query={query}
      searchAction={getPathname({ href: "/compare", locale })}
      search={search}
      t={t}
    />
  );
}

import { getTranslations, setRequestLocale } from "next-intl/server";
import PageLayout from "@/components/ui/page-layout";
import ResearchView from "@/components/statistics/research-view";
import { toLocale } from "@/i18n/routing";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const locale = toLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Statistics.research" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

/** Deep research with AI over what Solon holds: series, dimensions, methods, law. */
export default async function ResearchPage({ params }: { params: Params }) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Statistics.research" });
  const tools = [
    "search_catalog",
    "read_series",
    "read_dimension",
    "read_method",
    "search_law",
    "web_search",
    "web_read",
  ];
  return (
    <PageLayout title={t("title")} kicker={t("kicker")} description={t("intro")}>
      <ResearchView
        locale={locale}
        texts={{
          questionLabel: t("questionLabel"),
          placeholder: t("placeholder"),
          ask: t("ask"),
          asking: t("asking"),
          steps: { search: t("steps.search"), write: t("steps.write") },
          tools: {
            search_catalog: t("tools.search_catalog"),
            read_series: t("tools.read_series"),
            read_dimension: t("tools.read_dimension"),
            read_method: t("tools.read_method"),
            search_law: t("tools.search_law"),
            web_search: t("tools.web_search"),
            web_read: t("tools.web_read"),
          },
          sourcesTitle: t("sourcesTitle"),
          reportTitle: t("reportTitle"),
          aiLabel: t("aiLabel"),
          cited: t("cited"),
          rateLimited: t("rateLimited"),
          unavailable: t("unavailable"),
          failed: t("failed"),
          examplesTitle: t("examplesTitle"),
          examples: [t("examples.a"), t("examples.b"), t("examples.c")],
        }}
      />
    </PageLayout>
  );
}

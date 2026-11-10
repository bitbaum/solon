import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import Atlas from "@/components/atlas/atlas";
import PageLayout from "@/components/ui/page-layout";

export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string }>;
type SearchParams = Promise<{ in?: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const locale = toLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Places" });
  return { title: t("taxMap.title"), description: t("taxMap.intro") };
}

/**
 * The tax map, on its own page: a country's places coloured by what tax would
 * cost the reader there. Kept apart from the place pages, which say what a
 * place is; this one is a tool. The income stays in the browser.
 */
export default async function TaxMapPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const { in: open } = await searchParams;
  const t = await getTranslations({ locale, namespace: "Places" });
  return (
    <PageLayout title={t("taxMap.title")} kicker={t("index.title")}>
      <p className="mb-10 max-w-3xl text-fg-secondary">{t("taxMap.intro")}</p>
      <Atlas
        mode="full"
        layer="tax"
        initial={open && /^[a-z0-9-]{1,40}$/.test(open) ? open : null}
      />
      <p className="mt-10 text-sm">
        <Link href="/places" className="text-fg-primary hover:underline">
          ← {t("taxMap.back")}
        </Link>
      </p>
    </PageLayout>
  );
}

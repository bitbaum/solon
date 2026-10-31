import { getTranslations, setRequestLocale } from "next-intl/server";
import PageLayout from "@/components/ui/page-layout";
import StructureComparison from "@/components/structures/structure-comparison";
import { toLocale } from "@/i18n/routing";
import { db } from "@/lib/db/client";
import { loadStructureTable } from "@/lib/structures/load";

export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const locale = toLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Structures" });
  return { title: t("metaTitle"), description: t("description") };
}

/** Legal forms side by side in law (design: docs/design/2026-10-structures-as-data.md). */
export default async function StructuresPage({ params }: { params: Params }) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const table = await loadStructureTable(db, new Date().toISOString().slice(0, 10));
  const t = await getTranslations({ locale, namespace: "Structures" });
  return (
    <PageLayout title={t("title")} kicker={t("kicker")} description={t("description")}>
      <StructureComparison table={table} locale={locale} t={t} />
    </PageLayout>
  );
}

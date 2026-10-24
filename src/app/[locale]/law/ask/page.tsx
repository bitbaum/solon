import { getTranslations, setRequestLocale } from "next-intl/server";
import PageLayout from "@/components/ui/page-layout";
import { LawChat } from "@/components/law/law-chat";
import { toLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const locale = toLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Law.ask" });
  return { title: t("metaTitle"), description: t("description") };
}

export default async function AskTheLawPage({ params }: { params: Params }) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Law.ask" });
  return (
    <PageLayout title={t("title")} description={t("description")}>
      <LawChat />
    </PageLayout>
  );
}

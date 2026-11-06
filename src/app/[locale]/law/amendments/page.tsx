import { getTranslations, setRequestLocale } from "next-intl/server";
import { toLocale } from "@/i18n/routing";
import PageLayout from "@/components/ui/page-layout";
import AmendmentList from "@/components/law/amendment-list";
import { db } from "@/lib/db/client";
import { listAmendments } from "@/lib/law/amend/store";

export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const t = await getTranslations({
    locale: toLocale((await params).locale),
    namespace: "Amend.list",
  });
  return { title: t("metaTitle"), description: t("intro") };
}

/** Every proposed change to the law, newest first (design: docs/design/2026-11-amending-the-law.md). */
export default async function AmendmentsPage({ params }: { params: Params }) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Amend.list" });
  const amendments = await listAmendments(db, { limit: 100 }).catch(() => []);
  return (
    <PageLayout title={t("title")} description={t("intro")} kicker={t("metaTitle")}>
      <div className="max-w-3xl space-y-6">
        <AmendmentList amendments={amendments} empty={t("empty")} />
        <p className="text-sm text-fg-tertiary">{t("howTo")}</p>
      </div>
    </PageLayout>
  );
}

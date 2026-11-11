import PageLayout from "@/components/ui/page-layout";
import { GovernanceChat } from "@/components/chat/governance-chat";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";
export default async function AskPage() {
  const session = await auth();
  const t = await getTranslations("AskSolon");
  return (
    <PageLayout title={t("title")} description={t("description")}>
      <GovernanceChat signedIn={!!session} />
    </PageLayout>
  );
}

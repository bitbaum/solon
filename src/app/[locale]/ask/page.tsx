import PageLayout from "@/components/ui/page-layout";
import { GovernanceChat } from "@/components/chat/governance-chat";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";
export default async function AskPage() {
  const session = await auth();
  return (
    <PageLayout
      title="Ask Solon"
      description="Understand the rules, compare ways to decide, or turn an idea into a proposal draft."
    >
      <GovernanceChat signedIn={!!session} />
    </PageLayout>
  );
}

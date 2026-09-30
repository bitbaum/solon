import PageLayout from "@/components/ui/page-layout";
import DashboardTabs from "@/components/dashboard/dashboard-tabs";
import { primaryOrg } from "@/lib/domain/org";

/**
 * The working screens: the same page header as every other page, then a plain
 * underlined tab row. No frame around the content — the content's own sections
 * carry their borders, so wrapping them in another box only nests cards inside
 * cards.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const org = await primaryOrg().catch(() => null);

  return (
    <PageLayout
      kicker="Dashboard"
      title={org?.name ?? "Dashboard"}
      description={
        org
          ? `What is going on at ${org.name}: the latest vote, the money and what happened lately.`
          : undefined
      }
    >
      <DashboardTabs />
      <div className="pt-10">{children}</div>
    </PageLayout>
  );
}

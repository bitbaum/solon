import { Link } from "@/i18n/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { proposals as proposalsTable } from "@/lib/db/schema";
import { primaryOrg } from "@/lib/domain/org";
import PageLayout from "@/components/ui/page-layout";
import { CATEGORY_LABEL } from "@/lib/config/governance";
import { proposalStanding } from "@/lib/domain/plain-words";

export const metadata = { title: "Decisions — Solon" };
export const dynamic = "force-dynamic";

const STATUS_ACTION: Record<string, string> = {
  DRAFT: "Start the vote →",
  OPEN: "Vote →",
  CLOSED: "See the result →",
};

export default async function ProposalsPage() {
  const org = await primaryOrg();
  const proposals = org
    ? await db.query.proposals.findMany({
        where: eq(proposalsTable.organizationId, org.id),
        orderBy: desc(proposalsTable.createdAt),
        with: { proposer: true, session: true },
      })
    : [];

  const orgName = org?.name ?? "this organization";
  return (
    <PageLayout
      kicker="Decisions"
      title={`What ${orgName} is deciding`}
      description="Everything members have suggested, and how each vote went. Anyone can read it."
    >
      {proposals.length > 0 && (
        <Link href="/propose" className="btn-primary mb-10 inline-flex">
          Suggest something
        </Link>
      )}

      <div className="space-y-3">
        {proposals.length === 0 && (
          <div className="rounded-surface border border-default bg-surface-base p-8 text-center">
            <p className="text-fg-secondary">
              Nobody has suggested anything yet. Yours could be the first.
            </p>
            <Link href="/propose" className="btn-primary mt-6 inline-flex">
              Suggest something
            </Link>
          </div>
        )}

        {proposals.map((p) => (
          <Link
            key={p.id}
            href={`/proposals/${p.id}`}
            className="block rounded-surface border border-default bg-surface-base p-5 transition-colors hover:bg-surface-raised"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="headline text-display-3 text-fg-primary">{p.title}</h2>
                <p className="mt-1 text-sm text-fg-secondary">
                  {CATEGORY_LABEL[p.category]} · suggested by {p.proposer.displayName}
                </p>
              </div>
              <span className="shrink-0 rounded-pill border border-default px-3 py-1 text-xs text-fg-secondary">
                {proposalStanding(p.status, p.session?.outcome)}
              </span>
            </div>
            <span className="mt-3 inline-block text-sm text-accent">
              {STATUS_ACTION[p.status] ?? "View →"}
            </span>
          </Link>
        ))}
      </div>
    </PageLayout>
  );
}

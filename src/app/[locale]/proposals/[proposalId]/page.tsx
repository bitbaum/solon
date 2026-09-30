import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { proposals } from "@/lib/db/schema";
import { readOptions, sessionAggregate } from "@/lib/domain/voting";
import { methodId } from "@/lib/domain/methods/db-enum";
import { DEFAULT_DOT_BUDGET } from "@/lib/domain/methods";
import VotingInterface from "@/components/dashboard/voting-interface";
import OpenSessionButton from "@/components/governance/open-session-button";
import { auth } from "@/lib/auth";
import { viewerFor } from "@/lib/auth/recognition";
import PageLayout from "@/components/ui/page-layout";
import { CATEGORY_LABEL } from "@/lib/config/governance";
import { votingRules } from "@/lib/domain/plain-words";

export const dynamic = "force-dynamic";

/**
 * One proposal, and whatever the next step on it happens to be: open it, vote
 * on it, or read the decision it produced. The page never renders a dead end —
 * each status has exactly one primary action.
 */
export default async function ProposalPage({
  params,
}: {
  params: Promise<{ proposalId: string }>;
}) {
  const { proposalId } = await params;
  const proposal = await db.query.proposals.findFirst({
    where: eq(proposals.id, proposalId),
    with: { proposer: true, session: true, organization: true },
  });
  if (!proposal) notFound();

  const aggregate = proposal.session ? await sessionAggregate(proposal.session.id) : null;
  const viewer = await viewerFor((await auth())?.actorId, proposal.organizationId);

  return (
    <PageLayout
      kicker={CATEGORY_LABEL[proposal.category]}
      title={proposal.title}
      description={`Suggested by ${proposal.proposer.displayName}`}
    >
      <div className="max-w-3xl space-y-8">
        <section className="rounded-surface border border-default bg-surface-base p-6">
          <h2 className="headline text-display-3 text-fg-primary">Why</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-fg-primary">
            {proposal.body}
          </p>
        </section>

        {proposal.status === "DRAFT" && (
          <section className="rounded-surface border border-default bg-surface-base p-6">
            <h2 className="headline text-display-3 text-fg-primary">Nobody can vote yet</h2>
            <p className="mt-3 text-sm text-fg-secondary">
              Anyone can read this suggestion. Voting starts when a member opens it.
            </p>
            <div className="mt-6">
              <OpenSessionButton proposalId={proposal.id} />
            </div>
          </section>
        )}

        {proposal.session && (
          <VotingInterface
            session={{
              id: proposal.session.id,
              title: proposal.title,
              rules: votingRules(proposal.session),
              status: proposal.session.status,
              method: methodId(proposal.session.method),
              options: readOptions(proposal.session.options),
              dotBudget: proposal.session.dotBudget ?? DEFAULT_DOT_BUDGET,
            }}
            aggregate={aggregate}
            viewer={viewer}
            here={`/proposals/${proposal.id}`}
          />
        )}

        <Link
          href="/proposals"
          className="inline-block text-sm text-fg-secondary transition-colors hover:text-fg-primary"
        >
          ← All decisions
        </Link>
      </div>
    </PageLayout>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { readOptions, sessionAggregate } from "@/lib/domain/voting";
import { methodId } from "@/lib/domain/methods/prisma-enum";
import { DEFAULT_DOT_BUDGET } from "@/lib/domain/methods";
import VotingInterface from "@/components/dashboard/voting-interface";
import OpenSessionButton from "@/components/governance/open-session-button";

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
  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    include: { proposer: true, session: true, organization: true },
  });
  if (!proposal) notFound();

  const aggregate = proposal.session ? await sessionAggregate(proposal.session.id) : null;

  return (
    <main className="section-shell py-section-tight">
      <Link
        href="/proposals"
        className="text-sm text-fg-secondary transition-colors hover:text-fg-primary"
      >
        ← All proposals
      </Link>

      <div className="mx-auto mt-6 max-w-3xl space-y-8">
        <header>
          <span className="text-xs uppercase tracking-caps text-fg-tertiary">
            {proposal.category.replace(/_/g, " ").toLowerCase()}
          </span>
          <h1 className="mt-2 font-display text-display-2 text-fg-primary">{proposal.title}</h1>
          <p className="mt-3 text-sm text-fg-secondary">
            Filed by {proposal.proposer.displayName} ·{" "}
            <span className="font-mono text-xs">{proposal.proposer.bitcoinAddress}</span>
          </p>
        </header>

        <section className="rounded-surface border border-default bg-surface-base p-6">
          <h2 className="text-sm font-semibold uppercase tracking-caps text-fg-tertiary">
            Rationale
          </h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-fg-primary">
            {proposal.body}
          </p>
        </section>

        {proposal.status === "DRAFT" && (
          <section className="rounded-surface border border-default bg-surface-base p-6">
            <h2 className="font-display text-display-3 text-fg-primary">Not yet open</h2>
            <p className="mt-3 text-sm text-fg-secondary">
              This proposal is on the record but no votes can be cast until a session opens.
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
              rules: `${proposal.session.threshold} · quorum ${proposal.session.quorumPercent}% · electorate ${proposal.session.electorate}`,
              status: proposal.session.status,
              method: methodId(proposal.session.method),
              options: readOptions(proposal.session.options),
              dotBudget: proposal.session.dotBudget ?? DEFAULT_DOT_BUDGET,
            }}
            aggregate={aggregate}
          />
        )}
      </div>
    </main>
  );
}

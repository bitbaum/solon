import VotingInterface from "@/components/dashboard/voting-interface";
import { sessionTally } from "@/lib/domain/voting";
import { primaryOrg } from "@/lib/domain/org";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function VotingPage() {
  let session = null;
  let dbError = false;
  try {
    // Scoped to the organization: unscoped, a second org's session would show
    // up here as if it were this one's.
    const org = await primaryOrg();
    session = org
      ? await prisma.votingSession.findFirst({
          where: { proposal: { organizationId: org.id } },
          orderBy: { opensAt: "desc" },
          include: { proposal: true },
        })
      : null;
  } catch {
    dbError = true;
  }

  if (dbError) {
    return (
      <main className="space-y-6">
        <h1 className="font-display text-display-3">Voting</h1>
        <p className="text-fg-secondary">
          The voting register is currently unreachable. No session data can be
          shown.
        </p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="space-y-6">
        <h1 className="font-display text-display-3">Voting</h1>
        <p className="text-fg-secondary">
          No voting session has been opened yet. When one opens, registered
          members vote here by signing the canonical vote message with their own
          Bitcoin wallet.
        </p>
      </main>
    );
  }

  const tally = await sessionTally(session.id);

  return (
    <main className="space-y-6">
      <h1 className="font-display text-display-3">
        {session.status === "ACTIVE" ? "Open Vote" : "Latest Vote"}
      </h1>
      <VotingInterface
        session={{
          id: session.id,
          title: session.proposal.title,
          rules: `${session.threshold} · quorum ${session.quorumPercent}% · electorate ${session.electorate}`,
          status: session.status,
        }}
        tally={tally}
      />
    </main>
  );
}

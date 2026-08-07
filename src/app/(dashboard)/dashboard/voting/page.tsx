import VotingInterface from "@/components/dashboard/voting-interface";
import { sessionTally } from "@/lib/domain/voting";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function VotingPage() {
  let session = null;
  let dbError = false;
  try {
    session = await prisma.votingSession.findFirst({
      orderBy: { opensAt: "desc" },
      include: { proposal: true },
    });
  } catch {
    dbError = true;
  }

  if (dbError) {
    return (
      <main className="space-y-6">
        <h1 className="text-3xl font-bold">Voting</h1>
        <p className="text-gray-300">
          The voting register is currently unreachable. No session data can be shown.
        </p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="space-y-6">
        <h1 className="text-3xl font-bold">Voting</h1>
        <p className="text-gray-300">
          No voting session has been opened yet. When one opens, registered members vote
          here by signing the canonical vote message with their own Bitcoin wallet.
        </p>
      </main>
    );
  }

  const tally = await sessionTally(session.id);

  return (
    <main className="space-y-6">
      <h1 className="text-3xl font-bold">
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

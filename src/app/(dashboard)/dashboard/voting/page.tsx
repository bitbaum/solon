import VotingInterface from "@/components/dashboard/voting-interface";
import { Democracy } from "@/lib/solon/democracy";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function VotingPage() {
  let session = null;
  let dbError = false;
  try {
    session = await prisma.voting_sessions.findFirst({ orderBy: { start_date: "desc" } });
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

  const tally = await new Democracy().tally(session.id);

  return (
    <main className="space-y-6">
      <h1 className="text-3xl font-bold">Open Vote</h1>
      <VotingInterface session={session} tally={tally} />
    </main>
  );
}

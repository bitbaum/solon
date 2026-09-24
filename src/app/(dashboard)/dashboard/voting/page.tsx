import VotingInterface from "@/components/dashboard/voting-interface";
import { readOptions, sessionAggregate } from "@/lib/domain/voting";
import { methodId } from "@/lib/domain/methods/db-enum";
import { DEFAULT_DOT_BUDGET } from "@/lib/domain/methods";
import { primaryOrg } from "@/lib/domain/org";
import { auth } from "@/lib/auth";
import { viewerFor } from "@/lib/auth/recognition";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { proposals, votingSessions } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function VotingPage() {
  let session = null;
  let dbError = false;
  try {
    // Scoped to the organization: unscoped, a second org's session would show
    // up here as if it were this one's.
    const org = await primaryOrg();
    session = org
      ? ((await db.query.votingSessions.findFirst({
          where: inArray(
            votingSessions.proposalId,
            db
              .select({ id: proposals.id })
              .from(proposals)
              .where(eq(proposals.organizationId, org.id)),
          ),
          orderBy: desc(votingSessions.opensAt),
          with: { proposal: true },
        })) ?? null)
      : null;
  } catch {
    dbError = true;
  }

  if (dbError) {
    return (
      <main className="space-y-6">
        <h1 className="font-display text-display-3">Voting</h1>
        <p className="text-fg-secondary">
          The voting register is currently unreachable. No session data can be shown.
        </p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="space-y-6">
        <h1 className="font-display text-display-3">Voting</h1>
        <p className="text-fg-secondary">
          No voting session has been opened yet. When one opens, members vote here with one click.
        </p>
      </main>
    );
  }

  const aggregate = await sessionAggregate(session.id);
  const viewer = await viewerFor((await auth())?.actorId, session.proposal.organizationId);

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
          method: methodId(session.method),
          options: readOptions(session.options),
          dotBudget: session.dotBudget ?? DEFAULT_DOT_BUDGET,
        }}
        aggregate={aggregate}
        viewer={viewer}
        here="/dashboard/voting"
      />
    </main>
  );
}

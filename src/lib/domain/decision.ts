import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { SessionStatus, votes, votingSessions } from "@/lib/db/schema";
import { proposalMessage } from "@/lib/bitcoin/message";
import { aggregateBallots } from "@/lib/domain/methods";
import { methodId } from "@/lib/domain/methods/db-enum";
import { readOptions } from "@/lib/domain/voting";
import { tallyOf } from "@/lib/domain/tally";

/**
 * The self-verifying decision document — Solon's keystone artifact. It carries
 * everything a consumer needs to re-verify the decision locally: the proposal
 * with its content hash, the rules snapshotted at open, and every vote's exact
 * signed message + signature + public key. Consumers (OrangeCat) re-verify
 * against their own pinned trusted keys and recompute the tally; they never
 * trust this server's arithmetic.
 */
export async function decisionDocument(sessionId: string) {
  const session = await db.query.votingSessions.findFirst({
    where: eq(votingSessions.id, sessionId),
    with: {
      proposal: {
        with: {
          organization: { columns: { id: true, slug: true, name: true } },
          proposer: {
            columns: {
              id: true,
              displayName: true,
              memberType: true,
              bitcoinAddress: true,
              publicKeyHex: true,
            },
          },
        },
      },
      votes: {
        with: {
          member: {
            columns: {
              id: true,
              displayName: true,
              memberType: true,
              bitcoinAddress: true,
              publicKeyHex: true,
            },
          },
        },
        orderBy: asc(votes.createdAt),
      },
    },
  });
  if (!session) return { found: false as const, reason: "voting session not found" };
  if (session.status !== SessionStatus.CLOSED) {
    return {
      found: true as const,
      finalized: false as const,
      reason: "session is not closed yet — no decision exists",
    };
  }

  const p = session.proposal;
  // Recomputed from the stored ballots rather than read from the session, so
  // the document states a result that follows from the votes it publishes.
  const aggregate = aggregateBallots(
    methodId(session.method),
    session.votes.map((v) => ({ ballot: v.ballot, weight: Number(v.weight) })),
    readOptions(session.options),
    { dotBudget: session.dotBudget },
  );
  return {
    found: true as const,
    finalized: true as const,
    document: {
      decision_id: session.id,
      organization: p.organization,
      proposal: {
        id: p.id,
        category: p.category,
        title: p.title,
        body: p.body,
        policyKey: p.policyKey,
        proposedContent: p.proposedContent,
        target: p.target,
        contentHash: p.contentHash,
        proposer: p.proposer,
        // The exact message the proposer signed, reconstructable from fields above.
        proposerMessage: proposalMessage({
          orgSlug: p.organization.slug,
          category: p.category,
          title: p.title,
          proposerAddress: p.proposer.bitcoinAddress,
          contentHash: p.contentHash,
        }),
        proposerSignature: p.proposerSignature,
      },
      rules: {
        electorate: session.electorate,
        method: session.method,
        options: readOptions(session.options),
        dotBudget: session.dotBudget,
        threshold: session.threshold,
        quorumPercent: session.quorumPercent,
        eligibleCount: session.eligibleCount,
        eligibleWeight: Number(session.eligibleWeight),
        opensAt: session.opensAt,
        closesAt: session.closesAt,
      },
      votes: session.votes.map((v) => ({
        member: v.member,
        ballot: v.ballot,
        weight: Number(v.weight),
        signedMessage: v.signedMessage,
        signature: v.signature,
        castAt: v.createdAt,
      })),
      aggregate,
      tally: tallyOf(aggregate),
      outcome: session.outcome,
      closedAt: session.closedAt,
    },
  };
}

export type DecisionDocument = NonNullable<
  Extract<Awaited<ReturnType<typeof decisionDocument>>, { finalized: true }>["document"]
>;

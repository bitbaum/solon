import { SessionStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { proposalMessage } from "@/lib/bitcoin/message";
import { tally } from "@/lib/domain/tally";

/**
 * The self-verifying decision document — Solon's keystone artifact. It carries
 * everything a consumer needs to re-verify the decision locally: the proposal
 * with its content hash, the rules snapshotted at open, and every vote's exact
 * signed message + signature + public key. Consumers (OrangeCat) re-verify
 * against their own pinned trusted keys and recompute the tally; they never
 * trust this server's arithmetic.
 */
export async function decisionDocument(sessionId: string) {
  const session = await prisma.votingSession.findUnique({
    where: { id: sessionId },
    include: {
      proposal: {
        include: {
          organization: { select: { id: true, slug: true, name: true } },
          proposer: {
            select: {
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
        include: {
          member: {
            select: {
              id: true,
              displayName: true,
              memberType: true,
              bitcoinAddress: true,
              publicKeyHex: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!session) return { found: false as const, reason: "voting session not found" };
  if (session.status !== SessionStatus.CLOSED) {
    return { found: true as const, finalized: false as const, reason: "session is not closed yet — no decision exists" };
  }

  const p = session.proposal;
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
        threshold: session.threshold,
        quorumPercent: session.quorumPercent,
        eligibleCount: session.eligibleCount,
        eligibleWeight: Number(session.eligibleWeight),
        opensAt: session.opensAt,
        closesAt: session.closesAt,
      },
      votes: session.votes.map((v) => ({
        member: v.member,
        choice: v.choice,
        weight: Number(v.weight),
        signedMessage: v.signedMessage,
        signature: v.signature,
        castAt: v.createdAt,
      })),
      tally: tally(session.votes.map((v) => ({ choice: v.choice, weight: Number(v.weight) }))),
      outcome: session.outcome,
      closedAt: session.closedAt,
    },
  };
}

export type DecisionDocument = NonNullable<
  Extract<Awaited<ReturnType<typeof decisionDocument>>, { finalized: true }>["document"]
>;

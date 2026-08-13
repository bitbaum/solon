import { prisma } from "@/lib/db";

export interface TransparencyEvidence {
  organization: {
    id: string;
    name: string;
  };
  treasury: {
    transactionCount: number;
    recordedNetTotalSats: string;
  };
  governance: {
    decisionCount: number;
    votingSessionCount: number;
    voteCount: number;
  };
}

/**
 * Return auditable source facts, not an opaque or normative "transparency score".
 * A missing organization is distinct from an organization with no activity.
 */
export async function readTransparencyEvidence(orgId: string): Promise<TransparencyEvidence | null> {
  const organization = await prisma.organizations.findUnique({
    where: { id: orgId },
    select: { id: true, name: true },
  });
  if (!organization) return null;

  const [treasury, decisionCount, votingSessionCount, voteCount] = await Promise.all([
    prisma.bitcoin_transactions.aggregate({
      where: { organization_id: orgId },
      _count: { _all: true },
      _sum: { amount_sats: true },
    }),
    prisma.decisions.count({ where: { organization_id: orgId } }),
    prisma.voting_sessions.count({ where: { organization_id: orgId } }),
    prisma.votes.count({ where: { voting_session: { organization_id: orgId } } }),
  ]);

  return {
    organization,
    treasury: {
      transactionCount: treasury._count._all,
      recordedNetTotalSats: (treasury._sum.amount_sats ?? 0n).toString(),
    },
    governance: {
      decisionCount,
      votingSessionCount,
      voteCount,
    },
  };
}

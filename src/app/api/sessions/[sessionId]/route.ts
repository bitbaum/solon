import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sessionTally } from "@/lib/domain/voting";

/** Public read: a voting session, its snapshotted rules, and the live tally. */
export async function GET(_: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  const params = await ctx.params;
  const session = await prisma.votingSession.findUnique({
    where: { id: params.sessionId },
    include: {
      proposal: {
        select: { id: true, title: true, category: true, policyKey: true, contentHash: true, status: true },
      },
    },
  });
  if (!session) return NextResponse.json({ error: "voting session not found" }, { status: 404 });

  return NextResponse.json({
    id: session.id,
    status: session.status,
    opensAt: session.opensAt,
    closesAt: session.closesAt,
    electorate: session.electorate,
    threshold: session.threshold,
    quorumPercent: session.quorumPercent,
    eligibleCount: session.eligibleCount,
    eligibleWeight: Number(session.eligibleWeight),
    outcome: session.outcome,
    proposal: session.proposal,
    tally: await sessionTally(session.id),
  });
}

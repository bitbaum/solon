import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { closeSession } from "@/lib/domain/voting";
import { emitDecisionFinalized } from "@/lib/webhooks";

/**
 * Close a session and decide its outcome from the rules snapshotted at open.
 * Permissionless but time-gated: the domain layer refuses to close while the
 * voting window is open unless every eligible member has already voted, so
 * nobody can slam the door on a tally they like.
 *
 * On close, `decision.finalized` is emitted to the configured webhook (a
 * doorbell — consumers fetch and re-verify the decision document themselves).
 */
export async function POST(_: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  const params = await ctx.params;
  try {
    const result = await closeSession(params.sessionId);

    const proposal = await prisma.proposal.findFirst({
      where: { session: { id: params.sessionId } },
      include: { organization: { select: { id: true, slug: true } } },
    });
    if (proposal) {
      await emitDecisionFinalized({
        decision_id: params.sessionId,
        org_id: proposal.organization.id,
        org_slug: proposal.organization.slug,
        target: proposal.target,
        content_hash: proposal.contentHash,
        outcome: result.outcome,
      });
    }

    return NextResponse.json({ closed: true, outcome: result.outcome, tally: result.tally });
  } catch (e) {
    const message = e instanceof Error ? e.message : "failed to close session";
    return NextResponse.json({ closed: false, error: message }, { status: message.includes("not found") ? 404 : 409 });
  }
}

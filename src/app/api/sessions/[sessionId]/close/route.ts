import { NextResponse } from "next/server";
import { closeSession } from "@/lib/domain/voting";

/**
 * Close a session and decide its outcome from the rules snapshotted at open.
 * Permissionless but time-gated: the domain layer refuses to close while the
 * voting window is open unless every eligible member has already voted, so
 * nobody can slam the door on a tally they like.
 */
export async function POST(_: Request, { params }: { params: { sessionId: string } }) {
  try {
    const result = await closeSession(params.sessionId);
    return NextResponse.json({ closed: true, outcome: result.outcome, tally: result.tally });
  } catch (e) {
    const message = e instanceof Error ? e.message : "failed to close session";
    return NextResponse.json({ closed: false, error: message }, { status: message.includes("not found") ? 404 : 409 });
  }
}

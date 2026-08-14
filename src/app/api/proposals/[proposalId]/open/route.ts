import { NextResponse } from "next/server";
import { openSession } from "@/lib/domain/voting";

/**
 * Open the voting session for a DRAFT proposal. Deliberately permissionless
 * in v1: the proposal is already signed and public, opening only starts the
 * clock, and it can happen exactly once (one session per proposal). The
 * rules — electorate, threshold, quorum, eligibility — are snapshotted here.
 */
export async function POST(_: Request, { params }: { params: { proposalId: string } }) {
  try {
    const session = await openSession(params.proposalId);
    return NextResponse.json({ opened: true, session }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "failed to open session";
    return NextResponse.json({ opened: false, error: message }, { status: message.includes("not found") ? 404 : 409 });
  }
}

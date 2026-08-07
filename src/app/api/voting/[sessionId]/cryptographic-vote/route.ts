import { NextResponse } from "next/server";
import { submitVote, sessionTally, type SubmitVoteInput } from "@/lib/domain/voting";

const CHOICES = ["yes", "no", "abstain"] as const;

/**
 * Cast a cryptographically-signed vote. The body must carry the member's
 * Bitcoin address and a Bitcoin signed-message signature over the canonical
 * vote message (see lib/bitcoin/message.ts). The server verifies the
 * signature; an invalid one is rejected and never stored.
 *
 * Body: { choice: 'yes'|'no'|'abstain', address: string, signature: string }
 */
export async function POST(req: Request, { params }: { params: { sessionId: string } }) {
  const { sessionId } = params;
  const body = await req.json().catch(() => ({}));
  const { choice, address, signature } = (body ?? {}) as Partial<SubmitVoteInput>;

  if (!choice || !address || !signature) {
    return NextResponse.json({ error: "choice, address and signature are required" }, { status: 400 });
  }
  if (!CHOICES.includes(choice)) {
    return NextResponse.json({ error: `choice must be one of ${CHOICES.join(", ")}` }, { status: 400 });
  }

  const result = await submitVote(sessionId, { address, choice, signature });

  if (!result.stored) {
    // 401 when the signature itself failed; 422 when it verified but the
    // voter/session wasn't eligible.
    return NextResponse.json(result, { status: result.verified ? 422 : 401 });
  }
  return NextResponse.json(result);
}

export async function GET(_: Request, { params }: { params: { sessionId: string } }) {
  const tally = await sessionTally(params.sessionId);
  return NextResponse.json({ sessionId: params.sessionId, tally });
}

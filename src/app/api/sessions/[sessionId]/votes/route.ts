import { NextResponse } from "next/server";
import { z } from "zod";
import { submitVote } from "@/lib/domain/voting";

const BodySchema = z.object({
  choice: z.enum(["yes", "no", "abstain"]),
  address: z.string().min(20).max(90),
  signature: z.string().min(1).max(200),
});

/**
 * Cast a cryptographically-signed vote. The body carries the member's Bitcoin
 * address and a Bitcoin signed-message signature over the canonical vote
 * message (see lib/bitcoin/message.ts). The server verifies the signature; an
 * invalid one is rejected and never stored. No transport auth: the signature
 * IS the authorization, and votes are public record anyway.
 */
export async function POST(req: Request, { params }: { params: { sessionId: string } }) {
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid request body", details: z.flattenError(parsed.error).fieldErrors },
      { status: 400 },
    );
  }

  const result = await submitVote(params.sessionId, parsed.data);
  if (!result.stored) {
    // 401 when the signature itself failed; 422 when it verified but the
    // voter/session wasn't eligible.
    return NextResponse.json(result, { status: result.verified ? 422 : 401 });
  }
  return NextResponse.json(result);
}

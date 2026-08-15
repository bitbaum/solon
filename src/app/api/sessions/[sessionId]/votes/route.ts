import { NextResponse } from "next/server";
import { z } from "zod";
import { submitVote } from "@/lib/domain/voting";

/**
 * The ballot is validated against the session's method downstream, not here —
 * this layer cannot know whether the session expects a yes/no, a ranking or a
 * dot allocation. Accepting it as unknown and letting the method's own schema
 * reject it keeps one validator per method instead of a second copy that drifts.
 *
 * `choice` is still accepted so a client that predates methods keeps working;
 * it is folded into a single-choice ballot below.
 */
const BodySchema = z.object({
  ballot: z.unknown().optional(),
  choice: z.enum(["yes", "no", "abstain"]).optional(),
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
export async function POST(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  const params = await ctx.params;
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid request body", details: z.flattenError(parsed.error).fieldErrors },
      { status: 400 },
    );
  }

  const { ballot, choice, address, signature } = parsed.data;
  const effectiveBallot = ballot ?? (choice ? { method: "single_choice", choice } : undefined);
  if (effectiveBallot === undefined) {
    return NextResponse.json({ error: "a ballot is required" }, { status: 400 });
  }

  const result = await submitVote(params.sessionId, { address, signature, ballot: effectiveBallot });
  if (!result.stored) {
    // 401 when the signature itself failed; 422 when it verified but the
    // voter/session wasn't eligible.
    return NextResponse.json(result, { status: result.verified ? 422 : 401 });
  }
  return NextResponse.json(result);
}

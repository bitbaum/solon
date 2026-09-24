import { NextResponse } from "next/server";
import { z } from "zod";
import { submitVote } from "@/lib/domain/voting";
import { auth } from "@/lib/auth";
import { resolveActor, selfOriginOf } from "@/lib/auth/actor";

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
  address: z.string().min(20).max(90).optional(),
  signature: z.string().min(1).max(200).optional(),
});

/**
 * Cast (or change) a vote. With `address` + `signature` the vote is signed:
 * the server verifies the Bitcoin signature over the canonical vote message
 * (lib/bitcoin/message.ts), no session needed. Without them, the signed-in
 * member votes with one click — see lib/auth/actor.ts.
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

  const who = resolveActor({
    key: { address, signature },
    sessionActorId: address || signature ? null : (await auth())?.actorId,
    requestOrigin: req.headers.get("origin"),
    selfOrigin: selfOriginOf(req),
  });
  if (!who.ok) {
    return NextResponse.json(
      { stored: false, verified: false, reason: who.reason },
      { status: who.status },
    );
  }

  const result = await submitVote(params.sessionId, { by: who.actor, ballot: effectiveBallot });
  if (!result.stored) {
    // 401 when the signature itself failed; 422 when it verified but the
    // voter/session wasn't eligible.
    return NextResponse.json(result, { status: result.verified ? 422 : 401 });
  }
  return NextResponse.json(result);
}

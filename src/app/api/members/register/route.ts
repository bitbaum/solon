import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { registerMember } from "@/lib/domain/membership";

const BodySchema = z.object({
  orgSlug: z.string().min(1).max(100),
  displayName: z.string().min(2).max(80),
  address: z.string().min(20).max(90),
  signature: z.string().min(1).max(200),
});

/**
 * Claim a member seat by proving control of a Bitcoin key.
 *
 * Two credentials are required and neither substitutes for the other: an
 * OrangeCat session (who you are) and a Bitcoin signature (which key is
 * yours). The actor id is read from the session and never from the body —
 * accepting it as input would let a caller bind their own key to somebody
 * else's identity, which is the whole property the roster depends on.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.actorId) {
    return NextResponse.json(
      { registered: false, verified: false, reason: "sign in with OrangeCat first" },
      { status: 401 },
    );
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid request body", details: z.flattenError(parsed.error).fieldErrors },
      { status: 400 },
    );
  }

  const result = await registerMember({
    orgSlug: parsed.data.orgSlug,
    actorId: session.actorId,
    displayName: parsed.data.displayName,
    memberAddress: parsed.data.address,
    signature: parsed.data.signature,
  });

  if (!result.registered) {
    // 401 when the signature itself failed; 409 when it verified but the seat
    // or the identity was already taken.
    return NextResponse.json(result, { status: result.verified ? 409 : 401 });
  }
  return NextResponse.json(result, { status: 201 });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { registerMember } from "@/lib/domain/membership";
import { isSameOrigin } from "@/lib/auth/actor";

const BodySchema = z.object({
  orgSlug: z.string().min(1).max(100),
  displayName: z.string().min(2).max(80),
  address: z.string().min(20).max(90).optional(),
  signature: z.string().min(1).max(200).optional(),
});

/**
 * Claim a member seat. An OrangeCat session (who you are) is required and is
 * enough; a Bitcoin key (address + signature) is optional, for members who
 * want to sign their acts. The actor id is read from the session and never
 * from the body — accepting it as input would let a caller bind a seat or a
 * key to somebody else's identity, which is the whole property the roster
 * depends on.
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

  const { address, signature } = parsed.data;
  if (Boolean(address) !== Boolean(signature)) {
    return NextResponse.json(
      {
        registered: false,
        verified: false,
        reason: "a key needs both the address and the signature",
      },
      { status: 400 },
    );
  }
  if (!address && !isSameOrigin(req)) {
    return NextResponse.json(
      { registered: false, verified: false, reason: "this request did not come from Solon" },
      { status: 403 },
    );
  }

  const result = await registerMember({
    orgSlug: parsed.data.orgSlug,
    actorId: session.actorId,
    displayName: parsed.data.displayName,
    key: address && signature ? { address, signature } : null,
  });

  if (!result.registered) {
    // 401 when the signature itself failed; 409 when it verified but the seat
    // or the identity was already taken.
    return NextResponse.json(result, { status: result.verified ? 409 : 401 });
  }
  return NextResponse.json(result, { status: 201 });
}

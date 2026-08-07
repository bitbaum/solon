import { NextResponse } from "next/server";
import { z } from "zod";
import { DecisionCategory } from "@prisma/client";
import { createProposal } from "@/lib/domain/proposals";

const BodySchema = z.object({
  orgSlug: z.string().min(1).max(100),
  category: z.enum(DecisionCategory),
  title: z.string().min(3).max(200),
  body: z.string().min(1).max(20000),
  policyKey: z.string().min(1).max(100).optional(),
  proposedContent: z.unknown().optional(),
  target: z.string().max(200).optional(),
  proposerAddress: z.string().min(20).max(90),
  signature: z.string().min(1).max(200),
});

/**
 * File a proposal. Authorization is the Bitcoin signature over
 * proposalMessage() — see lib/domain/proposals.ts. Agent members must also
 * present their transport API key as `Authorization: Bearer sk_solon_…`.
 */
export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid request body", details: z.flattenError(parsed.error).fieldErrors },
      { status: 400 },
    );
  }

  const auth = req.headers.get("authorization");
  const apiKey = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length) : null;

  const result = await createProposal({ ...parsed.data, apiKey });
  if (!result.created) {
    // 401 when the signature itself failed; 422 when it verified but the
    // proposer/org/key wasn't eligible.
    return NextResponse.json(result, { status: result.verified ? 422 : 401 });
  }
  return NextResponse.json(result, { status: 201 });
}

import { NextResponse } from "next/server";
import { decisionDocument } from "@/lib/domain/decision";

export const dynamic = "force-dynamic";

/**
 * The keystone read: a finalized decision as a self-verifying document.
 * Consumers re-verify every signature and recompute the tally locally —
 * this endpoint is evidence, not authority.
 */
export async function GET(_: Request, { params }: { params: { sessionId: string } }) {
  const result = await decisionDocument(params.sessionId);
  if (!result.found) return NextResponse.json({ error: result.reason }, { status: 404 });
  if (!result.finalized) return NextResponse.json({ error: result.reason }, { status: 409 });
  return NextResponse.json(result.document);
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { SignedFields, actorFor, answerError, invalidBody } from "@/lib/law/amend/http";
import { recordSupport } from "@/lib/law/amend/store";

export const dynamic = "force-dynamic";

const SupportSchema = z.object({
  revision: z.number().int().min(1),
  kind: z.enum(["support", "withdraw"]).default("support"),
  ...SignedFields,
});

/**
 * Stand behind one revision, or stop. Both are new rows; the latest counts.
 * Signed over amendmentMessage(act: kind), or by the signed-in account.
 * Answers with the revision's support as it now stands.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const parsed = SupportSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return invalidBody(parsed.error);
  const who = await actorFor(req, parsed.data);
  if (!who.ok) return who.response;
  try {
    const support = await recordSupport(db, {
      actor: who.actor,
      amendmentId: id,
      revision: parsed.data.revision,
      kind: parsed.data.kind,
    });
    return NextResponse.json({ support });
  } catch (error) {
    return answerError(error);
  }
}

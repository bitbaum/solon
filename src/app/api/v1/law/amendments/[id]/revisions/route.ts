import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { SignedFields, actorFor, answerError, invalidBody } from "@/lib/law/amend/http";
import { reviseAmendment } from "@/lib/law/amend/store";

export const dynamic = "force-dynamic";

const ReviseSchema = z.object({
  lang: z.string().min(2).max(20),
  title: z.string().min(1).max(200),
  rationale: z.string().max(20_000).default(""),
  changes: z.unknown(),
  ...SignedFields,
});

/**
 * The author files the next revision, written against the text in force now.
 * Support given to earlier revisions stays with them. Anyone else forks
 * instead (POST /api/v1/law/amendments with `forkOf`).
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const parsed = ReviseSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return invalidBody(parsed.error);
  const who = await actorFor(req, parsed.data);
  if (!who.ok) return who.response;
  try {
    const revised = await reviseAmendment(db, {
      amendmentId: id,
      actor: who.actor,
      lang: parsed.data.lang,
      title: parsed.data.title,
      rationale: parsed.data.rationale,
      changes: parsed.data.changes,
    });
    return NextResponse.json(revised, { status: 201 });
  } catch (error) {
    return answerError(error);
  }
}

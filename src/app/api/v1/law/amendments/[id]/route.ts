import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { loadAmendment } from "@/lib/law/amend/store";

export const dynamic = "force-dynamic";

/**
 * One amendment: every revision with its content hash and support, whether its
 * latest still fits the law in force, and that revision's effect on the act
 * with a word-by-word redline per changed provision.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const amendment = await loadAmendment(db, id);
  if (!amendment) return NextResponse.json({ error: "no such amendment" }, { status: 404 });
  return NextResponse.json({ amendment });
}

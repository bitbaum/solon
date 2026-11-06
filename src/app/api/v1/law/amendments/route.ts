import { NextResponse } from "next/server";
import { z } from "zod";
import { LAW_AUTHORITIES } from "@/lib/config/law";
import { db } from "@/lib/db/client";
import { SignedFields, actorFor, answerError, invalidBody } from "@/lib/law/amend/http";
import { fileAmendment, listAmendments } from "@/lib/law/amend/store";

export const dynamic = "force-dynamic";

/**
 * Amendments to the law (design: docs/design/2026-11-amending-the-law.md).
 * `?authority=` an authority key, `?act=` an act id; newest first, each with
 * its latest revision and the support behind it.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const authority = params.get("authority") ?? undefined;
  const actId = params.get("act") ?? undefined;
  if (authority && !LAW_AUTHORITIES.some((a) => a.key === authority)) {
    return NextResponse.json({ error: "authority is not a known authority key" }, { status: 400 });
  }
  const limit = Number(params.get("limit") ?? 50);
  return NextResponse.json({
    amendments: await listAmendments(db, {
      authority,
      actId,
      limit: Number.isFinite(limit) ? limit : 50,
    }),
  });
}

const FileSchema = z.object({
  /** Chosen by the client, so a signer can name the amendment in what they sign. */
  id: z.uuid(),
  act: z.string().min(1).max(100),
  lang: z.string().min(2).max(20),
  title: z.string().min(1).max(200),
  rationale: z.string().max(20_000).default(""),
  changes: z.unknown(),
  /** A revision id: file this as a fork of it. */
  forkOf: z.string().min(1).max(100).optional(),
  ...SignedFields,
});

/**
 * File an amendment (revision 1), or a fork of another's revision. Signed
 * with `address` + `signature` over amendmentMessage(act: "file"), or by the
 * signed-in account on a request from Solon's own pages.
 */
export async function POST(req: Request) {
  const parsed = FileSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return invalidBody(parsed.error);
  const who = await actorFor(req, parsed.data);
  if (!who.ok) return who.response;
  try {
    const filed = await fileAmendment(db, {
      id: parsed.data.id,
      actor: who.actor,
      actId: parsed.data.act,
      lang: parsed.data.lang,
      title: parsed.data.title,
      rationale: parsed.data.rationale,
      changes: parsed.data.changes,
      forkOf: parsed.data.forkOf,
    });
    return NextResponse.json(filed, { status: 201 });
  } catch (error) {
    return answerError(error);
  }
}

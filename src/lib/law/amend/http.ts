/**
 * The API's side of the amendment engine: who is acting, and how a refusal is
 * answered. One place, so every amendment route resolves identity and errors
 * the same way (design: docs/design/2026-11-amending-the-law.md, "Interfaces").
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { resolveActor, selfOriginOf } from "@/lib/auth/actor";
import type { Actor } from "@/lib/domain/proof";
import { AmendmentError } from "./store";

/** The optional key fields every write accepts; without them the signed-in account acts. */
export const SignedFields = {
  address: z.string().min(20).max(90).optional(),
  signature: z.string().min(1).max(200).optional(),
};

/** Who is acting on this request, or the response that says why nobody is. */
export async function actorFor(
  req: Request,
  key: { address?: string; signature?: string },
): Promise<{ ok: true; actor: Actor } | { ok: false; response: NextResponse }> {
  const signed = Boolean(key.address || key.signature);
  const who = resolveActor({
    key,
    sessionActorId: signed ? null : (await auth())?.actorId,
    requestOrigin: req.headers.get("origin"),
    selfOrigin: selfOriginOf(req),
  });
  if (!who.ok) {
    return {
      ok: false,
      response: NextResponse.json({ error: who.reason }, { status: who.status }),
    };
  }
  return { ok: true, actor: who.actor };
}

/** A body that failed its schema, answered with what was wrong. */
export const invalidBody = (error: z.ZodError) =>
  NextResponse.json(
    { error: "invalid request body", details: z.flattenError(error).fieldErrors },
    { status: 400 },
  );

/** An engine refusal as its status and words; anything else is a 500 that says nothing internal. */
export function answerError(error: unknown): NextResponse {
  if (error instanceof AmendmentError) {
    return NextResponse.json(
      { error: error.message, problems: error.problems },
      { status: error.status },
    );
  }
  console.error("amendment request failed", error);
  return NextResponse.json({ error: "the amendment could not be recorded" }, { status: 500 });
}

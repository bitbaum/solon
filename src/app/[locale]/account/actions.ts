"use server";

import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { members } from "@/lib/db/schema";

/**
 * Whether one of the signed-in person's own seats lists each ballot on its
 * member page. The WHERE clause names the actor as well as the seat, so a
 * forged `memberId` for someone else's seat changes nothing.
 */
export async function setShowBallots(formData: FormData) {
  const session = await auth();
  if (!session?.actorId) return;
  const memberId = formData.get("memberId");
  if (typeof memberId !== "string" || memberId === "") return;
  await db
    .update(members)
    .set({ showBallots: formData.get("show") === "1" })
    .where(and(eq(members.id, memberId), eq(members.ocActorId, session.actorId)));
}

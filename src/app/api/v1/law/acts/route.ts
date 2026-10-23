import { NextResponse } from "next/server";
import { LAW_AUTHORITIES } from "@/lib/config/law";
import { db } from "@/lib/db/client";
import { searchActs } from "@/lib/law/register/coverage";

export const dynamic = "force-dynamic";

/**
 * Acts in the register. `?authority=` is an authority key, `?number=` an exact
 * systematic number, `?title=` a fragment of the title, `?inForce=1` leaves out
 * acts the register no longer calls in force. Names and numbers only: the text
 * of the law is not held yet.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const authority = params.get("authority") ?? undefined;
  const number = params.get("number")?.trim().slice(0, 40) || undefined;
  const title = params.get("title")?.trim().slice(0, 100) || undefined;
  if (authority && !LAW_AUTHORITIES.some((a) => a.key === authority)) {
    return NextResponse.json({ error: "authority is not a known authority key" }, { status: 400 });
  }
  if (!authority && !number && !title) {
    return NextResponse.json(
      { error: "give at least one of authority, number or title" },
      { status: 400 },
    );
  }
  const acts = await searchActs(db, {
    authority,
    number,
    title,
    inForceOnly: params.get("inForce") === "1",
  });
  return NextResponse.json({ acts });
}

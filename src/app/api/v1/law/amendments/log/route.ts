import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { readLog } from "@/lib/law/amend/store";

export const dynamic = "force-dynamic";

/**
 * The chained log of every act on every amendment, from `?after=` (a sequence
 * number; 0 from the start). Each event carries the hash of the one before it,
 * so anyone can recompute the chain (verifyChain in src/lib/law/amend/hash.ts)
 * and tell whether an event was removed or altered.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const after = Number(params.get("after") ?? 0);
  if (!Number.isInteger(after) || after < 0) {
    return NextResponse.json({ error: "after is a sequence number, 0 or more" }, { status: 400 });
  }
  const events = await readLog(db, after, Number(params.get("limit") ?? 500) || 500);
  return NextResponse.json({ events, next: events.at(-1)?.seq ?? after });
}

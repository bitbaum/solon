import { NextResponse } from "next/server";
import { LAW_AUTHORITIES } from "@/lib/config/law";
import { db } from "@/lib/db/client";
import { searchProvisions } from "@/lib/law/search";

export const dynamic = "force-dynamic";

/**
 * The provisions that match `?q=`, ranked, from the versions in force. `?authority=`
 * narrows to one authority key (ch, zh, li …), `?lang=` to one language, `?limit=`
 * (at most 50). Each hit names the act, the anchor, the publisher's page and the
 * hash of the copy, so an answer built on it can cite exactly what it read.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const q = params.get("q") ?? "";
  const authority = params.get("authority") ?? undefined;
  const lang = params.get("lang") ?? undefined;
  const limit = Number.parseInt(params.get("limit") ?? "10", 10) || 10;
  if (!q.trim()) return NextResponse.json({ error: "q is required" }, { status: 400 });
  if (authority && !LAW_AUTHORITIES.some((a) => a.key === authority))
    return NextResponse.json({ error: "unknown authority" }, { status: 400 });
  if (lang && !/^[a-z]{2}$/.test(lang))
    return NextResponse.json({ error: "lang is two letters" }, { status: 400 });
  const hits = await searchProvisions(db, { q, authority, lang, limit });
  return NextResponse.json({ query: q, hits });
}

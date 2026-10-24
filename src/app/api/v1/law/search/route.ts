import { NextResponse } from "next/server";
import { LAW_AUTHORITIES } from "@/lib/config/law";
import { db } from "@/lib/db/client";
import { searchProvisions } from "@/lib/law/search";

export const dynamic = "force-dynamic";

/**
 * The provisions that match, ranked, from the versions in force. Either `?q=` (a
 * phrase; all its words) or `?terms=` (comma-separated stems as the law words
 * them, any of which may match: `Fuchs,Wildtier,Bewilligung`). `?authority=`
 * narrows to one authority key or several, comma-separated (`ch,gr`), `?lang=`
 * to one language, `?limit=` (at most 50). Each hit names the act, the anchor, the
 * text, the publisher's page and the hash of the copy, so an answer built on it
 * can cite exactly what it read.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const q = params.get("q") ?? "";
  const terms = (params.get("terms") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 20);
  const authorities = (params.get("authority") ?? "")
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);
  const lang = params.get("lang") ?? undefined;
  const limit = Number.parseInt(params.get("limit") ?? "10", 10) || 10;
  if (!q.trim() && terms.length === 0)
    return NextResponse.json({ error: "q or terms is required" }, { status: 400 });
  if (authorities.some((key) => !LAW_AUTHORITIES.some((a) => a.key === key)))
    return NextResponse.json({ error: "unknown authority" }, { status: 400 });
  if (lang && !/^[a-z]{2}$/.test(lang))
    return NextResponse.json({ error: "lang is two letters" }, { status: 400 });
  const hits = await searchProvisions(db, {
    q: terms.length ? undefined : q,
    terms: terms.length ? terms : undefined,
    authorities,
    lang,
    limit,
  });
  return NextResponse.json({ query: terms.length ? terms : q, hits });
}

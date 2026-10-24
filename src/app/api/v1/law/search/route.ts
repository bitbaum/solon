import { NextResponse } from "next/server";
import { LAW_AUTHORITIES } from "@/lib/config/law";
import { db } from "@/lib/db/client";
import { searchProvisions } from "@/lib/law/search";

export const dynamic = "force-dynamic";

/**
 * The provisions that match, ranked, from the versions in force. Either `?q=` (a
 * phrase; all its words) or `?terms=` (comma-separated stems as the law words
 * them, any of which may match: `Fuchs,Wildtier,Bewilligung`) or `?groups=` (ideas
 * separated by `|`, alternatives within an idea by `,`: `Fuchs,Wildtier|Haltung,Bewilligung`;
 * provisions that contain every idea come first, then the first idea alone, then any
 * word). `?authority=`
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
  const groups = (params.get("groups") ?? "")
    .split("|")
    .map((group) =>
      group
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 8),
    )
    .filter((group) => group.length > 0)
    .slice(0, 5);
  const authorities = (params.get("authority") ?? "")
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);
  const lang = params.get("lang") ?? undefined;
  const limit = Number.parseInt(params.get("limit") ?? "10", 10) || 10;
  if (!q.trim() && terms.length === 0 && groups.length === 0)
    return NextResponse.json({ error: "q, terms or groups is required" }, { status: 400 });
  if (authorities.some((key) => !LAW_AUTHORITIES.some((a) => a.key === key)))
    return NextResponse.json({ error: "unknown authority" }, { status: 400 });
  if (lang && !/^[a-z]{2}$/.test(lang))
    return NextResponse.json({ error: "lang is two letters" }, { status: 400 });
  const hits = await searchProvisions(db, {
    q: terms.length || groups.length ? undefined : q,
    terms: terms.length && !groups.length ? terms : undefined,
    groups: groups.length ? groups : undefined,
    authorities,
    lang,
    limit,
  });
  return NextResponse.json({ query: groups.length ? groups : terms.length ? terms : q, hits });
}

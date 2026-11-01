import { NextResponse } from "next/server";
import { LAW_AUTHORITIES } from "@/lib/config/law";
import { db } from "@/lib/db/client";
import { loadLawChanges } from "@/lib/law/register/changes";

export const dynamic = "force-dynamic";

/**
 * What changed in the law Solon holds since a day: `?since=YYYY-MM-DD` (a week
 * ago by default), `?authority=` one key or several, comma-separated, `?limit=`
 * (at most 1000). Each change is `new`, `amended` or `repealed`, with the day the
 * text applies from, how that day is known, and when Solon recorded it.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  const since = params.get("since") ?? weekAgo;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(since))
    return NextResponse.json({ error: "since is an ISO date" }, { status: 400 });
  const authorities = (params.get("authority") ?? "")
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);
  if (authorities.some((key) => !LAW_AUTHORITIES.some((a) => a.key === key)))
    return NextResponse.json({ error: "unknown authority" }, { status: 400 });
  const limit = Number.parseInt(params.get("limit") ?? "100", 10) || 100;
  const changes = await loadLawChanges(db, { since, authorities, limit });
  return NextResponse.json({ since, changes });
}

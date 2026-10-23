import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { readProvision } from "@/lib/law/register/coverage";

export const dynamic = "force-dynamic";

/**
 * One provision of an act as it stood on a day. `?act=` is the act's id from
 * `/api/v1/law/acts`, `?path=` the publisher's anchor (art_270_b), `?lang=` the
 * language of the text (de, fr, it), `?on=` an ISO date (today by default). The
 * answer carries the publisher's URL and the sha256 of the page it was read from.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const actId = params.get("act") ?? "";
  const path = params.get("path") ?? "";
  const lang = params.get("lang") ?? "de";
  const on = params.get("on") ?? new Date().toISOString().slice(0, 10);
  if (!/^[0-9a-f-]{36}$/.test(actId) || !/^[A-Za-z0-9_.-]{1,80}$/.test(path)) {
    return NextResponse.json(
      { error: "act must be an act id and path an anchor like art_270_b" },
      { status: 400 },
    );
  }
  if (!/^[a-z]{2}$/.test(lang) || !/^\d{4}-\d{2}-\d{2}$/.test(on)) {
    return NextResponse.json({ error: "lang is two letters and on an ISO date" }, { status: 400 });
  }
  const provision = await readProvision(db, { actId, path, lang, on });
  if (!provision)
    return NextResponse.json({ error: "no such provision on that day" }, { status: 404 });
  return NextResponse.json(provision);
}

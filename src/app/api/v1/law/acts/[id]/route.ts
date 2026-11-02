import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { actToMarkdown } from "@/lib/law/markdown";
import { loadActView } from "@/lib/law/view";

export const dynamic = "force-dynamic";

import { SITE } from "@/lib/law/site";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * One whole act. JSON by default; `?format=md` (or `Accept: text/markdown`) gives
 * Markdown with the provenance as front matter. `?lang=` asks for a language
 * (the act's own is read when it has none in that one).
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "not an act id" }, { status: 400 });
  const url = new URL(request.url);
  const lang = /^[a-z]{2}$/.test(url.searchParams.get("lang") ?? "")
    ? url.searchParams.get("lang")!
    : "de";
  const act = await loadActView(db, { id, lang, page: 1, all: true });
  if (!act) return NextResponse.json({ error: "no such act" }, { status: 404 });
  const markdown =
    url.searchParams.get("format") === "md" ||
    request.headers.get("accept")?.includes("text/markdown");
  if (markdown) {
    return new NextResponse(actToMarkdown(act, SITE), {
      headers: { "Content-Type": "text/markdown; charset=utf-8" },
    });
  }
  return NextResponse.json({ ...act, solonUrl: `${SITE}/law/${act.id}` });
}

import { NextResponse } from "next/server";
import { toLocale } from "@/i18n/routing";
import { placesConfig } from "@/lib/config/places";
import { db } from "@/lib/db/client";
import { loadPlacePage } from "@/lib/places/place-page";

export const dynamic = "force-dynamic";

/**
 * One official place by its path, as its page shows it: what it is part of,
 * whether it levies tax, its names and identifiers, and the source behind
 * each. `?locale=` and `?on=` as for the search.
 */
export async function GET(request: Request, ctx: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await ctx.params;
  const params = new URL(request.url).searchParams;
  const on = params.get("on") ?? new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(on)) {
    return NextResponse.json({ error: "on must be an ISO date" }, { status: 400 });
  }
  const slugPath = slug.map(decodeURIComponent).join("/");
  const view = await loadPlacePage(
    db,
    placesConfig,
    slugPath,
    on,
    toLocale(params.get("locale") ?? "en"),
  );
  if (!view) {
    return NextResponse.json({ error: `no place at ${slugPath}` }, { status: 404 });
  }
  const { id: _, ...place } = view;
  return NextResponse.json({ on, ...place, path: `/places/${view.slugPath}` });
}

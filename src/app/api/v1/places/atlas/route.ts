import { NextResponse } from "next/server";
import { toLocale } from "@/i18n/routing";
import { placesConfig } from "@/lib/config/places";
import { db } from "@/lib/db/client";
import { loadAtlasPlace } from "@/lib/places/atlas-place";

export const dynamic = "force-dynamic";

/**
 * One place for the map: what it is part of, its own outline, the places
 * directly inside it and theirs. `?place=` is its path (`united_states/wyoming`,
 * with or without the leading `/places/`), `?locale=` and `?on=` as for the search.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const on = params.get("on") ?? new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(on)) {
    return NextResponse.json({ error: "on must be an ISO date" }, { status: 400 });
  }
  const path = (params.get("place") ?? "").replace(/^\/?(places\/)?/, "").replace(/\/$/, "");
  if (!path) {
    return NextResponse.json({ error: "place is required" }, { status: 400 });
  }
  const atlas = await loadAtlasPlace(
    db,
    placesConfig,
    path,
    on,
    toLocale(params.get("locale") ?? "en"),
  );
  if (!atlas) {
    return NextResponse.json({ error: `no place at ${path}` }, { status: 404 });
  }
  return NextResponse.json(atlas, {
    headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
  });
}

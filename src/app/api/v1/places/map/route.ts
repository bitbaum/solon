import { NextResponse } from "next/server";
import { toLocale } from "@/i18n/routing";
import { placesConfig } from "@/lib/config/places";
import { db } from "@/lib/db/client";
import { loadMapData } from "@/lib/places/map-data";

export const dynamic = "force-dynamic";

/**
 * What the map on /places draws (design §9.1): every place of a pack a
 * boundary file draws, with the facts its tax model reads along each chain, so
 * the browser estimates the tax at the reader's income for all of them.
 * `?pack=` (the first pack by default), `?locale=`, `?on=` an ISO date (today
 * by default), `?level=` a level other than the one most areas draw.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const pack = params.get("pack") ?? placesConfig.packs[0]?.key ?? "";
  const on = params.get("on") ?? new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(on)) {
    return NextResponse.json({ error: "on must be an ISO date" }, { status: 400 });
  }
  const locale = toLocale(params.get("locale") ?? "en");
  const data = await loadMapData(
    db,
    placesConfig,
    pack,
    on,
    locale,
    params.get("level") ?? undefined,
  );
  if (!data) {
    return NextResponse.json({ error: `no map for pack "${pack}"` }, { status: 404 });
  }
  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
  });
}

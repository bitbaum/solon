import { NextResponse } from "next/server";
import { toLocale } from "@/i18n/routing";
import { placesConfig } from "@/lib/config/places";
import { db } from "@/lib/db/client";
import { searchPlaces } from "@/lib/places/search";

export const dynamic = "force-dynamic";

/**
 * Places by postcode or name (design §9.2), the search behind `/places`.
 * `?q=` is the query, `?locale=` the language of names and levels, `?on=` an
 * ISO date (today by default). A postcode spanning several places returns each,
 * with its localities' share of addresses; the caller asks its reader.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const q = (params.get("q") ?? "").trim().slice(0, 100);
  const on = params.get("on") ?? new Date().toISOString().slice(0, 10);
  if (!q) {
    return NextResponse.json({ error: "q is required: a name or a postcode" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(on)) {
    return NextResponse.json({ error: "on must be an ISO date" }, { status: 400 });
  }
  const locale = toLocale(params.get("locale") ?? "en");
  const search = await searchPlaces(db, placesConfig, q, on, locale);
  return NextResponse.json({
    query: q,
    on,
    kind: search.kind,
    places: search.hits.map((hit) => ({ ...hit, path: `/places/${hit.slugPath}` })),
  });
}

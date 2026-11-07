import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { loadGlobePlaces } from "@/lib/law/globe";

export const dynamic = "force-dynamic";

/**
 * The places on the law globe: for each, the feature that draws it in the
 * public-domain outline files (Natural Earth's countries, the Census Bureau's
 * states), the law authority it opens, and how many acts in force Solon holds
 * the text of there. Public, cacheable.
 */
export async function GET() {
  return NextResponse.json(
    { places: await loadGlobePlaces(db) },
    { headers: { "Cache-Control": "public, max-age=600, stale-while-revalidate=3600" } },
  );
}

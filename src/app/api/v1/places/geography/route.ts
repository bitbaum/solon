import { NextResponse } from "next/server";
import { placesConfig } from "@/lib/config/places";
import { db } from "@/lib/db/client";
import { geographyManifest } from "@/lib/places/geography";
import { defaultGeometryStore } from "@/lib/places/importer/geometry-store";

export const dynamic = "force-dynamic";

/**
 * The geography manifest (design §4.4, §9.1): every boundary file the current
 * places are drawn from, in @bitbaum/geo-kit's format, so a map asks for the
 * layers and dates it needs and verifies each file by its hash.
 */
export async function GET() {
  const manifest = await geographyManifest(db, placesConfig, defaultGeometryStore(), new Date());
  return NextResponse.json(manifest, {
    headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
  });
}

import { NextResponse } from "next/server";
import { defaultGeometryStore } from "@/lib/places/importer/geometry-store";

/**
 * One boundary file, by its sha256 (design §9.1). Its name is its content, so
 * browsers and proxies may keep it forever.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const sha = /^([0-9a-f]{64})\.topojson$/.exec((await params).file)?.[1];
  const bytes = sha ? await defaultGeometryStore().get(sha) : null;
  if (!sha || !bytes) {
    return NextResponse.json({ error: "no such geometry file" }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=31536000, immutable",
      ETag: `"${sha}"`,
    },
  });
}

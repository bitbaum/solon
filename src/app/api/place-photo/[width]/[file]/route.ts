import { db } from "@/lib/db/client";
import { databaseKeep, photoByFile, photoBytes } from "@/lib/places/photo-store";

/**
 * `/api/place-photo/<width>/<Commons file>`: a place's photograph, served from
 * Solon's store (src/lib/places/photo-store.ts). A path, not a query, so the
 * image optimiser takes it as a plain local image. Only the photographs
 * data/world/photos.json names; anything else is not found. A file's bytes
 * never change, so the response is kept for a year.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ width: string; file: string }> },
) {
  const { width: w, file } = await params;
  const photo = photoByFile(decodeURIComponent(file));
  const width = Number(w);
  if (!photo || !Number.isInteger(width) || width < 1 || width > 4000) {
    return new Response("Not found", { status: 404 });
  }
  const read = await photoBytes(databaseKeep(db), photo, width).catch(() => null);
  if (!read) {
    return new Response("Wikimedia did not answer; try again shortly", {
      status: 503,
      headers: { "retry-after": "30", "cache-control": "no-store" },
    });
  }
  return new Response(new Uint8Array(read.bytes), {
    headers: {
      "content-type": read.contentType,
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}

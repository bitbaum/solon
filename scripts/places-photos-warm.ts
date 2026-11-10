/**
 * Reads the world list's photographs into Solon's store once, through the
 * site's own route, so no reader is the first to ask for one:
 * `pnpm run places:photos:warm`
 * (BASE=https://solon.orangecat.ch for production; the deploy's follow-up runs
 * it). A photograph already held answers at once; one not yet held is read
 * from Wikimedia by the site, one at a time. A subdivision's photograph, one
 * of thousands, is read the first time its page or tile is opened.
 */
import { worldPlacePhotos } from "@/lib/places/place-photo";
import { photoUrl } from "@/lib/places/photo-store";

/** The widths the pages ask for: a tile, the share card, the hero. */
const WIDTHS = [960, 1280, 1920];
const base = (process.env.BASE ?? "http://localhost:3000").replace(/\/$/, "");
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const photos = worldPlacePhotos();
  const failed: string[] = [];
  let read = 0;
  for (const photo of photos) {
    for (const width of WIDTHS) {
      const url = base + photoUrl(photo, width);
      let ok = false;
      for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
        const response = await fetch(url, { signal: AbortSignal.timeout(120_000) }).catch(
          () => null,
        );
        ok = Boolean(response?.ok);
        await response?.arrayBuffer().catch(() => undefined);
        if (!ok) await sleep(30_000);
      }
      if (ok) read++;
      else failed.push(`${photo.file} @${width}`);
    }
  }
  console.log(`${read} of ${photos.length * WIDTHS.length} held`);
  for (const f of failed) console.log(`not read: ${f}`);
  if (failed.length > photos.length) process.exit(1);
}

void main();

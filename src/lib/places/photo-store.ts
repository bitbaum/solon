/**
 * The photographs Solon shows of places, served by Solon. Each is one Wikimedia
 * Commons thumbnail at a width Wikimedia keeps, read once, politely, and kept
 * in `place_photo_bytes`: a reader's browser never asks Wikimedia, a page never
 * waits on it twice, and a deploy never empties the store.
 *
 * Only a photograph `data/world/photos.json` names is served: the route is not
 * a proxy for anything else.
 */
import { eq } from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import { placePhotoBytes } from "@/lib/db/places-schema";
import { allPlacePhotos, type PlacePhoto } from "./place-photo";

/** The widths Wikimedia keeps thumbnails at; a request is served at the next one up. */
export const PHOTO_STEPS = [330, 500, 960, 1280, 1920] as const;
const USER_AGENT = "SolonPlacePhotos/1.0 (https://solon.orangecat.ch/credits; place photographs)";

export const photoStep = (width: number) =>
  PHOTO_STEPS.find((s) => s >= width) ?? PHOTO_STEPS[PHOTO_STEPS.length - 1];

/** The address on Solon a photograph is served at: by its Commons file and a width. */
export const photoUrl = (photo: Pick<PlacePhoto, "file">, width: number) =>
  `/api/place-photo/${photoStep(width)}/${encodeURIComponent(photo.file)}`;

/** The Commons thumbnail of a photograph at a width (its `src` is the 1920 one). */
export const commonsUrl = (photo: Pick<PlacePhoto, "src">, width: number): string =>
  photo.src.replace(/\/\d+px-/, `/${width}px-`);

let byFile: Map<string, PlacePhoto> | null = null;
export function photoByFile(file: string): PlacePhoto | null {
  byFile ??= new Map(allPlacePhotos().map((p) => [p.file, p]));
  return byFile.get(file) ?? null;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// One request to Wikimedia at a time from this process: it asks for no more.
let queue: Promise<unknown> = Promise.resolve();
function inTurn<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job);
  queue = run.catch(() => undefined);
  return run;
}

async function fetchFromCommons(url: string, doFetch: typeof fetch): Promise<PhotoBytes | null> {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const response = await doFetch(url, {
      headers: { "user-agent": USER_AGENT },
      signal: AbortSignal.timeout(30_000),
    }).catch(() => null);
    if (response?.ok) {
      const contentType = response.headers.get("content-type") ?? "image/jpeg";
      if (!contentType.startsWith("image/")) return null;
      return { bytes: Buffer.from(await response.arrayBuffer()), contentType };
    }
    if (response && response.status !== 429 && response.status < 500) return null;
    const asked = Number(response?.headers.get("retry-after"));
    await sleep(
      Math.min(20_000, Number.isFinite(asked) && asked > 0 ? asked * 1000 : 1500 * attempt),
    );
  }
  return null;
}

export interface PhotoBytes {
  bytes: Buffer;
  contentType: string;
}

/** Where read photographs are kept, by `<file>@<width>`. */
export interface PhotoKeep {
  get(key: string): Promise<PhotoBytes | null>;
  put(key: string, url: string, read: PhotoBytes): Promise<void>;
}

/** The keep in the database: `place_photo_bytes`, which no deploy empties. */
export const databaseKeep = (db: Database): PhotoKeep => ({
  async get(key) {
    const [held] = await db
      .select({ bytes: placePhotoBytes.bytes, contentType: placePhotoBytes.contentType })
      .from(placePhotoBytes)
      .where(eq(placePhotoBytes.key, key))
      .limit(1);
    return held ?? null;
  },
  async put(key, url, read) {
    await db
      .insert(placePhotoBytes)
      .values({ key, url, bytes: read.bytes, contentType: read.contentType })
      .onConflictDoNothing();
  },
});

/** A photograph's bytes at a width: from the keep, else read from Commons once and kept. */
export async function photoBytes(
  keep: PhotoKeep,
  photo: PlacePhoto,
  width: number,
  doFetch: typeof fetch = fetch,
): Promise<PhotoBytes | null> {
  const step = photoStep(width);
  const key = `${photo.file}@${step}`;
  const held = await keep.get(key);
  if (held) return held;
  const url = commonsUrl(photo, step);
  const read = await inTurn(() => fetchFromCommons(url, doFetch));
  if (!read) return null;
  await keep.put(key, url, read);
  return read;
}

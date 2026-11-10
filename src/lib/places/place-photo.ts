/**
 * A place's photograph, from data/world/photos.json (`pnpm run places:photos`):
 * by the keys a place is known by (`world:<slug>`, `iso_3166_2:US-WY`,
 * `wikidata:Q…`), the first that has one. Server only.
 */
import { crosswalked } from "@/lib/config/places/crosswalks";
import { WORLD_PHOTOS_FILE } from "@/lib/config/world/kinds";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface PlacePhoto {
  file: string;
  /** The photograph's page on Wikimedia Commons: its author, licence and history. */
  page: string;
  src: string;
  width: number;
  height: number;
  author: string;
  license: string;
  licenseUrl: string | null;
  shape: "photo" | "banner";
  /** Where the photograph is anchored when cropped (CSS object-position). */
  position?: string;
}

interface PhotosFile {
  read: string;
  photos: Record<string, PlacePhoto>;
  index: Record<string, string>;
}

const FILE = join(process.cwd(), WORLD_PHOTOS_FILE);
let cached: PhotosFile | null = null;
function photosFile(): PhotosFile {
  cached ??= existsSync(FILE)
    ? (JSON.parse(readFileSync(FILE, "utf8")) as PhotosFile)
    : { read: "", photos: {}, index: {} };
  return cached;
}

/** The photograph of the first key that has one. */
export function placePhoto(keys: readonly string[]): PlacePhoto | null {
  const file = photosFile();
  for (const key of keys.flatMap((k) => [k, ...crosswalked(k)])) {
    const item = file.index[key] ?? (/^Q\d+$/.test(key) ? key : undefined);
    const photo = item ? file.photos[item] : undefined;
    if (photo) return photo;
  }
  return null;
}

/** Every photograph Solon shows of a place, for the credits page. */
export const allPlacePhotos = (): PlacePhoto[] =>
  [...new Map(Object.values(photosFile().photos).map((p) => [p.file, p])).values()].sort((a, b) =>
    a.file.localeCompare(b.file),
  );

/** The photographs of the world list's places: the ones every visitor meets first. */
export const worldPlacePhotos = (): PlacePhoto[] => {
  const file = photosFile();
  const items = new Set(
    Object.entries(file.index)
      .filter(([key]) => key.startsWith("world:") || key === "wikidata:Q2")
      .map(([, item]) => item),
  );
  return [...items].flatMap((q) => (file.photos[q] ? [file.photos[q]] : []));
};

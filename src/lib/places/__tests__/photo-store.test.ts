import { describe, expect, it, vi } from "vitest";
import { crosswalked } from "@/lib/config/places/crosswalks";
import {
  commonsUrl,
  photoBytes,
  photoStep,
  photoUrl,
  type PhotoBytes,
  type PhotoKeep,
} from "../photo-store";
import type { PlacePhoto } from "../place-photo";

const photo: PlacePhoto = {
  file: "Cervino cloud.jpg",
  page: "https://commons.wikimedia.org/wiki/File:Cervino_cloud.jpg",
  src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/Cervino_cloud.jpg/1920px-Cervino_cloud.jpg",
  width: 1920,
  height: 1280,
  author: "A",
  license: "CC BY-SA 4.0",
  licenseUrl: null,
  shape: "photo",
};

/** A keep in memory. */
function memoryKeep() {
  const rows = new Map<string, PhotoBytes>();
  const keep: PhotoKeep = {
    get: async (key) => rows.get(key) ?? null,
    put: async (key, _url, read) => void rows.set(key, read),
  };
  return { keep, rows };
}

describe("photo store", () => {
  it("serves a request at the next width Wikimedia keeps", () => {
    expect(photoStep(400)).toBe(500);
    expect(photoStep(960)).toBe(960);
    expect(photoStep(3000)).toBe(1920);
    expect(photoUrl(photo, 1000)).toBe("/api/place-photo/1280/Cervino%20cloud.jpg");
    expect(commonsUrl(photo, 500)).toMatch(/\/500px-Cervino_cloud\.jpg$/);
  });

  it("reads Commons once, then answers from the store", async () => {
    const { keep, rows } = memoryKeep();
    const fetchImpl = vi.fn(
      async () =>
        new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "image/jpeg" } }),
    );
    const first = await photoBytes(keep, photo, 960, fetchImpl as unknown as typeof fetch);
    expect(first?.bytes.length).toBe(3);
    expect(rows.has("Cervino cloud.jpg@960")).toBe(true);
    await photoBytes(keep, photo, 960, fetchImpl as unknown as typeof fetch);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("does not keep what is not an image", async () => {
    const { keep, rows } = memoryKeep();
    const fetchImpl = async () =>
      new Response("<html>", { headers: { "content-type": "text/html" } });
    expect(await photoBytes(keep, photo, 500, fetchImpl as unknown as typeof fetch)).toBeNull();
    expect(rows.size).toBe(0);
  });
});

describe("identifier crosswalks", () => {
  it("reads a canton's FSO number as its ISO 3166-2 code", () => {
    expect(crosswalked("bfs_canton:1")).toEqual(["iso_3166_2:CH-ZH"]);
    expect(crosswalked("bfs_canton:26")).toEqual(["iso_3166_2:CH-JU"]);
    expect(crosswalked("iso_3166_2:CH-ZH")).toEqual([]);
  });
});

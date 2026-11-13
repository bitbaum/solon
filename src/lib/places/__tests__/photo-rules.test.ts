import { describe, expect, it } from "vitest";
import { bannerSource, free, fullPhoto, strip, thumbAt, type PhotoInfo } from "../photo-rules";
import { placePhoto } from "../place-photo";

const info = (over: Partial<PhotoInfo>): PhotoInfo => ({
  file: "Valley.jpg",
  width: 4000,
  height: 2667,
  mime: "image/jpeg",
  src: "",
  author: "A",
  license: "CC BY-SA 4.0",
  licenseUrl: null,
  ...over,
});

describe("a place's photograph", () => {
  it("takes only free licences, shown unchanged", () => {
    for (const license of ["Public domain", "CC0", "CC BY 2.0", "CC BY-SA 3.0 de", "FAL"]) {
      expect(free(info({ license })), license).toBe(true);
    }
    for (const license of ["All rights reserved", "Fair use", ""]) {
      expect(free(info({ license })), license).toBe(false);
    }
  });

  it("fills a screen with a photograph, and shows a panorama as a strip, never a map", () => {
    expect(fullPhoto(info({}))).toBe(true);
    expect(fullPhoto(info({ width: 2560, height: 217 }))).toBe(false);
    expect(strip(info({ width: 2560, height: 217 }))).toBe(true);
    expect(fullPhoto(info({ width: 1200, height: 800 }))).toBe(false);
    expect(fullPhoto(info({ file: "Location map of X.png", mime: "image/png" }))).toBe(false);
    expect(fullPhoto(info({ mime: "image/svg+xml" }))).toBe(false);
  });

  it("asks for a width Wikimedia keeps, without tracking", () => {
    expect(
      thumbAt(
        "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9d/X.jpg/3840px-X.jpg?utm_source=commons",
        7000,
      ),
    ).toBe("https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9d/X.jpg/1920px-X.jpg");
  });

  it("finds the photograph a banner was cut from", () => {
    expect(bannerSource("{{Extracted from|File:Kazbeg Panorama.jpg}}")).toBe("Kazbeg Panorama.jpg");
    expect(bannerSource("|source=[[:File:Sörenberg_2.jpg|original]]")).toBe("Sörenberg 2.jpg");
    expect(bannerSource("no source")).toBeNull();
  });

  it("finds a place's photograph by any of its keys, a country by its world slug", () => {
    expect(placePhoto(["world:switzerland"])?.file).toBe("Cervino cloud.jpg");
    expect(placePhoto(["iso_3166_2:US-WY"])).not.toBeNull();
    expect(placePhoto(["nothing:here"])).toBeNull();
  });
});

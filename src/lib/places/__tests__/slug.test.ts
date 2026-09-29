import { describe, expect, it } from "vitest";
import { slugSegment } from "../slug";

describe("slugSegment", () => {
  it.each([
    ["Zürich", "zurich"],
    ["Weavers' Guild", "weavers-guild"],
    ["Saint-Légier-La Chiésaz", "saint-legier-la-chiesaz"],
    ["Großbärenweiler", "grossbarenweiler"],
    ["Łódź", "lodz"],
    ["Færøerne", "faeroerne"],
    ["  Oak   Hollow  ", "oak-hollow"],
  ])("transliterates %s to %s", (name, segment) => {
    expect(slugSegment(name, true)).toBe(segment);
  });

  it("gives up on a script it does not transliterate, so the caller falls back", () => {
    expect(slugSegment("Москва", true)).toBeNull();
    expect(slugSegment("!!!", true)).toBeNull();
  });

  it("keeps letters as they are when the pack does not transliterate", () => {
    expect(slugSegment("Москва Сити", false)).toBe("москва-сити");
  });
});

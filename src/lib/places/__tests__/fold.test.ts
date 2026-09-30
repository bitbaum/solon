import { describe, expect, it } from "vitest";
import { foldName } from "../fold";

describe("foldName", () => {
  it.each([
    ["Zürich", "zurich"],
    ["Zuerich", "zurich"],
    ["ZÜRICH", "zurich"],
    ["Neuchâtel", "neuchatel"],
    ["Genève", "geneve"],
    ["Küsnacht (ZH)", "kusnacht (zh)"],
    ["Łódź", "lodz"],
    ["Bettingen", "bettingen"],
  ])("folds %j to %j", (name, folded) => {
    expect(foldName(name)).toBe(folded);
  });

  it("folds a name and the way it is typed without its umlaut alike", () => {
    expect(foldName("Münchenstein")).toBe(foldName("Muenchenstein"));
    expect(foldName("Aeugst am Albis")).toBe(foldName("Äugst am Albis"));
  });
});

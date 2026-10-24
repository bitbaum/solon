import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { currentVersion } from "../load";
import {
  actLinks,
  chapterLinks,
  isoDay,
  kindOf,
  oneOfEachDay,
  otherVersions,
  readActPage,
} from "../zurich-city";

// An act page of the city's collection (the Gemeindeordnung), reduced to its two tables.
const page = readFileSync(join(__dirname, "zurich-city-act.fixture.html"), "utf8");

describe("the City of Zürich's collection", () => {
  it("reads an act's number, title, days and file from its own table", () => {
    const act = readActPage(page)!;
    expect(act.ref).toBe("101.100");
    expect(act.title).toBe("Gemeindeordnung der Stadt Zürich");
    expect(act.inForceFrom).toBe("2026-07-01");
    expect(act.inForceTo).toBeNull();
    expect(act.pdf).toMatch(/^\/dam\/.*101\.100-gemeindeordnung-2025\.11-v31\.pdf$/);
    expect(act.versionPage).toMatch(/\/100-v31\.html$/);
  });

  it("lists the other versions with the days the city states", () => {
    const versions = otherVersions(page);
    expect(versions.length).toBeGreaterThan(5);
    expect(versions[0]).toMatchObject({ inForceFrom: "2025-09-01", inForceTo: "2026-06-30" });
    expect(versions[0]!.pageUrl).toMatch(
      /^https:\/\/www\.stadt-zuerich\.ch\/web\/.*100-v30\.html$/,
    );
  });

  it("serves the version in force today, and waits for one not yet started", () => {
    const versions = [
      { inForceFrom: "2025-09-01", inForceTo: "2026-06-30", pageUrl: "a" },
      { inForceFrom: "2026-07-01", inForceTo: null, pageUrl: "b" },
      { inForceFrom: "2027-01-01", inForceTo: null, pageUrl: "c" },
    ];
    expect(currentVersion(versions, "2026-10-24")?.pageUrl).toBe("b");
    expect(currentVersion(versions, "2026-06-30")?.pageUrl).toBe("a");
    expect(currentVersion(versions, "2020-01-01")).toBeNull();
  });

  it("keeps one version per first day when the city repeats one", () => {
    const kept = oneOfEachDay([
      { inForceFrom: "1971-01-01", inForceTo: "2002-06-30", pageUrl: "a" },
      { inForceFrom: "1971-01-01", inForceTo: "2004-09-25", pageUrl: "b" },
      { inForceFrom: "1971-01-01", inForceTo: "2002-12-31", pageUrl: "c" },
      { inForceFrom: "2005-01-01", inForceTo: null, pageUrl: "d" },
    ]);
    expect(kept.map((v) => v.pageUrl)).toEqual(["b", "d"]);
  });

  it("finds chapters and acts in the index pages, and reads days", () => {
    const section = "/de/politik-und-verwaltung/politik-und-recht/amtliche-sammlung";
    expect(
      chapterLinks(`<a href="${section}/1/101.html">x</a><a href="${section}/1/101.html">x</a>`),
    ).toEqual([`${section}/1/101.html`]);
    expect(actLinks(`<a href="${section}/1/141/110.html">x</a>`)).toEqual([
      `${section}/1/141/110.html`,
    ]);
    expect(isoDay("30.06.2026")).toBe("2026-06-30");
    expect(isoDay("")).toBeNull();
    expect(kindOf("Verordnung über die Gebühren")).toBe("ordinance");
    expect(kindOf("Gemeindeordnung der Stadt Zürich")).toBe("constitution");
  });
});

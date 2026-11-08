import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  chapterPage,
  decodePage,
  parseGcnhChapter,
  parseGcnhChapters,
  parseGcnhTitles,
  sectionAnchor,
  titleCase,
  titlePage,
} from "../gcnh";

/**
 * Excerpts of the General Court's own pages, byte for byte (CRLF line ends,
 * `&nbsp` without its semicolon), as a public mirror of www.gencourt.state.nh.us
 * holds them: github.com/jlcx/nhrsa, made with wget in March 2017. The site
 * refused this sandbox, so the parser was built on these; the server's dry run
 * reads the live pages.
 */
const fixture = (name: string) =>
  readFileSync(join(__dirname, "fixtures", `gcnh-${name}-mrg.fixture.html`), "utf8");

/** The table of titles, `nhtoc.htm` (its first four entries, with Title IV, repealed whole). */
const NHTOC = `<html>
<head><title>New Hampshire Statutes - Table of Contents</title></head>
<body>
<center><h1>New Hampshire Statutes</h1></center>
<center><h2>Table of Contents</h2></center>
<ul><li><a href="NHTOC/NHTOC-I.htm">TITLE I: THE STATE AND ITS GOVERNMENT</a></li><br/><i>(Includes Chapters 1 - 21-U)</i><li><a href="NHTOC/NHTOC-II.htm">TITLE II: COUNTIES</a></li><br/><i>(Includes Chapters 22 - 30-B)</i><li><a href="NHTOC/NHTOC-III.htm">TITLE III: TOWNS, CITIES, VILLAGE DISTRICTS, AND UNINCORPORATED PLACES</a></li><br/><i>(Includes Chapters 31 - 53-F)</i><li><a href="IV/Title4.htm">TITLE IV: ELECTIONS</a></li><br/><i>(</i><i><b>Entire Title Was Repealed</b></i><i> - Chapters 54 - 70)</i><li><a href="NHTOC/NHTOC-XIX-A.htm">TITLE XIX-A: FORESTRY</a></li><br/><i>(Includes Chapters 227-G - 227-M)</i></ul>
</body>
</html>`;

/** Title III's chapters, `NHTOC/NHTOC-III.htm` (an excerpt). */
const NHTOC_III = `<html>
<head><title>New Hampshire Statutes - Table of Contents</title></head>
<body>
<center><h1>New Hampshire Statutes</h1></center>
<center><h2>Table of Contents</h2></center>
<center><h2>TITLE III: TOWNS, CITIES, VILLAGE DISTRICTS, AND UNINCORPORATED PLACES</h2></center>
<ul><li><a href="NHTOC-III-31.htm">CHAPTER 31: POWERS AND DUTIES OF TOWNS</a></li><li><a href="NHTOC-III-31-A.htm">CHAPTER 31-A: RETURN OF REVENUE TO CITIES AND TOWNS</a></li><li><a href="NHTOC-III-38-D.htm">CHAPTER 38-D: ENERGY COMMISSIONS</a></li><li><a href="NHTOC-III-39.htm">CHAPTER 39: TIME FOR HOLDING TOWN MEETINGS AND WARNING THEREOF</a></li></ul>
</body>
</html>`;

describe("the General Court's tables", () => {
  it("lists the titles, leaving out one repealed whole", () => {
    expect(parseGcnhTitles(NHTOC)).toEqual([
      { title: "I", name: "The State and Its Government" },
      { title: "II", name: "Counties" },
      { title: "III", name: "Towns, Cities, Village Districts, and Unincorporated Places" },
      { title: "XIX-A", name: "Forestry" },
    ]);
  });

  it("lists a title's chapters, each with its merged page", () => {
    const chapters = parseGcnhChapters(NHTOC_III, "III");
    expect(chapters.map((c) => [c.chapter, c.name])).toEqual([
      ["31", "Powers and Duties of Towns"],
      ["31-A", "Return of Revenue to Cities and Towns"],
      ["38-D", "Energy Commissions"],
      ["39", "Time for Holding Town Meetings and Warning Thereof"],
    ]);
    expect(chapterPage(chapters[3]!)).toBe("III/39/39-mrg.htm");
    expect(chapterPage(chapters[1]!)).toBe("III/31-A/31-A-mrg.htm");
    expect(titlePage("XIX-A")).toBe("NHTOC/NHTOC-XIX-A.htm");
  });

  it("writes names in title case, keeping numbers and numerals", () => {
    expect(titleCase("CHILD SUPPORT GUIDELINES; E-911 AND TITLE IV-D")).toBe(
      "Child Support Guidelines; E-911 and Title IV-D",
    );
  });
});

describe("parseGcnhChapter", () => {
  it("cuts a merged chapter into its sections, with heading, paragraphs and source note", () => {
    const { provisions, repealed } = parseGcnhChapter(fixture("39"), "39");
    expect(repealed).toBe(false);
    expect(provisions.map((p) => p.path)).toEqual([
      "sec_39-1",
      "sec_39-1-a",
      "sec_39-1-b",
      "sec_39-3",
    ]);
    expect(provisions[0]).toEqual({
      path: "sec_39-1",
      heading: "39:1 Meetings, When Held.",
      text:
        "A meeting of every town shall be held annually on the second Tuesday of March, or in accordance with RSA 40:13 if that provision is adopted in the town, for the choice of town officers and the transaction of all other town business. A town meeting may be warned by the selectmen, when, in their opinion, there shall be occasion therefor. In no event shall a special town meeting be held on the biennial election day.\n" +
        "Source. RS 32:1. CS 34:1. GS 35:1. 1878, 60:1. GL 38:1. PS 41:1. PL 45:1. RL 57:1. RSA 39:1. 1971, 562:1. 1976, 33:1. 1991, 370:4, eff. Aug. 31, 1991. 2000, 16:1, eff. April 30, 2000.",
    });
    // Each numbered paragraph is a line of its own.
    expect(provisions[2]!.text.split("\n").slice(0, 2)).toEqual([
      "I. A town may hold its town meeting outside the geographical boundaries of the town, if the town does not have a facility with a large enough seating capacity to accommodate the meeting.",
      "II. Warrants and other items required to be posted shall be posted for review by qualified voters at the place of the meeting on the day of the meeting.",
    ]);
    expect(provisions[3]!.heading).toBe("39:3 Articles.");
    expect(provisions[3]!.text).toMatch(
      /^Upon the written application of 25 or more registered voters or 2 percent of the registered voters in town, whichever is less/,
    );
  });

  it("reads lettered chapters and sections, and keeps a repealed section where it stood", () => {
    const { provisions } = parseGcnhChapter(fixture("21-J"), "21-J");
    expect(provisions.map((p) => [p.path, p.heading])).toEqual([
      ["sec_21-J-6-a", "21-J:6-a Division of Automated Information Systems."],
      ["sec_21-J-14-k", "21-J:14-k Cessation of Unauthorized Appraisals."],
      ["sec_21-J-15", "21-J:15 Municipal and Property Division."],
    ]);
    expect(provisions[0]!.text).toBe("[Repealed 2016, 85:10, II, eff. July 18, 2016.]");
    // The heading that groups the next sections ("Municipal and Property Division") is not 14-k's text.
    expect(provisions[1]!.text).not.toMatch(/Municipal and Property Division/);
    expect(provisions[2]!.text.split("\n").at(-1)).toBe(
      "Source. 1985, 204:1. 1987, 285:5. 1995, 87:1, eff. July 1, 1995. 2013, 247:2, eff. Mar. 24, 2014.",
    );
  });

  it("keeps a run of repealed sections as the page shows it", () => {
    const { provisions } = parseGcnhChapter(fixture("5"), "5");
    expect(provisions).toEqual([
      {
        path: "sec_5-6-a",
        heading: "5:6-a Election Procedure Manual.",
        text: "The secretary of state shall prepare and distribute an election procedure manual as provided in RSA 652:22.\nSource. 1977, 526:1. 1979, 436:3, eff. July 1, 1979.",
      },
      {
        path: "sec_5-7-9",
        heading: "5:7 to 5:9 Repealed.",
        text: "[Repealed 1971, 353:1, eff. Aug. 24, 1971.]",
      },
      expect.objectContaining({ path: "sec_5-10", heading: "5:10 Office Fees." }),
    ]);
  });

  it("marks a chapter repealed whole", () => {
    expect(parseGcnhChapter(fixture("268"), "268")).toEqual({
      repealed: true,
      provisions: [
        {
          path: "ch_268",
          heading: "Chapter 268 Repealed",
          text: "Entire Chapter was repealed\n[Repealed 1998, 207:9, III, eff. June 18, 1998.]",
        },
      ],
    });
  });

  it("refuses a page that is not a chapter's", () => {
    const blocked =
      "<html><head><title>Web Page Blocked</title></head><body>Access denied</body></html>";
    expect(() => parseGcnhChapter(blocked, "39")).toThrow(/not a chapter page/);
  });

  it("names a section's anchor after the publisher's own page for it", () => {
    expect(sectionAnchor("21-J:1")).toBe("sec_21-J-1");
    expect(sectionAnchor("5:6-a")).toBe("sec_5-6-a");
  });

  it("reads Windows-1252 pages as well as UTF-8", () => {
    expect(decodePage(new Uint8Array([0x93, 0x41, 0x94]))).toBe("“A”");
    expect(decodePage(new TextEncoder().encode("§ 1"))).toBe("§ 1");
  });
});

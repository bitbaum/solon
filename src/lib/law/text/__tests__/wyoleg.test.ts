import { describe, expect, it } from "vitest";
import { parseWyolegProvisions } from "../wyoleg";

/** Excerpts of the Legislative Service Office's PDFs as their text layer reads (2026-11-06). */
const TITLE_15 = `TITLE 15 - CITIES AND TOWNS
CHAPTER 1 - GENERAL PROVISIONS
ARTICLE 1 - POWERS AND MISCELLANEOUS MATTERS
15-1-101. Definitions.
(a) As used in W.S. 15-1-101 through 15-11-302:
(i) "Any city or town" means any incorporated
municipality;
(ii) "Councilman or councilmen" means the individuals
elected to comprise the governing body of any city or town;
15-1-102. Prior incorporations and elections legalized.
All incorporations and proceedings to incorporate cities and
towns are legalized, notwithstanding any irregularity that
may have occurred.
15-1-104. Repealed by Laws 1983, ch. 3, § 2.
ARTICLE 4 - ANNEXATION; DETERMINATION OF BOUNDARIES;
ADDITION AND EXCLUSION OF LAND
15-1-401. Definitions.
A municipality may prepare an urban renewal plan as established in W.S.
15-9-134. Any person or agency may also submit an urban renewal
plan to a municipality, as in W.S. 16-4-114 and
16-4-124. The books and accounts may be inspected at any time.
12
15-5-205. Death benefits to surviving spouse; amounts;
limitations; length of payments.
(a) If any paid fireman dies, the board shall pay a two-
thirds pension.
`;

const CONSTITUTION = `TITLE 97 - WYOMING CONSTITUTION
ARTICLE 1 - DECLARATION OF RIGHTS
Article 1, Section 1 Power inherent in the people.
All power is inherent in the people.
Article 1, Section 8 Courts open to all; suits against
state.
All courts shall be open.
ARTICLE 3 - LEGISLATIVE DEPARTMENT
Article 3, Section 52 Initiative and referendum.
(a) The people may propose and enact laws by the
initiative.
`;

const UCC = `TITLE 34.1 - UNIFORM COMMERCIAL CODE
REVISED ARTICLE 1 - GENERAL PROVISIONS
PART 1.
34.1-2-725. Statute of limitations in contracts for sale.
(a) An action for breach must be commenced within four (4) years.
ARTICLE 2.A - LEASES
PART 1
34.1-2.A-101. Short title.
This article may be cited as Uniform Commercial Code - Leases.
ARTICLE 3 - NEGOTIABLE INSTRUMENTS
34.1-3-101. Short title.
This article may be cited as Uniform Commercial Code - Negotiable Instruments.
`;

describe("parseWyolegProvisions", () => {
  const sections = parseWyolegProvisions(TITLE_15, "15");

  it("cuts a title into its sections, anchored by number, with the heading as published", () => {
    expect(sections.map((s) => s.path)).toEqual([
      "sec_15-1-101",
      "sec_15-1-102",
      "sec_15-1-104",
      "sec_15-1-401",
      "sec_15-5-205",
    ]);
    expect(sections[0]!.heading).toBe("15-1-101. Definitions.");
  });

  it("joins the PDF's hard-wrapped lines, starting a paragraph at each subsection", () => {
    expect(sections[0]!.text).toBe(
      [
        "(a) As used in W.S. 15-1-101 through 15-11-302:",
        '(i) "Any city or town" means any incorporated municipality;',
        '(ii) "Councilman or councilmen" means the individuals elected to comprise the governing body of any city or town;',
      ].join("\n"),
    );
  });

  it("keeps a section that is only its heading, saying it was repealed", () => {
    expect(sections[2]!.text).toBe("Repealed by Laws 1983, ch. 3, § 2.");
  });

  it("never takes a wrapped citation for a heading, in this title or another, and drops page numbers", () => {
    const definitions = sections[3]!.text;
    expect(definitions).toContain("as established in W.S. 15-9-134. Any person or agency");
    expect(definitions).toContain("16-4-124. The books and accounts");
    expect(definitions).not.toMatch(/\b12\b/);
  });

  it("keeps chapter and article lines out of the text, even when they wrap", () => {
    expect(sections.map((s) => s.text).join("\n")).not.toMatch(/ARTICLE|ADDITION AND EXCLUSION/);
  });

  it("joins a heading that wraps, and keeps a hyphen broken at a line end", () => {
    expect(sections[4]!.heading).toBe(
      "15-5-205. Death benefits to surviving spouse; amounts; limitations; length of payments.",
    );
    expect(sections[4]!.text).toContain("a two-thirds pension.");
  });

  it("reads the Constitution's articles and sections", () => {
    const constitution = parseWyolegProvisions(CONSTITUTION, "97");
    expect(constitution.map((s) => [s.path, s.heading])).toEqual([
      ["art_1_sec_1", "Article 1, Section 1 Power inherent in the people."],
      ["art_1_sec_8", "Article 1, Section 8 Courts open to all; suits against state."],
      ["art_3_sec_52", "Article 3, Section 52 Initiative and referendum."],
    ]);
  });

  it("reads the Uniform Commercial Code's lettered articles in order, without part lines", () => {
    const ucc = parseWyolegProvisions(UCC, "34.1");
    expect(ucc.map((s) => s.path)).toEqual([
      "sec_34.1-2-725",
      "sec_34.1-2.A-101",
      "sec_34.1-3-101",
    ]);
    expect(ucc.map((s) => s.text).join("\n")).not.toMatch(/PART|ARTICLE/);
  });
});

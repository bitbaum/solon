/**
 * The United Kingdom's reader on excerpts of what legislation.gov.uk answers.
 * The site could not be reached from the sandbox this reader was written in
 * (2026-11-08: the host does not resolve there), so the fixtures are
 * hand-written approximations of its documented shapes (CLML for an act and
 * for instruments; an Atom feed page with the OpenSearch and `leg:` paging
 * elements), each marked as such in its first comment, not captures. The
 * server's dry run (`law:text ukleg --year 2024 --limit 20 --dry-run`) is the
 * check against the live site.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  addressOf,
  crawlDelayMs,
  isClml,
  listUrlOf,
  parseClml,
  parseFeed,
  parseXml,
  xmlUrlOf,
} from "../ukleg";

const fixture = (name: string) => readFileSync(join(__dirname, "fixtures", name), "utf8");
const TODAY = "2026-11-08";

describe("legislation.gov.uk's feeds", () => {
  it("asks for one year of one type, a page at a time, and reads items at their own address", () => {
    expect(listUrlOf("ukpga", 2018, 2)).toBe(
      "https://www.legislation.gov.uk/ukpga/2018/data.feed?page=2",
    );
    expect(xmlUrlOf("ukpga/2018/12")).toBe("https://www.legislation.gov.uk/ukpga/2018/12/data.xml");
  });

  it("names an item by type, year and number, whatever address it is given by", () => {
    expect(addressOf("http://www.legislation.gov.uk/id/ukpga/2018/12")).toBe("ukpga/2018/12");
    expect(addressOf("https://www.legislation.gov.uk/uksi/2019/419/contents/data.xml")).toBe(
      "uksi/2019/419",
    );
    expect(addressOf("http://www.legislation.gov.uk/id/ukpga/Geo5/15-16/20")).toBe(
      "ukpga/Geo5/15-16/20",
    );
    expect(addressOf("http://www.legislation.gov.uk/ukpga/2018")).toBeNull();
    expect(addressOf(undefined)).toBeNull();
  });

  it("lists the items of a page with their titles and update days, and says what it leaves out", () => {
    const feed = parseFeed(fixture("ukleg-feed-ukpga-2018.fixture.xml"));
    expect(feed.acts).toEqual([
      {
        path: "ukpga/2018/12",
        type: "ukpga",
        title: "Data Protection Act 2018",
        updated: "2025-06-19",
      },
      { path: "ukpga/2018/16", type: "ukpga", title: "Finance Act 2018", updated: "2024-03-01" },
    ]);
    expect(feed.skipped).toEqual([
      { row: "asp/2018/5", reason: "a type not read" },
      { row: "ukpga/2018/99", reason: "no title" },
    ]);
    expect(feed.entries).toBe(4);
    expect(feed.more).toBe(true);
  });

  it("knows the last page from the feed's own paging elements", () => {
    const last = fixture("ukleg-feed-ukpga-2018.fixture.xml")
      .replace(/<link rel="next"[^>]*>/, "")
      .replace("<leg:morePages>1</leg:morePages>", "<leg:morePages>0</leg:morePages>");
    expect(parseFeed(last).more).toBe(false);
    // Without morePages, the total and the page size decide.
    const noMore = last.replace(/<leg:morePages>.*<\/leg:morePages>/, "");
    expect(parseFeed(noMore).more).toBe(true); // page 1 of 20 per page, 26 results
  });

  it("reports what a page is when it is not a feed", () => {
    expect(() => parseFeed("<html><body>Service unavailable</body></html>")).toThrow(
      /^not a feed: <html> Service unavailable/,
    );
    expect(() => parseFeed("Gateway timeout")).toThrow(/^not a feed: Gateway timeout/);
  });
});

describe("robots.txt's crawl-delay", () => {
  it("reads the delay for every robot, and a named robot's own before it", () => {
    expect(crawlDelayMs("User-agent: *\nCrawl-delay: 2\nDisallow: /search")).toBe(2000);
    expect(
      crawlDelayMs("User-agent: *\nCrawl-delay: 2\n\nUser-agent: solon-law-text\nCrawl-delay: 5"),
    ).toBe(5000);
    expect(crawlDelayMs("User-agent: *\nDisallow: /search")).toBeNull();
    expect(crawlDelayMs("")).toBeNull();
  });
});

describe("the XML reader", () => {
  it("parses elements, attributes, entities, CDATA and comments, and ignores a stray closing tag", () => {
    const root = parseXml(
      `<?xml version="1.0"?><!-- c --><a x="1" y='&amp;'><b>one &lt; two</b><![CDATA[<raw>]]></a></stray></a>`,
    );
    expect(root.name).toBe("a");
    expect(root.attrs).toEqual({ x: "1", y: "&" });
    expect(root.children).toHaveLength(2);
    expect(() => parseXml("no markup")).toThrow("not XML");
  });
});

describe("an act's revised CLML", () => {
  const act = parseClml(fixture("ukleg-ukpga-2018-12.fixture.xml"), TODAY);

  it("cuts the title and introductory text, the sections that are law and the schedules, under the XML's own ids", () => {
    expect(act.title).toBe("Data Protection Act 2018");
    expect(act.provisions.map((p) => [p.path, p.heading])).toEqual([
      ["prelims", "Title and introductory text"],
      ["section-1", "1 Overview"],
      ["section-3", "3 Terms relating to the processing of personal data"],
      ["section-6", "6 Units"],
      ["schedule-1", "SCHEDULE 1 Special categories of personal data"],
    ]);
  });

  it("leaves out what is repealed or not yet in force, and counts it", () => {
    expect(act.omitted).toBe(2);
    expect(act.outOfForce).toBe(false);
    expect(act.provisions.some((p) => p.path === "section-4" || p.path === "section-5")).toBe(
      false,
    );
  });

  it("writes a section as lines: subsection numbers in brackets, notes and marks gone, lists and rows kept", () => {
    const by = (path: string) => act.provisions.find((p) => p.path === path)!.text;
    expect(by("section-1")).toBe(
      "(1) This Act makes provision about the processing of personal data.\n(2) Most processing of personal data is subject to the UK GDPR.",
    );
    expect(by("section-3")).toBe(
      [
        "(1) “Personal data” means any information relating to an identified or identifiable living individual.",
        "(2) Each of the following is an “identifier”:",
        "(a) a name;",
        "(b) an identification number.",
      ].join("\n"),
    );
    expect(by("section-6")).toBe(
      "The charge is in m² units, as the table shows.\nBand | Fee\nSmall | £40",
    );
    expect(by("prelims")).toContain(
      "An Act to make provision for the regulation of the processing of information relating to individuals.",
    );
    expect(by("prelims")).toContain("Be it enacted by the Queen’s most Excellent Majesty");
  });

  it("keeps a schedule whole, its reference and its paragraphs in it", () => {
    const schedule = act.provisions.find((p) => p.path === "schedule-1")!;
    expect(schedule.text.split("\n")).toEqual([
      "Section 10",
      "PART 1 Conditions",
      "Employment",
      "1 This condition is met if the processing is necessary for employment law.",
    ]);
  });

  it("dates the version by the publisher: the revised version's start", () => {
    expect(act.version).toEqual({ date: "2025-06-19", basis: "restrict-start" });
  });

  it("falls back from the start date to the point-in-time date, the commencement, then the enactment or making", () => {
    const xml = fixture("ukleg-ukpga-2018-12.fixture.xml");
    const noStart = xml.replace(/ RestrictStartDate="2025-06-19"/, "");
    expect(parseClml(noStart, TODAY).version).toEqual({ date: "2025-06-19", basis: "valid" });
    const noValid = noStart.replace(/<dct:valid>.*<\/dct:valid>/, "");
    expect(parseClml(noValid, TODAY).version).toEqual({ date: "2018-05-23", basis: "enacted" });
    // A start date still to come is a version not yet in force.
    const future = xml.replace('RestrictStartDate="2025-06-19"', 'RestrictStartDate="2999-01-01"');
    expect(parseClml(future, TODAY).version?.basis).toBe("valid");
    const made = parseClml(fixture("ukleg-uksi-made.fixture.xml"), TODAY);
    expect(made.version).toEqual({ date: "2024-02-12", basis: "coming-into-force" });
  });
});

describe("a statutory instrument", () => {
  it("cuts the preamble and each regulation under its id", () => {
    const si = parseClml(fixture("ukleg-uksi-made.fixture.xml"), TODAY);
    expect(si.provisions.map((p) => [p.path, p.heading])).toEqual([
      ["prelims", "Title and introductory text"],
      ["regulation-1", "1 Citation and commencement"],
      ["regulation-2", "2 Amendment"],
    ]);
    expect(si.provisions[2]!.text).toBe(
      "In regulation 3 of the Example Regulations 2000, for “10” substitute “12”.",
    );
    expect(si.outOfForce).toBe(false);
  });

  it("says an instrument is out of force when every regulation is revoked", () => {
    const gone = parseClml(fixture("ukleg-uksi-repealed.fixture.xml"), TODAY);
    expect(gone).toMatchObject({ outOfForce: true, omitted: 2 });
  });
});

describe("what is not an item's XML", () => {
  it("is reported with its first words", () => {
    expect(isClml("<html><body>Not Found</body></html>")).toBe(false);
    expect(() => parseClml("<html><body>Too many requests</body></html>", TODAY)).toThrow(
      /^not CLML: <html><body>Too many requests/,
    );
  });

  it("keeps an item with no numbered sections as one provision, so no words are lost", () => {
    const xml = `<Legislation xmlns="http://www.legislation.gov.uk/namespaces/legislation" RestrictStartDate="2020-01-01"><Primary><Body><P><Text>Words of an old act with no sections.</Text></P></Body></Primary></Legislation>`;
    expect(parseClml(xml, TODAY).provisions).toEqual([
      { path: "text", heading: "", text: "Words of an old act with no sections." },
    ]);
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LAW_AUTHORITIES, PARLIAMENTRSO, PRESIDENTRUO } from "@/lib/config/law";
import { parseListing } from "../drupal-listing";
import { crawlDelayMs } from "../ukleg";
import { parsePosts } from "../wp-rest";

const fixture = (name: string) => readFileSync(join(__dirname, "fixtures", name), "utf8");

describe("Drupal listing (the Parliament of South Ossetia, read 2026-11-10)", () => {
  const rows = parseListing(fixture("parliamentrso-listing.fixture.html"));

  it("reads the acts of the page and not the menu's node links", () => {
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.id)).toEqual(["5845", "5844", "5837"]);
    expect(rows.some((r) => r.id === "1")).toBe(false);
  });

  it("keeps the title as the publisher prints it, entities decoded", () => {
    expect(rows[0]!.title).toBe(
      "Закон РЮО «О внесении изменения в главу II Закона Республики Южная Осетия «Об оперативно – розыскной деятельности»",
    );
  });

  it("reads the day the site created the page, and says nothing of the act's own date", () => {
    expect(rows[0]!.listed).toBe("25/10/26");
  });

  it("finds no act on a page past the last", () => {
    expect(parseListing("<html><body><div class='view-empty'></div></body></html>")).toEqual([]);
  });
});

describe("WordPress posts (the President of South Ossetia, read 2026-11-10)", () => {
  const posts = parsePosts(JSON.parse(fixture("presidentruo-posts.fixture.json")));

  it("reads id, day, link and title", () => {
    expect(posts[0]).toEqual({
      id: "603",
      date: "2012-04-19",
      link: "https://presidentruo.org/ukaz-o-pravitelstve-respubliki-yuzhnaya-osetiya-2/",
      title: "Указ «О Правительстве Республики Южная Осетия»",
    });
    expect(posts).toHaveLength(3);
  });

  it("fails loudly when the API changes shape", () => {
    expect(() => parsePosts({ code: "rest_post_invalid_page_number" })).toThrow();
    expect(() => parsePosts([{ id: "603" }])).toThrow(/unexpected shape/);
  });
});

describe("South Ossetia's publishers as config", () => {
  it("name an authority that exists, whose place is the one the Places pack holds", () => {
    const so = LAW_AUTHORITIES.find((a) => a.key === "rso");
    expect(so?.place).toEqual({ scheme: "wikidata", value: "Q23427" });
    expect(PARLIAMENTRSO.authority).toBe("rso");
    expect(PRESIDENTRUO.authority).toBe("rso");
  });

  it("read only their own hosts, over https", () => {
    for (const url of [PARLIAMENTRSO.listingUrl, PARLIAMENTRSO.pageUrl, PARLIAMENTRSO.robotsUrl]) {
      expect(PARLIAMENTRSO.hosts).toContain(new URL(url.replace(/\{\w+\}/g, "1")).hostname);
      expect(url.startsWith("https://")).toBe(true);
    }
    expect(PRESIDENTRUO.hosts).toContain(new URL(PRESIDENTRUO.postsUrl).hostname);
  });

  it("honour the crawl-delay the Parliament's robots.txt declared on 2026-11-10", () => {
    const robots =
      "User-agent: Yandex\nAllow: /rssyandex.xml\n\nUser-agent: *\nCrawl-delay: 90\nDisallow: /search/\n";
    expect(crawlDelayMs(robots)).toBe(90_000);
  });
});

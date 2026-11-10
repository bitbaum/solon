import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  cutProvisions,
  linesOf,
  numberOf,
  parseNode,
  postText,
  signedOn,
  titleFromBody,
} from "../so-text";
import { parsePosts } from "../wp-rest";

const fixture = (name: string) => readFileSync(join(__dirname, "fixtures", name), "utf8");

describe("a law of the Parliament (node 5546, read 2026-11-10)", () => {
  const node = parseNode(fixture("parliamentrso-node-5546.fixture.html"))!;
  const text = linesOf(node.bodyHtml);
  const provisions = cutProvisions(text);

  it("takes the day from the page's own date field, not from the site's listing", () => {
    expect(node.enacted).toBe("2004-02-18");
  });

  it("cuts a preamble, chapters and articles under their own numbers", () => {
    expect(provisions.map((p) => p.path)).toEqual(["preamble", "ch_i", "art_1", "art_2", "art_3"]);
    expect(provisions[2]!.heading).toBe("Статья 1. Основные понятия и термины");
    expect(provisions[0]!.text).toContain("Принят Парламентом РЮО");
  });

  it("loses no word in the cut", () => {
    const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
    expect(provisions.reduce((n, p) => n + words(p.text), 0)).toBe(words(text));
  });

  it("reads the number the header prints", () => {
    expect(numberOf(text)).toBe("44");
  });
});

describe("the Constitution (node 3567)", () => {
  const node = parseNode(fixture("parliamentrso-node-3567.fixture.html"))!;
  const provisions = cutProvisions(linesOf(node.bodyHtml));

  it("cuts articles the page numbers without a full stop", () => {
    expect(provisions.map((p) => p.path)).toContain("art_1");
    expect(provisions.find((p) => p.path === "art_3")!.text).toContain(
      "состоит из пяти административно-территориальных единиц",
    );
  });

  it("takes the date of the page's date field", () => {
    expect(node.enacted).toBe("2019-04-11");
  });
});

describe("a decree of the President (post 89961)", () => {
  const post = postText(JSON.parse(fixture("presidentruo-post-89961.fixture.json")));

  it("reads the day it was signed and its number from the closing lines", () => {
    expect(signedOn(post.text)).toBe("2026-11-06");
    expect(numberOf(post.text)).toBe("494");
  });

  it("keeps an act without articles whole", () => {
    const provisions = cutProvisions(post.text);
    expect(provisions).toHaveLength(1);
    expect(provisions[0]!.path).toBe("text");
    expect(provisions[0]!.text).toContain("постановляю");
  });
});

describe("what is not an act", () => {
  it("is refused: a page with no body, and a post with no content", () => {
    expect(parseNode("<html>nothing here</html>")).toBeNull();
    expect(() => postText({ id: 1 })).toThrow(/no content/);
  });

  it("prints no date or number it was not given", () => {
    expect(signedOn("Указ без даты")).toBeNull();
    expect(numberOf("Указ без номера")).toBeNull();
  });
});

describe("verify reads the act's words, not the Drupal page's menus", () => {
  it("keeps the body of a node page and nothing around it", async () => {
    const { regionOf } = await import("../verify");
    const html = fixture("parliamentrso-node-5546.fixture.html");
    const region = regionOf(
      `<nav>Структура Парламента</nav><div class="x"><div class="field field-name-body"><div property="content:encoded">${html}`,
      "rso",
    );
    expect(region).not.toContain("Структура Парламента");
    expect(regionOf("<p>any page</p>", "li")).toBe("<p>any page</p>");
  });
});

describe("a title for an act the site titles with a bare type word", () => {
  it("is the word with the day the act prints, as printed (post 56034, 2021)", () => {
    const text =
      "3. Настоящий Указ вступает в силу со дня его подписания.\nПрезидент Республики Южная Осетия А. БИБИЛОВ\nг. Цхинвал, 27 апреля 2021 г.";
    expect(titleFromBody("Указ", text)).toBe("Указ от 27 апреля 2021 г.");
  });

  it("adds the number when the act prints one", () => {
    const text =
      "Президент Республики Южная Осетия М. КАМБОЛОВ\nг. Цхинвал, 6 ноября 2026 г.\n№494";
    expect(titleFromBody("Указ", text)).toBe("Указ от 6 ноября 2026 г. № 494");
  });

  it("is nothing when the act prints no day: no title is made up", () => {
    expect(titleFromBody("Указ", "Принять отставку Правительства.")).toBeNull();
  });
});

describe("a title as the publisher printed it", () => {
  it("keeps a typo of the publisher's (a zero for the letter О), and decodes only entities", () => {
    const [post] = parsePosts([
      {
        id: 1,
        date: "2026-01-01T00:00:00",
        link: "https://presidentruo.org/a/",
        title: { rendered: "Указ «0 награждении орденом &laquo;Дружбы&raquo;»" },
      },
    ]);
    expect(post!.title).toBe("Указ «0 награждении орденом «Дружбы»»");
  });
});

describe("verify reads a decree kept as JSON through its content field", () => {
  it("takes the post's rendered HTML, and fails loudly when there is none", async () => {
    const { JSON_BODIES } = await import("../verify");
    const body = JSON_BODIES.rso!(JSON.parse(fixture("presidentruo-post-89961.fixture.json")));
    expect(body).toContain("постановляю");
    expect(() => JSON_BODIES.rso!({ id: 1 })).toThrow(/no content/);
  });
});

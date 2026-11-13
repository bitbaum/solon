import { describe, expect, it } from "vitest";
import { createPause, isCrawler } from "../translate";

describe("the pause after nobody answered", () => {
  it("holds for its length and then lets the route ask again", () => {
    let now = 1_000;
    const pause = createPause(600_000, () => now);
    expect(pause.active()).toBe(false);
    pause.start();
    expect(pause.active()).toBe(true);
    now += 599_999;
    expect(pause.active()).toBe(true);
    now += 1;
    expect(pause.active()).toBe(false);
  });
});

describe("a program reading the page is not translated for", () => {
  it("names crawlers, headless browsers and scripts", () => {
    for (const ua of [
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "Mozilla/5.0 (compatible; bingbot/2.0)",
      "Mozilla/5.0 (X11; Linux x86_64) HeadlessChrome/131.0.0.0 Safari/537.36",
      "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2)",
      "curl/8.5.0",
      "python-requests/2.32",
      "",
      null,
    ])
      expect(isCrawler(ua), String(ua)).toBe(true);
  });
  it("lets a person's browser through", () => {
    for (const ua of [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0",
    ])
      expect(isCrawler(ua), ua).toBe(false);
  });
});

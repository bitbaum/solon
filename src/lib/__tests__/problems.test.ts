/**
 * The front page's "What it solves" cards make promises, so they are pinned:
 * every card links to a page that exists, rests only on capabilities that are
 * available today, has its words in English, and says nothing that sounds like
 * the roadmap. A card whose feature is not live yet does not belong there.
 */
import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import { PROBLEM_SCALES, problemHref } from "@/lib/content/problems";
import { CAPABILITIES } from "@/lib/content/capabilities";
import en from "../../../messages/en.json";

const items = PROBLEM_SCALES.flatMap((s) => s.items);
const app = path.join(process.cwd(), "src/app", "[locale]");
const pageFile = (href: string) => path.join(app, ...href.slice(1).split("/"), "page.tsx");

describe("problems we solve", () => {
  it("covers one person and society, with something in each", () => {
    expect(PROBLEM_SCALES.map((s) => s.key)).toEqual(["you", "everyone"]);
    for (const scale of PROBLEM_SCALES) expect(scale.items.length).toBeGreaterThan(0);
  });

  it("uses each card once, and every card in the messages has a place", () => {
    const keys = items.map((i) => i.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect([...keys].sort()).toEqual(Object.keys(en.Home.problems.items).sort());
  });

  it.each(items.map((i) => [i.key, i] as const))("%s links to a page that exists", (_k, item) => {
    const href = problemHref(item.link);
    expect(href.startsWith("/")).toBe(true);
    expect(existsSync(pageFile(href))).toBe(true);
  });

  it("rests only on capabilities that are available today", () => {
    const notLive = items.filter((i) => i.capability && CAPABILITIES[i.capability] !== "available");
    expect(notLive.map((i) => `${i.key}: ${i.capability}`)).toEqual([]);
  });

  it("says nothing that sounds like the roadmap", () => {
    const words = items.flatMap((i) => {
      const m = en.Home.problems.items[i.key];
      return [m.problem, m.solution];
    });
    const text = words.join(" ").toLowerCase();
    for (const unshipped of [
      "soon",
      "coming",
      "planned",
      "will be",
      "roadmap",
      "in development",
      "passkey",
      "bank statement",
      "export",
    ]) {
      expect(text).not.toContain(unshipped);
    }
  });
});

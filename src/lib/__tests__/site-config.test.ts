/**
 * The site's link map is one list, and the header may only use part of it.
 *
 * The header and the footer used to keep separate lists of routes, and a page
 * removed from one survived in the other. Now SITE_SECTIONS is the only list,
 * and these tests are what make "a subset of it" structural rather than a hope.
 */
import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import { HIRE_HREF, PRIMARY_NAV, SITE_LINKS, SITE_SECTIONS } from "@/lib/site-config";
import en from "../../../messages/en.json";

const internal = (href: string) => href.startsWith("/");

/** The page file a route would render from, across route groups. */
function routeExists(href: string): boolean {
  const app = path.join(process.cwd(), "src/app", "[locale]");
  const segments = href === "/" ? [] : href.slice(1).split("/");
  const candidates = [
    path.join(app, ...segments, "page.tsx"),
    path.join(app, "(dashboard)", ...segments, "page.tsx"),
  ];
  return candidates.some((c) => existsSync(c));
}

describe("SITE_SECTIONS", () => {
  it("links only to pages that exist", () => {
    const missing = SITE_LINKS.filter((l) => internal(l.href) && !routeExists(l.href));
    expect(missing.map((l) => l.href)).toEqual([]);
  });

  it("names every page once", () => {
    const hrefs = SITE_LINKS.map((l) => l.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("gives every section and link an English name", () => {
    for (const section of SITE_SECTIONS) {
      expect(en.Site.sections[section.key].trim()).not.toBe("");
      for (const link of section.children) expect(en.Site.links[link.key].trim()).not.toBe("");
      expect(section.children.length).toBeGreaterThan(0);
    }
  });
});

describe("PRIMARY_NAV", () => {
  it("is a subset of the site map", () => {
    const known = new Set(SITE_LINKS.map((l) => l.href));
    expect(PRIMARY_NAV.filter((l) => !known.has(l.href))).toEqual([]);
    expect(known.has(HIRE_HREF)).toBe(true);
  });

  it("stays short enough to fit on one line", () => {
    // Six mega-menus wrapped the header onto two lines at 1440px. Three links
    // plus sign-in plus one call to action is the budget.
    expect(PRIMARY_NAV.length).toBeLessThanOrEqual(4);
  });
});

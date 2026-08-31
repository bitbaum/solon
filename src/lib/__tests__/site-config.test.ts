/**
 * The footer may only point at routes the nav says exist.
 *
 * `NAV_ITEMS` carries the comment "only routes that actually exist belong here
 * — a nav link to a 404 is a lie", and the footer carried the same sentence
 * about itself. But the footer restated six of those routes as its own literal
 * `<Link>`s, and nothing tied the two lists together: removing a page from the
 * nav left the footer pointing at it, with no way to notice. Both files
 * promised the same thing and only one could keep it.
 *
 * `FOOTER_SECTIONS` now names hrefs instead of repeating them, and this test is
 * what makes that structural rather than a convention.
 */
import { describe, it, expect } from "vitest";
import {
  NAV_ITEMS,
  NAV_CHILDREN,
  FOOTER_SECTIONS,
  footerLinkLabel,
} from "@/lib/site-config";

const internal = (href: string) => href.startsWith("/");

describe("FOOTER_SECTIONS", () => {
  it("only points at routes NAV_ITEMS declares", () => {
    const known = new Set(NAV_CHILDREN.filter((c) => internal(c.href)).map((c) => c.href));
    const unknown = FOOTER_SECTIONS.flatMap((s) =>
      s.links.filter((l) => !known.has(l.href)).map((l) => `${s.title} → ${l.href}`),
    );
    expect(unknown, `not in NAV_ITEMS:\n${unknown.join("\n")}`).toEqual([]);
  });

  it("inherits the nav's wording unless it deliberately overrides it", () => {
    // /features carries no label, so it must read exactly as the nav does. If
    // someone renames it in NAV_ITEMS, the footer follows without an edit.
    const navFeatures = NAV_CHILDREN.find((c) => c.href === "/features");
    const footFeatures = FOOTER_SECTIONS.flatMap((s) => s.links).find(
      (l) => l.href === "/features" && !l.label,
    );
    expect(navFeatures).toBeDefined();
    expect(footFeatures).toBeDefined();
    expect(footerLinkLabel(footFeatures!)).toBe(navFeatures!.title);
  });

  it("keeps the deliberate short labels", () => {
    // The footer says "Voting" where the nav says "How voting works". That is a
    // choice, not drift — so it is written down as an override rather than as a
    // second copy of the route.
    const voting = FOOTER_SECTIONS.flatMap((s) => s.links).find(
      (l) => l.href === "/governance/voting",
    );
    expect(voting?.label).toBe("Voting");
    expect(footerLinkLabel(voting!)).toBe("Voting");
  });

  it("has no duplicate href within one footer section", () => {
    for (const section of FOOTER_SECTIONS) {
      const hrefs = section.links.map((l) => l.href);
      expect(new Set(hrefs).size, `duplicate in ${section.title}`).toBe(hrefs.length);
    }
  });
});

describe("NAV_ITEMS", () => {
  it("declares no duplicate internal href", () => {
    const hrefs = NAV_CHILDREN.filter((c) => internal(c.href)).map((c) => c.href);
    // /integration is deliberately reachable as both "Integration" and "API",
    // so compare the (href,title) pair rather than the href alone.
    const pairs = NAV_CHILDREN.filter((c) => internal(c.href)).map((c) => `${c.href}|${c.title}`);
    expect(new Set(pairs).size).toBe(pairs.length);
    expect(hrefs.length).toBeGreaterThan(0);
  });

  it("gives every section a title", () => {
    for (const section of NAV_ITEMS) {
      expect(section.title.trim()).not.toBe("");
    }
  });
});

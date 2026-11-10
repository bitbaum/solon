/**
 * The header knows which pages open on a photograph from a list, so that the
 * server renders it in the right theme. A list beside the pages can drift
 * from them; this test reads the pages and holds the list to them.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { HEADER_OVER_PHOTO_ROUTES, isHeaderOverPhoto } from "@/lib/site-config";

const APP = path.join(process.cwd(), "src/app/[locale]");

function pages(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return pages(full);
    return name === "page.tsx" ? [full] : [];
  });
}

/** The route a page file serves: route groups `(x)` drop out of the path. */
function routeOf(file: string): string {
  const segments = path
    .relative(APP, path.dirname(file))
    .split(path.sep)
    .filter((s) => s && !/^\(.*\)$/.test(s));
  return `/${segments.join("/")}`;
}

/** A `<FullBleed …>` opening tag that carries the bare `under` and `alwaysDark` props. */
const UNDER = /<FullBleed\b[^>]*>/g;

function slidesDarkPhotoUnderHeader(source: string): boolean {
  return (source.match(UNDER) ?? []).some(
    (tag) => /\sunder\b/.test(tag) && /\salwaysDark\b/.test(tag),
  );
}

describe("HEADER_OVER_PHOTO_ROUTES", () => {
  const found = pages(APP)
    .filter((f) => slidesDarkPhotoUnderHeader(readFileSync(f, "utf8")))
    .map(routeOf)
    .sort();

  it("lists exactly the pages that slide an always-dark photograph under the header", () => {
    expect(found.length).toBeGreaterThan(0);
    expect([...HEADER_OVER_PHOTO_ROUTES].sort()).toEqual(found);
  });

  it("matches a dynamic segment, and nothing deeper or shallower", () => {
    expect(isHeaderOverPhoto("/governance/new-era")).toBe(true);
    expect(isHeaderOverPhoto("/governance")).toBe(false);
    expect(isHeaderOverPhoto("/governance/new-era/x")).toBe(false);
    expect(isHeaderOverPhoto("/")).toBe(false);
    expect(isHeaderOverPhoto("/places")).toBe(false);
  });
});

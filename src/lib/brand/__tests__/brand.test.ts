import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { markFor } from "@fleet/design-tokens/marks";

import { SOLON_MARK } from "../mark";
import { iconSvg } from "../svg";

const root = join(__dirname, "../../../..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

/**
 * The owl lives in @bitbaum/design-tokens/marks; everything here is drawn
 * from it by `pnpm run brand`. These fail when someone edits a copy instead
 * of the package, or raises the package without running the script.
 */
describe("Solon's mark has one source", () => {
  it("is the package's mark for solon", () => {
    expect(SOLON_MARK.mark).toBe(markFor("solon"));
    expect(SOLON_MARK.d).toBe(markFor("solon")!.shapes[0]!.d);
  });

  it("is drawn in the pack's ink, not OrangeCat's orange", () => {
    expect(read("src/app/icon.svg")).not.toMatch(/ff5c00/i);
    expect(read("brand/export/solon-mark-accent.svg")).not.toMatch(/ff5c00/i);
    expect(read("src/app/[locale]/opengraph-image.tsx")).not.toMatch(/ff5c00/i);
  });

  it("sets the brand theme, so the accent and its label are Solon's", () => {
    expect(read("src/app/[locale]/layout.tsx")).toContain('data-brand="solon"');
  });

  it("the favicon and the app icon are the mark on its tile", () => {
    expect(read("src/app/icon.svg")).toBe(iconSvg());
    expect(read("public/app-icons/icon.svg")).toBe(iconSvg());
    expect(read("brand/export/solon-icon.svg")).toBe(iconSvg());
  });

  it("keeps no drawing of its own", () => {
    expect(readdirSync(join(root, "brand")).filter((f) => f.endsWith(".svg"))).toEqual([]);
  });

  it("nothing else draws a mark of its own", () => {
    for (const file of ["src/components/ui/logo.tsx", "src/app/[locale]/opengraph-image.tsx"]) {
      expect(read(file)).toContain("SOLON_MARK.d");
    }
  });
});

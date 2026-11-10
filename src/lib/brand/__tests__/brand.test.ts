import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { SOLON_MARK } from "../mark";
import { iconSvg } from "../svg";

const root = join(__dirname, "../../../..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

/**
 * The drawing is the source; everything else is written from it by
 * `pnpm run brand`. These fail when someone edits a copy instead of the
 * drawing, or changes the drawing without running the script.
 */
describe("Solon's mark has one source", () => {
  it("the generated data is the drawing's path", () => {
    const drawing = read("brand/solon-mark.svg");
    expect(drawing).toContain(`d="${SOLON_MARK.d}"`);
    expect(drawing).toContain(`viewBox="${SOLON_MARK.viewBox.join(" ")}"`);
  });

  it("the favicon and the app icon are the mark on its tile", () => {
    expect(read("src/app/icon.svg")).toBe(iconSvg());
    expect(read("public/app-icons/icon.svg")).toBe(iconSvg());
  });

  it("nothing else draws a mark of its own", () => {
    for (const file of ["src/components/ui/logo.tsx", "src/app/[locale]/opengraph-image.tsx"]) {
      expect(read(file)).toContain("SOLON_MARK.d");
    }
  });
});

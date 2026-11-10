/**
 * Solon's mark — the owl — from @bitbaum/design-tokens/marks (installed here
 * as @fleet/design-tokens), the one place the fleet's marks live. OrangeCat's
 * tiles and Solon's own header, share card and icons draw the same data, so
 * the owl is replaced once, in that package (`marks:import solon <file.svg>`),
 * and a release carries it everywhere. See brand/README.md.
 */
import { markFor } from "@fleet/design-tokens/marks";

const mark = markFor("solon");
if (!mark || mark.shapes.length !== 1 || mark.shapes[0]!.paint !== "fill") {
  throw new Error("@fleet/design-tokens/marks: Solon's mark must be one filled shape");
}
const [shape] = mark.shapes;

/** The whole mark as data: `mark` for the package's helpers, the path for React and satori. */
export const SOLON_MARK = {
  mark,
  name: mark.name,
  viewBox: mark.viewBox,
  fillRule: (shape!.fillRule ?? "nonzero") as "evenodd" | "nonzero",
  d: shape!.d,
};

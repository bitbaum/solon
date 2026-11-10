/**
 * The owl as standalone `<svg>` markup, for everything that cannot render
 * React: the static icons `pnpm run brand` writes, and the test that holds
 * those files to the mark. Drawn by the package's own helpers, so Solon's
 * icons have the same proportions as OrangeCat's and Loki's.
 */
import { ICON_STYLE, iconSvg as tile, markSvg as draw } from "@fleet/design-tokens/marks";
import { SOLON_MARK } from "./mark";

export { ICON_STYLE };

/** The colour Solon's icon wears: the public accent (`--public-accent`), stored with the mark. */
export const ICON_INK = SOLON_MARK.mark.iconInk ?? ICON_STYLE.ink;

/** The mark alone, in one colour, as an SVG file. */
export const markSvg = (options: { color?: string } = {}): string =>
  `${draw(SOLON_MARK.mark, options)}\n`;

/** The app icon: the mark on its tile (maskable: full bleed, inside the safe zone). */
export const iconSvg = (maskable = false): string => `${tile(SOLON_MARK.mark, { maskable })}\n`;

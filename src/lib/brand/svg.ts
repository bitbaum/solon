/**
 * The mark as standalone `<svg>` markup, for everything that cannot render
 * React: the static icons the generator writes, the share card, the test
 * that holds those files to the drawing. React surfaces render <Logo>, which
 * draws the same path.
 */

import { SOLON_MARK } from "./mark";

/**
 * How Solon's icons look: the mark in the public accent on the near-black
 * tile every fleet app icon sits on. These are literals because favicons and
 * PNGs cannot read CSS; they mirror `--public-accent` and `--surface-public`
 * in @fleet/design-tokens.
 */
export const ICON_STYLE = {
  ink: "#ff5c00",
  canvas: "#0a0a0a",
  /** Corner radius as a share of the tile's side. */
  radius: 0.22,
  /** How much of the tile the mark fills. */
  inset: 0.82,
  /** Maskable icons keep the mark inside the centre safe zone. */
  maskableInset: 0.64,
} as const;

export interface MarkSvgOptions {
  size?: number;
  color?: string;
  /** A square tile of this colour behind the mark. */
  background?: string;
  radius?: number;
  inset?: number;
}

const n = (v: number) => String(Number(v.toFixed(3)));

export function markSvg(options: MarkSvgOptions = {}): string {
  const { size, color = "currentColor", background, radius = 0, inset = 1 } = options;
  const [, , w] = SOLON_MARK.viewBox;
  const dims = size === undefined ? "" : ` width="${size}" height="${size}"`;
  const tile = background
    ? `<rect width="${w}" height="${w}" rx="${n(w * radius)}" fill="${background}"/>`
    : "";
  const path = `<path fill="${color}" fill-rule="${SOLON_MARK.fillRule}" d="${SOLON_MARK.d}"/>`;
  const body =
    inset === 1
      ? path
      : `<g transform="translate(${n(w / 2)} ${n(w / 2)}) scale(${n(inset)}) translate(${n(-w / 2)} ${n(-w / 2)})">${path}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${SOLON_MARK.viewBox.join(" ")}"${dims}>${tile}${body}</svg>\n`;
}

/** The app icon: the mark on its tile. */
export function iconSvg(maskable = false): string {
  return markSvg({
    color: ICON_STYLE.ink,
    background: ICON_STYLE.canvas,
    radius: maskable ? 0 : ICON_STYLE.radius,
    inset: maskable ? ICON_STYLE.maskableInset : ICON_STYLE.inset,
  });
}

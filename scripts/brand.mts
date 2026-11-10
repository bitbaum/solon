/**
 * Solon's mark lives in ONE file: brand/solon-mark.svg. This script turns it
 * into everything else, so changing the logo is replacing that drawing and
 * running
 *
 *   pnpm run brand            # data + SVG icons (what CI checks)
 *   pnpm run brand -- --png   # also the PNG and ICO rasters (needs Chromium)
 *
 * It writes:
 *   src/lib/brand/mark.ts        the path, as data — <Logo>, the share card
 *   src/app/icon.svg             the favicon (Next's file convention)
 *   public/app-icons/icon.svg    the app icon
 *   public/app-icons/*.png       192, 512, maskable 512   (--png)
 *   src/app/favicon.ico          16 + 32 + 48             (--png)
 *   src/app/apple-icon.png       180, the iOS home screen  (--png)
 *   brand/export/*               mark and tile in ink, white and accent, for
 *                                decks, press and OrangeCat's project listing
 *
 * The drawing must be ONE filled path (the mark is one colour; holes are cut
 * with fill-rule evenodd). Export from any editor as plain SVG with outlined,
 * flattened shapes, merged into a single compound path.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const src = readFileSync(join(root, "brand/solon-mark.svg"), "utf8");

const viewBox = /viewBox="([^"]+)"/
  .exec(src)?.[1]
  .trim()
  .split(/[\s,]+/)
  .map(Number);
const paths = [...src.matchAll(/<path\b[^>]*>/g)].map((m) => m[0]);
if (!viewBox || viewBox.length !== 4) throw new Error("brand/solon-mark.svg: no viewBox");
if (paths.length !== 1) {
  throw new Error(
    `brand/solon-mark.svg: expected one <path>, found ${paths.length}. Merge the shapes into one compound path.`,
  );
}
if (/transform=/.test(src)) throw new Error("brand/solon-mark.svg: flatten transforms first");
const d = /\sd="([^"]+)"/.exec(paths[0])?.[1];
if (!d) throw new Error("brand/solon-mark.svg: the path has no d");
const fillRule = /fill-rule="(evenodd|nonzero)"/.exec(paths[0])?.[1] ?? "nonzero";

writeFileSync(
  join(root, "src/lib/brand/mark.ts"),
  `/**
 * GENERATED from brand/solon-mark.svg by \`pnpm run brand\`. Do not edit:
 * change the drawing and run the script.
 */

export const SOLON_MARK = {
  name: "Solon",
  viewBox: [${viewBox.join(", ")}] as const,
  fillRule: "${fillRule}" as "evenodd" | "nonzero",
  d: "${d}",
};
`,
);

// Imported after mark.ts is written so the icons use the drawing just read.
const { iconSvg, markSvg, ICON_STYLE } = await import("../src/lib/brand/svg.ts");

writeFileSync(join(root, "src/app/icon.svg"), iconSvg());
writeFileSync(join(root, "public/app-icons/icon.svg"), iconSvg());

const out = join(root, "brand/export");
mkdirSync(out, { recursive: true });
const inks = { ink: "#141414", white: "#ffffff", accent: ICON_STYLE.ink };
for (const [name, color] of Object.entries(inks)) {
  writeFileSync(join(out, `solon-mark-${name}.svg`), markSvg({ color }));
}
writeFileSync(join(out, "solon-icon.svg"), iconSvg());

if (process.argv.includes("--png")) {
  const { chromium } = await import("@playwright/test");
  // CHROMIUM_PATH points at a system Chromium when the pinned one is not installed.
  const browser = await chromium.launch(
    process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  );
  const page = await browser.newPage();
  const raster = async (svg: string, size: number) => {
    await page.setViewportSize({ width: size, height: size });
    const sized = svg.replace("<svg ", `<svg width="${size}" height="${size}" `);
    await page.setContent(
      `<style>html,body{margin:0;background:transparent}svg{display:block}</style>${sized}`,
    );
    return page.screenshot({
      omitBackground: true,
      clip: { x: 0, y: 0, width: size, height: size },
    });
  };
  writeFileSync(join(root, "public/app-icons/icon-192.png"), await raster(iconSvg(), 192));
  writeFileSync(join(root, "public/app-icons/icon-512.png"), await raster(iconSvg(), 512));
  writeFileSync(join(root, "public/app-icons/maskable-512.png"), await raster(iconSvg(true), 512));
  // iOS draws its own rounded corners on the home screen: the full-bleed tile, at 180.
  writeFileSync(join(root, "src/app/apple-icon.png"), await raster(iconSvg(true), 180));
  for (const [name, color] of Object.entries(inks)) {
    writeFileSync(join(out, `solon-mark-${name}-1024.png`), await raster(markSvg({ color }), 1024));
  }
  writeFileSync(join(out, "solon-icon-1024.png"), await raster(iconSvg(), 1024));
  // An ICO holding PNGs: a 6-byte header, a 16-byte entry per image, the images.
  const sizes = [16, 32, 48];
  const images = await Promise.all(sizes.map((s) => raster(iconSvg(), s)));
  const head = Buffer.alloc(6 + 16 * sizes.length);
  head.writeUInt16LE(0, 0);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(sizes.length, 4);
  let offset = head.length;
  sizes.forEach((s, i) => {
    const e = 6 + 16 * i;
    head.writeUInt8(s, e);
    head.writeUInt8(s, e + 1);
    head.writeUInt16LE(1, e + 4);
    head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(images[i].length, e + 8);
    head.writeUInt32LE(offset, e + 12);
    offset += images[i].length;
  });
  writeFileSync(join(root, "src/app/favicon.ico"), Buffer.concat([head, ...images]));
  await browser.close();
}
console.log(
  "brand: wrote mark.ts, icons and exports" +
    (process.argv.includes("--png") ? " (with rasters)" : ""),
);

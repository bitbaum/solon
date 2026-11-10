/**
 * How a place's photograph is chosen (`pnpm run places:photos`): pure, so the
 * rules are tested on the answers Wikimedia Commons gives.
 */

/** One of the widths Wikimedia keeps thumbnails at (…, 960, 1280, 1920, 3840); others are throttled. */
export const PHOTO_WIDTH = 1920;

export interface PhotoInfo {
  file: string;
  width: number;
  height: number;
  mime: string;
  src: string;
  author: string;
  license: string;
  licenseUrl: string | null;
  wikitext?: string;
}

/**
 * A free licence Solon may show a photograph under, unchanged, with its author: public domain,
 * CC0, CC BY, CC BY-SA, the Free Art License.
 */
const FREE = /^(public domain|pd\b|cc0|cc[ -]by(?:[ -]sa)?[ -]\d|fal\b|free art)/i;

export const free = (i: PhotoInfo | undefined): i is PhotoInfo =>
  !!i && FREE.test(i.license) && /^image\/(jpeg|png|webp|tiff)$/.test(i.mime);

const notAMap = (i: PhotoInfo) =>
  !/\b(map|flag|locator|location|coat of arms|emblem|seal|satellite)\b/i.test(i.file);

/** A photograph that fills a screen: wide, but not a panorama a screen would have to enlarge. */
export const fullPhoto = (i: PhotoInfo | undefined): i is PhotoInfo =>
  free(i) &&
  notAMap(i) &&
  i.width >= 1600 &&
  i.width / i.height >= 1.2 &&
  i.width / i.height <= 2.4;

/** A panorama or a banner: shown as a strip across the top. */
export const strip = (i: PhotoInfo | undefined): i is PhotoInfo =>
  free(i) && notAMap(i) && i.width / i.height > 2.4;

/**
 * A thumbnail address at PHOTO_WIDTH, without the tracking parameters Commons adds: Commons
 * answers with the next width it keeps (3840) and the photograph is shown at PHOTO_WIDTH at most.
 */
export const thumbAt = (url: string, width: number) =>
  url.replace(/\?.*$/, "").replace(/\/\d+px-/, width > PHOTO_WIDTH ? `/${PHOTO_WIDTH}px-` : "/");

/** The photograph a Wikivoyage banner was cut from, as its file page names it. */
export function bannerSource(wikitext: string | undefined): string | null {
  if (!wikitext) return null;
  const m =
    /\{\{\s*(?:extracted from|derived from|image extracted|cropped from|crop of|extracted)\s*\|\s*(?:1\s*=\s*)?(?:(?:file|image)\s*:\s*)?([^|}\n]+?)\s*[|}]/i.exec(
      wikitext,
    ) ??
    /\|\s*source\s*=[^\n]*?\[\[\s*:?\s*(?:file|image)\s*:\s*([^|\]]+?)\s*[|\]]/i.exec(wikitext);
  return m ? m[1]!.replace(/_/g, " ").trim() : null;
}

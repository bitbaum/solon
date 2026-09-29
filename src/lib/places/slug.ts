/**
 * Readable paths for state places: the pack key, then one segment per place
 * down the `part_of` chain, each from the place's own name (design §4.1). No
 * ISO codes, since not every place has one.
 */

/** Latin letters that Unicode decomposition leaves whole. */
const LATIN_LIGATURES: Record<string, string> = {
  ß: "ss",
  æ: "ae",
  œ: "oe",
  ø: "o",
  đ: "d",
  ł: "l",
  þ: "th",
  ð: "d",
};

/**
 * One path segment from a name, or null when nothing of it survives (a name
 * in a script this does not transliterate); the caller then falls back to the
 * place's identifier.
 */
export function slugSegment(name: string, transliterate: boolean): string | null {
  let text = name.toLowerCase();
  if (transliterate) {
    text = text
      .normalize("NFKD")
      .replace(/\p{M}+/gu, "")
      .replace(/[ßæœøđłþð]/g, (letter) => LATIN_LIGATURES[letter] ?? letter);
  }
  const segment = text.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "");
  if (!segment) {
    return null;
  }
  return !transliterate || /^[a-z0-9-]+$/.test(segment) ? segment : null;
}

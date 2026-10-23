/** Plain text out of a fragment of a publisher's HTML. */

const NAMED: Readonly<Record<string, string>> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  sect: "§",
  auml: "ä",
  ouml: "ö",
  uuml: "ü",
  Auml: "Ä",
  Ouml: "Ö",
  Uuml: "Ü",
  szlig: "ß",
  eacute: "é",
  egrave: "è",
  agrave: "à",
  ccedil: "ç",
  euro: "€",
  ndash: "–",
  mdash: "—",
  laquo: "«",
  raquo: "»",
  bdquo: "„",
  ldquo: "“",
  rdquo: "”",
  lsquo: "‘",
  rsquo: "’",
  deg: "°",
  middot: "·",
};

export function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&([A-Za-z]+);/g, (whole, name: string) => NAMED[name] ?? whole);
}

/** Tags removed, block ends become line breaks, entities decoded, blank lines dropped. */
export function blockText(fragment: string): string {
  return decodeEntities(
    fragment
      .replace(/<div|<\/div>|<br\s*\/?>|<\/p>/g, (m) => (m === "<div" ? "\n<div" : "\n"))
      .replace(/<[^>]+>/g, ""),
  )
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

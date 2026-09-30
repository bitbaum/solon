/**
 * How a typed name meets a recorded one: without case or accents, and with the
 * umlaut spelled out as people type it without one, so "zurich" and "Zuerich"
 * both find Zürich. The query is folded here and names in SQL (`search.ts`),
 * from this one table, so both sides always fold alike. No imports: the map's
 * search box folds in the browser too.
 */

const DECOMPOSING = "àáâãäåāăąçćčďèéêëēėęěìíîïīįñńňòóôõöōőŕřśšşťùúûüūůűýÿźżž";
const OTHERS: [string, string][] = [
  ["ł", "l"],
  ["ø", "o"],
];

const pairs: [string, string][] = [
  ...[...DECOMPOSING].map((c): [string, string] => [c, c.normalize("NFD")[0]!]),
  ...OTHERS,
].flatMap(([from, to]) => [
  [from, to],
  [from.toUpperCase(), to],
]);
const TABLE = new Map(pairs);
/** The table as SQL `translate` takes it: each character of FROM becomes the one at its place in TO. */
export const FOLD_FROM = pairs.map(([from]) => from).join("");
export const FOLD_TO = pairs.map(([, to]) => to).join("");

const UMLAUTS_SPELLED = /ae|oe|ue/g;

/** A name or query as matching sees it. */
export function foldName(text: string): string {
  return [...text]
    .map((c) => TABLE.get(c) ?? c)
    .join("")
    .toLowerCase()
    .replace(UMLAUTS_SPELLED, (pair) => pair[0]!);
}

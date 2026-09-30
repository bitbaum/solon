/**
 * How a typed name meets a recorded one: without case or accents, and with the
 * umlaut spelled out as people type it without one, so "zurich" and "Zuerich"
 * both find Zürich. The query is folded here and names in SQL, from one table,
 * so both sides always fold alike.
 */
import { sql, type SQL } from "drizzle-orm";
import type { AnyColumn } from "drizzle-orm";

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
const FROM = pairs.map(([from]) => from).join("");
const TO = pairs.map(([, to]) => to).join("");

const UMLAUTS_SPELLED = /ae|oe|ue/g;

/** A name or query as matching sees it. */
export function foldName(text: string): string {
  return [...text]
    .map((c) => TABLE.get(c) ?? c)
    .join("")
    .toLowerCase()
    .replace(UMLAUTS_SPELLED, (pair) => pair[0]!);
}

/** `column`, folded in SQL exactly as `foldName` folds text. */
export function foldedColumn(column: AnyColumn): SQL<string> {
  return sql<string>`replace(replace(replace(lower(translate(${column}, ${FROM}, ${TO})), 'ae', 'a'), 'oe', 'o'), 'ue', 'u')`;
}

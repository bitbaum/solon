/**
 * Identifier crosswalks: one scheme's value read as another's, where an
 * official register numbers places in a way no other source keeps. A place
 * known by the first is found by the second too (its photograph, for one).
 * Policy in config: the engine knows no scheme by name.
 */
import { MODELLED_CANTONS } from "./sources";

export interface IdentifierCrosswalk {
  from: string;
  to: string;
  values: Readonly<Record<string, string>>;
}

export const IDENTIFIER_CROSSWALKS: readonly IdentifierCrosswalk[] = [
  // A canton's FSO number to its ISO 3166-2 code: ISO's code is "CH-" and the
  // canton's own two letters (all 26 checked against Wikidata P300 and P395,
  // 2026-11-10). Wikidata keeps no FSO canton number.
  {
    from: "bfs_canton",
    to: "iso_3166_2",
    values: Object.fromEntries(
      Object.entries(MODELLED_CANTONS).map(([code, { fso }]) => [fso, `CH-${code}`]),
    ),
  },
];

/** The keys a `scheme:value` key also answers to, through the crosswalks. */
export function crosswalked(key: string): string[] {
  const at = key.indexOf(":");
  const scheme = key.slice(0, at);
  const value = key.slice(at + 1);
  return IDENTIFIER_CROSSWALKS.flatMap((c) =>
    c.from === scheme && c.values[value] ? [`${c.to}:${c.values[value]}`] : [],
  );
}

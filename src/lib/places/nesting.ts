/**
 * Where places sit when a source lists every tier flat and says only what
 * each is located in, any number of steps up (Wikidata's P131 for ISO
 * 3166-2 codes): each under its nearest listed ancestor, at most `tiers`
 * deep. Pure, so the generator and the tests read one answer.
 */
export interface Nesting {
  /** A place's parent among the listed places; absent for a place directly under the root. */
  parentOf: Map<string, string>;
  /** A place's tier, 0 for one directly under the root. */
  tierOf: (code: string) => number;
}

export function nestPlaces(
  /** Every listed place. */
  places: Iterable<string>,
  /** For each place, every listed place it lies in, at any distance. */
  ancestors: ReadonlyMap<string, ReadonlySet<string>>,
  tiers: number,
): Nesting {
  const listed = new Set(places);
  const parentOf = new Map<string, string>();
  // The nearest of a set of ancestors is the one that lies in the most of the others. Two equally
  // near that do not lie in each other (Brcko District, in both of Bosnia's entities by
  // Wikidata's statements, run by neither) say the place lies in both: it sits under the nearest
  // ancestor they share, else under the root, rather than under one picked at random.
  const nearest = (above: readonly string[]): string | null => {
    if (above.length === 0) return null;
    const depthOf = (a: string) =>
      [...(ancestors.get(a) ?? [])].filter((x) => above.includes(x)).length;
    const deepest = Math.max(...above.map(depthOf));
    const tied = above.filter((a) => depthOf(a) === deepest);
    if (tied.length === 1) return tied[0]!;
    const shared = above.filter((a) => tied.every((t) => ancestors.get(t)?.has(a)));
    return nearest(shared);
  };
  for (const code of listed) {
    const above = [...(ancestors.get(code) ?? [])].filter((a) => a !== code && listed.has(a));
    const parent = nearest(above);
    if (parent) parentOf.set(code, parent);
  }
  // A cycle in the statements would make a place its own ancestor: it sits under the root.
  for (const code of [...parentOf.keys()]) {
    const seen = new Set([code]);
    for (let at = parentOf.get(code); at; at = parentOf.get(at)) {
      if (seen.has(at)) {
        parentOf.delete(code);
        break;
      }
      seen.add(at);
    }
  }
  const chainOf = (code: string) => {
    const chain = [code];
    for (let at = parentOf.get(code); at; at = parentOf.get(at)) chain.push(at);
    return chain;
  };
  // Deeper than the last tier: it hangs from its ancestor on the last tier but one.
  for (const code of [...parentOf.keys()]) {
    const chain = chainOf(code);
    if (chain.length > tiers) parentOf.set(code, chain[chain.length - tiers + 1]!);
  }
  return { parentOf, tierOf: (code) => chainOf(code).length - 1 };
}

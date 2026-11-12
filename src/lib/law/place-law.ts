/**
 * The law that applies in a place, for its page: the nearest authority whose
 * law Solon holds and every one above it (a commune, its country, the union),
 * each with how many acts in force Solon holds the text of.
 */
import type { Database } from "@/lib/db/client";
import { authorityName, loadAuthorityNames } from "./authority-names";
import { chainOf, countryAuthority, partsOf } from "./places";
import { loadLawCoverage } from "./register/coverage";

export interface PlaceLaw {
  key: string;
  name: string;
  /** Acts in force whose text Solon holds. */
  acts: number;
  /** Acts the register holds that are in force or whose status the publisher does not state. */
  registered: number;
  /**
   * On the nearest authority only: the authorities within it (a country's
   * communes), each with its own count, so a country page reaches every one.
   */
  parts?: PlaceLaw[];
}

/** Nearest first; `authorities` are the keys whose law applies there, in any order. */
export async function loadPlaceLaw(
  db: Database,
  authorities: readonly string[],
  locale: string,
): Promise<PlaceLaw[]> {
  if (authorities.length === 0) return [];
  const nearest = authorities.map((key) => chainOf(key)).sort((a, b) => b.length - a.length)[0]!;
  // Only the authorities the page shows: the chain, and the parts of its nearest.
  const shown = [...nearest.map((a) => a.key), ...partsOf(nearest[0]!.key).map((p) => p.key)];
  const coverage = await loadLawCoverage(db, { authorities: shown });
  const held = new Map(coverage.authorities.map((a) => [a.key, a.withText]));
  const registered = new Map(
    coverage.authorities.map((a) => [a.key, a.inForce + a.statusNotStated]),
  );
  const names = await loadAuthorityNames(locale);
  return withParts(nearest, held, (a) => authorityName(names, a.key), registered);
}

/**
 * Pure: the chain with each authority's count, the nearest carrying the
 * authorities within it, each named by `nameOf` (the place's own name in the
 * reader's language; the authority's label when none is given).
 */
export function withParts(
  chain: readonly { key: string; label: string }[],
  held: ReadonlyMap<string, number>,
  nameOf: (authority: { key: string; label: string }) => string = (a) => a.label,
  registered: ReadonlyMap<string, number> = held,
): PlaceLaw[] {
  const count = (key: string) => {
    const acts = held.get(key) ?? 0;
    return { acts, registered: Math.max(registered.get(key) ?? 0, acts) };
  };
  return chain.map((a, i) => {
    const parts =
      i === 0
        ? partsOf(a.key)
            .map((p) => ({ key: p.key, name: nameOf(p), ...count(p.key) }))
            .sort((x, y) => x.name.localeCompare(y.name))
        : [];
    return {
      key: a.key,
      name: nameOf(a),
      ...count(a.key),
      ...(parts.length > 0 ? { parts } : {}),
    };
  });
}

/** The law of a whole country, by its ISO 3166-1 code, when Solon has an authority for it. */
export async function loadCountryLaw(
  db: Database,
  region: string,
  locale: string,
): Promise<PlaceLaw[]> {
  const authority = countryAuthority(region);
  return authority ? loadPlaceLaw(db, [authority.key], locale) : [];
}

/** The key the atlas opens a country under (`/places?in=`), by its ISO 3166-1 code. */
export const countryLawKey = (region: string | null): string | null =>
  (region && countryAuthority(region)?.key) || null;

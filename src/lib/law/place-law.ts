/**
 * The law that applies in a place, for its page: the nearest authority whose
 * law Solon holds and every one above it (a commune, its country, the union),
 * each with how many acts in force Solon holds the text of.
 */
import type { Database } from "@/lib/db/client";
import { chainOf, countryAuthority, partsOf } from "./places";
import { loadLawCoverage } from "./register/coverage";

export interface PlaceLaw {
  key: string;
  name: string;
  /** Acts in force whose text Solon holds. */
  acts: number;
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
): Promise<PlaceLaw[]> {
  if (authorities.length === 0) return [];
  const nearest = authorities.map((key) => chainOf(key)).sort((a, b) => b.length - a.length)[0]!;
  const coverage = await loadLawCoverage(db);
  const held = new Map(coverage.authorities.map((a) => [a.key, a.withText]));
  return withParts(nearest, held);
}

/** Pure: the chain with each authority's count, the nearest carrying the authorities within it. */
export function withParts(
  chain: readonly { key: string; name: string }[],
  held: ReadonlyMap<string, number>,
): PlaceLaw[] {
  return chain.map((a, i) => {
    const parts = i === 0 ? partsOf(a.key) : [];
    return {
      key: a.key,
      name: a.name,
      acts: held.get(a.key) ?? 0,
      ...(parts.length > 0
        ? { parts: parts.map((p) => ({ key: p.key, name: p.name, acts: held.get(p.key) ?? 0 })) }
        : {}),
    };
  });
}

/** The law of a whole country, by its ISO 3166-1 code, when Solon has an authority for it. */
export async function loadCountryLaw(db: Database, region: string): Promise<PlaceLaw[]> {
  const authority = countryAuthority(region);
  return authority ? loadPlaceLaw(db, [authority.key]) : [];
}

/** The key the atlas opens a country under (`/places?in=`), by its ISO 3166-1 code. */
export const countryLawKey = (region: string | null): string | null =>
  (region && countryAuthority(region)?.key) || null;

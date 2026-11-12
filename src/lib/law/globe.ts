/**
 * What the globe shows: for each place on it, how many acts in force Solon
 * holds the text of there, counted from the data by `counts.ts`, the one module
 * every count of laws comes from. A country is shaded by everything within it
 * (the Confederation, the cantons, the communes); a state by its own. The
 * number printed for a country is its own law (`own`), the figure its place
 * page and its Law page print; what lies below it is said apart (`below`).
 * Read once per request, cheap: one coverage query.
 */
import { GLOBE_FEATURES, globeId } from "@/lib/config/law/globe";
import { placesConfig } from "@/lib/config/places";
import type { Database } from "@/lib/db/client";
import { drawnPacks } from "@/lib/places/map-data";
import { countOf, heldOf, rollUp, type LawCount } from "./counts";
import { authorityOf } from "./places";
import { loadLawCoverage } from "./register/coverage";

export interface GlobePlace {
  /** The feature it is drawn as: `countries:756`, `states:56`. */
  feature: string;
  /** The law authority it opens: `/law/place/{key}`. */
  key: string;
  name: string;
  /** For a country, its ISO 3166-1 code, so a page names it in the reader's language. */
  region?: string;
  /** Acts in force whose text Solon holds, within this place and everything under it: the shade. */
  acts: number;
  /** Of `acts`, the authority's own: a country's national law, as its place page and Law page count it. The figure printed. */
  own: number;
  /** Of `acts`, those of the authorities under it that are not its own: cantons, communes. */
  below: number;
  /** The Places country it is, when Solon holds its places. */
  pack?: string;
  /** Its places have boundaries, so the atlas draws them. */
  drawn?: boolean;
}

/**
 * What Solon holds for one place on the globe, from the rolled-up counts: its
 * own authority's acts, and for a country those of every authority within it.
 * `own + below = acts`, so a card can say which is which and agree with the
 * Law page of the authority.
 */
export function globeActs(
  counts: ReadonlyMap<string, LawCount>,
  key: string,
): { acts: number; own: number; below: number } {
  const own = countOf(counts, key, "own");
  if (authorityOf(key)?.place?.scheme !== "iso_3166_1") return { acts: own, own, below: 0 };
  const acts = countOf(counts, key, "within");
  return { acts, own, below: acts - own };
}

export async function loadGlobePlaces(db: Database): Promise<GlobePlace[]> {
  const [coverage, drawn] = await Promise.all([
    loadLawCoverage(db),
    drawnPacks(db, new Date().toISOString().slice(0, 10)),
  ]);
  const counts = rollUp(heldOf(coverage));
  return Object.entries(GLOBE_FEATURES).map(([key, feature]) => {
    const authority = authorityOf(key);
    const isCountry = authority?.place?.scheme === "iso_3166_1";
    const counted = globeActs(counts, key);
    const pack = isCountry
      ? placesConfig.packs.find((p) => p.region === authority!.place!.value)?.key
      : undefined;
    return {
      feature: globeId(feature),
      key,
      name: authority?.label ?? key,
      ...(isCountry ? { region: authority!.place!.value } : {}),
      ...counted,
      ...(pack ? { pack, drawn: drawn.has(pack) } : {}),
    };
  });
}

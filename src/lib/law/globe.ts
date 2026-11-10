/**
 * What the globe shows: for each place on it, how many acts in force Solon
 * holds the text of there, counted from the data. A country counts everything
 * within it (the Confederation, the cantons, the communes); a state counts its
 * own. Read once per request, cheap: one coverage query.
 */
import { GLOBE_FEATURES, globeId } from "@/lib/config/law/globe";
import { countryOf } from "@/lib/config/law";
import { placesConfig } from "@/lib/config/places";
import type { Database } from "@/lib/db/client";
import { drawnPacks } from "@/lib/places/map-data";
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
  /** Acts in force whose text Solon holds, within this place and everything under it (the shade, the total). */
  acts: number;
  /** Of `acts`, the authority's own: a country's national law, as its Law page counts it. */
  own: number;
  /** Of `acts`, those of the authorities under it that are not its own: cantons, communes. */
  below: number;
  /** The Places country it is, when Solon holds its places. */
  pack?: string;
  /** Its places have boundaries, so the atlas draws them. */
  drawn?: boolean;
}

/**
 * What Solon holds for one place on the globe: its own authority's acts, and
 * for a country those of every authority within it. `own + below = acts`, so a
 * card can say which is which and agree with the Law page of the authority.
 */
export function globeActs(
  held: ReadonlyMap<string, number>,
  key: string,
): { acts: number; own: number; below: number } {
  const authority = authorityOf(key);
  const own = held.get(key) ?? 0;
  if (authority?.place?.scheme !== "iso_3166_1") return { acts: own, own, below: 0 };
  const below = [...held].reduce(
    (sum, [k, n]) => sum + (k !== key && countryOf(k) === authority.place!.value ? n : 0),
    0,
  );
  return { acts: own + below, own, below };
}

export async function loadGlobePlaces(db: Database): Promise<GlobePlace[]> {
  const [coverage, drawn] = await Promise.all([
    loadLawCoverage(db),
    drawnPacks(db, new Date().toISOString().slice(0, 10)),
  ]);
  const held = new Map(coverage.authorities.map((a) => [a.key, a.withText]));
  return Object.entries(GLOBE_FEATURES).map(([key, feature]) => {
    const authority = authorityOf(key);
    const isCountry = authority?.place?.scheme === "iso_3166_1";
    const counted = globeActs(held, key);
    const pack = isCountry
      ? placesConfig.packs.find((p) => p.region === authority!.place!.value)?.key
      : undefined;
    return {
      feature: globeId(feature),
      key,
      name: authority?.name ?? key,
      ...(isCountry ? { region: authority!.place!.value } : {}),
      ...counted,
      ...(pack ? { pack, drawn: drawn.has(pack) } : {}),
    };
  });
}

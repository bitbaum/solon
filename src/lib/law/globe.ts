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
  /** Acts in force whose text Solon holds, within this place. */
  acts: number;
  /** The Places country it is, when Solon holds its places. */
  pack?: string;
  /** Its places have boundaries, so the atlas draws them. */
  drawn?: boolean;
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
    const acts = isCountry
      ? [...held].reduce(
          (sum, [k, n]) => sum + (countryOf(k) === authority!.place!.value ? n : 0),
          0,
        )
      : (held.get(key) ?? 0);
    const pack = isCountry
      ? placesConfig.packs.find((p) => p.region === authority!.place!.value)?.key
      : undefined;
    return {
      feature: globeId(feature),
      key,
      name: authority?.label ?? key,
      ...(isCountry ? { region: authority!.place!.value } : {}),
      acts,
      ...(pack ? { pack, drawn: drawn.has(pack) } : {}),
    };
  });
}

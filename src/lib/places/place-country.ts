/**
 * The country a place's page stands for: whose profile, budget and photograph
 * it shows. By the place's own ISO 3166-1 code; else, for a pack's root, the
 * pack's country; else, for a nation of the world pack, the world entry of
 * its slug. Never by the slug of a place below a country: the Djibouti
 * Region (world/djibouti/djibouti) and the City of San Marino share their
 * country's slug, and the US state of Georgia shares a country's.
 */
import { WORLD_PACK } from "@/lib/config/places/countries/world";
import { COUNTRY_SCHEME } from "@/lib/config/places/identifier-schemes";
import {
  worldEntryOfPack,
  worldRegion,
  worldRegionByCode,
  type WorldRegion,
} from "@/lib/config/world";

export interface PlaceCountryInput {
  /** Its identifiers, `scheme:value`. */
  refs: readonly string[];
  packKey: string;
  slugPath: string;
  /** The places it is part of, up to its pack's root. */
  partOf: readonly unknown[];
}

export function countryOfPlace(
  view: PlaceCountryInput,
  pack: { key: string; region?: string | null } | undefined,
): WorldRegion | undefined {
  const prefix = `${COUNTRY_SCHEME}:`;
  const code = view.refs.find((r) => r.startsWith(prefix))?.slice(prefix.length);
  if (code) return worldRegionByCode(code);
  if (view.packKey === WORLD_PACK) {
    // A nation sits directly under the world's root; anything deeper is not one.
    return view.partOf.length <= 1 ? worldRegion(view.slugPath.split("/").at(-1) ?? "") : undefined;
  }
  return pack && view.partOf.length === 0 ? worldEntryOfPack(pack) : undefined;
}

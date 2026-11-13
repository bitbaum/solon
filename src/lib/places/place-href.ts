/**
 * The link to a place's page, and the one rule behind every internal link to
 * one: it is built from the place's canonical path (`place_paths`, read by
 * `findPlace`), never from `jurisdictions.slug_path`, so a click lands on the
 * page and not on a 308 to it. Pure and free of the database, so a client
 * component can import it.
 */
import { WORLD_PACK } from "@/lib/config/places/countries/world";
import { COUNTRIES } from "@/lib/config/world/countries";
import { hyphenated } from "./world-slug-redirects";

/** The page of the place whose canonical path is `canonicalPath`. */
export const placeHref = (canonicalPath: string) => `/places/${canonicalPath}`;

/** The page of a pack's root: the pack's key written the way `place_paths` writes it. */
export const packHref = (packKey: string) => placeHref(hyphenated(packKey));

/** The countries the world pack holds a place for, unless a pack of their own does. */
const IN_WORLD_PACK = new Set(COUNTRIES.map((c) => c.a2));

/**
 * The page of a world-list entry, where it is and not where it redirects
 * from. A country a pack holds is that pack's root. Any other country is a
 * place of the world pack (`/places/world/<slug>`). An entry the world pack
 * does not hold (a proclaimed state, a project) or one another state claims
 * keeps its own page at `/places/<slug>`. The same rule as the place page.
 */
export function regionHref(
  region: { slug: string; code?: string | undefined; claimedBy?: string | undefined },
  packKey?: string | null,
): string {
  if (packKey) return packHref(packKey);
  if (region.code && !region.claimedBy && IN_WORLD_PACK.has(region.code))
    return placeHref(`${WORLD_PACK}/${region.slug}`);
  return placeHref(region.slug);
}

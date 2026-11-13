/**
 * Who a budget belongs to, and the page it is shown on. A holder is a place
 * reference ({ scheme, value }), the way Places identifies everything; a page
 * is addressed by the world list's slug. These two functions are the one
 * mapping between them.
 */
import { WORLD, type WorldRegion } from "@/lib/config/world";
import { sameHolder, type PlaceRef } from "./model";

/** The reference a world entry is held under: its ISO code, else the identifier it names. */
export function holderOfRegion(region: WorldRegion): PlaceRef | null {
  if (region.code) return { scheme: "iso_3166_1", value: region.code };
  return region.ref ?? null;
}

/** The world entry a holder's page is under, when it has one. */
export function regionOfHolder(
  holder: PlaceRef,
  world: readonly WorldRegion[] = WORLD,
): WorldRegion | undefined {
  return world.find((r) => {
    const ref = holderOfRegion(r);
    return ref !== null && sameHolder(ref, holder);
  });
}

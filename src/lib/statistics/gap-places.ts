/**
 * The places a gap line can be about, named through the shared place model: an ISO 3166-1 code
 * resolves to the country's name in the reader's language, a place with no code (South Ossetia) to
 * the name its country pack gives for its own `nation` id. No place is special-cased.
 */
import { placesConfig } from "@/lib/config/places";
import { placeId } from "./gaps";

type Packs = typeof placesConfig.packs;

/** The ids of the places Solon models a country for: the pack's ISO region, else its nation id. */
export function solonPlaceIds(packs: Packs = placesConfig.packs): string[] {
  return packs.flatMap((p) =>
    p.region
      ? [p.region]
      : p.nation
        ? [placeId({ scheme: p.nation.scheme as "wikidata", value: p.nation.value })]
        : [],
  );
}

/** A place id (`placeId`) as a name in a language; the id itself when nothing names it. */
export function gapPlaceName(
  id: string,
  locale: string,
  packs: Packs = placesConfig.packs,
): string {
  const colon = id.indexOf(":");
  if (colon < 0) {
    try {
      return new Intl.DisplayNames([locale], { type: "region" }).of(id) ?? id;
    } catch {
      return id;
    }
  }
  const scheme = id.slice(0, colon);
  const value = id.slice(colon + 1);
  const pack = packs.find((p) => p.nation?.scheme === scheme && p.nation.value === value);
  return pack ? (pack.names[locale] ?? pack.names.en ?? pack.key) : id;
}

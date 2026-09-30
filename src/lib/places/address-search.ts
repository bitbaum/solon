/**
 * The map's address search (design §9.1): a country's public geocoder, asked
 * straight from the reader's browser so Solon never sees the address. Format
 * only: which service a pack uses is its `addressSearch` in config.
 */
import { z } from "zod";
import type { MapData } from "./map-view";

export interface AddressHit {
  label: string;
  /** Longitude, latitude (WGS84). */
  position: [number, number];
}

const geoadminResults = z.object({
  results: z.array(
    z.object({
      attrs: z.object({ label: z.string(), lat: z.number(), lon: z.number() }).loose(),
    }),
  ),
});

/** Labels arrive with the matched part in <b>; the reader sees plain text. */
const plain = (label: string) =>
  label
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();

export async function searchAddresses(
  search: NonNullable<MapData["addressSearch"]>,
  text: string,
  signal: AbortSignal,
  limit = 5,
): Promise<AddressHit[]> {
  switch (search.format) {
    case "geoadmin_search": {
      const url = new URL(search.url);
      url.searchParams.set("searchText", text);
      url.searchParams.set("type", "locations");
      url.searchParams.set("origins", "address");
      url.searchParams.set("sr", "4326");
      url.searchParams.set("limit", String(limit));
      const response = await fetch(url, {
        signal,
        credentials: "omit",
        referrerPolicy: "no-referrer",
      });
      if (!response.ok) {
        return [];
      }
      const parsed = geoadminResults.safeParse(await response.json());
      return parsed.success
        ? parsed.data.results.map(({ attrs }) => ({
            label: plain(attrs.label),
            position: [attrs.lon, attrs.lat],
          }))
        : [];
    }
  }
}

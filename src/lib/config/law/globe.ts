/**
 * Where each law authority sits on the globe: the feature that draws it in a
 * public-domain outline file. Countries are Natural Earth's (through the
 * `world-atlas` package), by ISO 3166-1 numeric code; US states are the
 * Census Bureau's (through `us-atlas`), by FIPS code.
 *
 * A country is drawn from its authority's place code, so a new country authority is on
 * the globe by itself; a US state needs its FIPS code here, and a test fails when one has none.
 */
import { numericOf } from "@/lib/config/world/countries";
import { LAW_AUTHORITIES } from "./index";

export type GlobeLayer = "countries" | "states";

/** US states by FIPS code: the Census Bureau's outlines are keyed by it, which the country registry does not hold. */
const STATE_FEATURES: Readonly<Record<string, string>> = { "us-wy": "56", "us-nh": "33" };

/**
 * Every country authority by its country's ISO numeric code, read from the
 * country registry (src/lib/config/world/countries.ts), and the US states above.
 */
export const GLOBE_FEATURES: Readonly<Record<string, { layer: GlobeLayer; id: string }>> =
  Object.fromEntries([
    ...LAW_AUTHORITIES.flatMap((a) => {
      const n3 = a.place?.scheme === "iso_3166_1" ? numericOf(a.place.value) : null;
      return n3 ? [[a.key, { layer: "countries" as const, id: n3 }]] : [];
    }),
    ...Object.entries(STATE_FEATURES).map(([key, id]) => [key, { layer: "states" as const, id }]),
  ]);

/** The id a feature is drawn under on the globe: its layer, then its code. */
export const globeId = (feature: { layer: GlobeLayer; id: string }) =>
  `${feature.layer}:${feature.id}`;

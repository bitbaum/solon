/**
 * Where each law authority sits on the globe: the feature that draws it in a
 * public-domain outline file. Countries are Natural Earth's (through the
 * `world-atlas` package), by ISO 3166-1 numeric code; US states are the
 * Census Bureau's (through `us-atlas`), by FIPS code.
 *
 * A place Solon holds law for is one line here; a test fails when a country
 * or state authority has none, so a new country cannot be left off the globe.
 */
export type GlobeLayer = "countries" | "states";

export const GLOBE_FEATURES: Readonly<Record<string, { layer: GlobeLayer; id: string }>> = {
  ch: { layer: "countries", id: "756" },
  li: { layer: "countries", id: "438" },
  lux: { layer: "countries", id: "442" },
  ee: { layer: "countries", id: "233" },
  us: { layer: "countries", id: "840" },
  "us-wy": { layer: "states", id: "56" },
};

/** The id a feature is drawn under on the globe: its layer, then its code. */
export const globeId = (feature: { layer: GlobeLayer; id: string }) =>
  `${feature.layer}:${feature.id}`;

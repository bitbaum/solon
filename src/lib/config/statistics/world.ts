/**
 * Where a place with a statistic sits on the world map: its ISO 3166-1 numeric
 * code, which is what the map's outlines (Natural Earth, through `world-atlas`)
 * are keyed by. One line per country Solon holds; a test fails when a pack's
 * country is missing here, so a new country cannot be left off the map.
 */
export const ISO_NUMERIC: Readonly<Record<string, string>> = {
  CH: "756",
  EE: "233",
  LI: "438",
  US: "840",
};

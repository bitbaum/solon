import type { CountryPackInput } from "../schema";
import { estonia } from "./estonia";
import { liechtenstein } from "./liechtenstein";
import { switzerland } from "./switzerland";
import { unitedStates } from "./united_states";
import { worldPack } from "./world";

/**
 * Every country pack, one module per country (`<key>.ts` beside this file).
 * The engine is proven against a made-up country that lives only in tests
 * (src/lib/places/__tests__/fixtures); a real pack is data like it.
 */
const DEPTH: readonly CountryPackInput[] = [switzerland, liechtenstein, estonia, unitedStates];

export const COUNTRY_PACKS: readonly CountryPackInput[] = [
  ...DEPTH,
  // Every other country, as a nation only (the countries above are not in it).
  worldPack(new Set(DEPTH.flatMap((p) => (p.region ? [p.region] : [])))),
];

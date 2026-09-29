import type { CountryPackInput } from "../schema";

/**
 * Every country pack, one module per country (`<key>.ts` beside this file).
 * Empty until the Canton of Zürich lands in P1: the engine is proven first
 * against a made-up country that lives only in tests
 * (src/lib/places/__tests__/fixtures).
 */
export const COUNTRY_PACKS = [] satisfies readonly CountryPackInput[];

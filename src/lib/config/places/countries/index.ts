import type { CountryPackInput } from "../schema";
import { switzerland } from "./switzerland";

/**
 * Every country pack, one module per country (`<key>.ts` beside this file).
 * The engine is proven against a made-up country that lives only in tests
 * (src/lib/places/__tests__/fixtures); a real pack is data like it.
 */
export const COUNTRY_PACKS: readonly CountryPackInput[] = [switzerland];

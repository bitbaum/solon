import type { InstrumentKindInput } from "./schema";

/**
 * Ways to take part in a place — popular vote, initiative, referendum, … —
 * as kinds whose thresholds are data on each instrument, never constants
 * (§4.7).
 */
export const INSTRUMENT_KINDS = [] satisfies readonly InstrumentKindInput[];

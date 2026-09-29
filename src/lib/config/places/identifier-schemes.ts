import type { IdentifierSchemeInput } from "./schema";

/**
 * Identifier schemes: the external codes a place can carry, many per place
 * (§4.3). `reserved` schemes can only be carried by a state authority; the
 * database refuses them on a founded or proposed place.
 */
export const IDENTIFIER_SCHEMES = [] satisfies readonly IdentifierSchemeInput[];

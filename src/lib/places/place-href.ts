/**
 * The link to a place's page, and the one rule behind every internal link to
 * one: it is built from the place's canonical path (`place_paths`, read by
 * `findPlace`), never from `jurisdictions.slug_path`, so a click lands on the
 * page and not on a 308 to it. Pure and free of the database, so a client
 * component can import it.
 */
import { hyphenated } from "./world-slug-redirects";

/** The page of the place whose canonical path is `canonicalPath`. */
export const placeHref = (canonicalPath: string) => `/places/${canonicalPath}`;

/** The page of a pack's root: the pack's key written the way `place_paths` writes it. */
export const packHref = (packKey: string) => placeHref(hyphenated(packKey));

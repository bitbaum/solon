/**
 * The Places config Solon runs with — every registry, parsed and cross-checked
 * at load. Engine code takes a `PlacesConfig` as a parameter rather than
 * importing this, so tests can hand it a made-up country instead.
 */
import { COUNTRY_PACKS } from "./countries";
import { IDENTIFIER_SCHEMES } from "./identifier-schemes";
import { INSTRUMENT_KINDS } from "./instrument-kinds";
import { LICENCES } from "./licences";
import { METRICS } from "./metrics";
import { definePlacesConfig, type PlacesConfig } from "./schema";
import { SOURCES } from "./sources";

export const placesConfig: PlacesConfig = definePlacesConfig({
  packs: [...COUNTRY_PACKS],
  sources: [...SOURCES],
  metrics: [...METRICS],
  identifierSchemes: [...IDENTIFIER_SCHEMES],
  instrumentKinds: [...INSTRUMENT_KINDS],
  licences: [...LICENCES],
});

export * from "./schema";

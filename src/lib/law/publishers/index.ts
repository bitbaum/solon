import type { PublisherAdapter } from "./types";
import { zurichCity } from "./zurich-city";

/** Every municipal collection a reader exists for. A new commune is a new adapter here and a line in LAW_AUTHORITIES. */
export const PUBLISHERS: Readonly<Record<string, PublisherAdapter>> = {
  [zurichCity.key]: zurichCity,
};

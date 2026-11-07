import type { PublisherAdapter } from "./types";
import {
  balzers,
  eschen,
  gamprin,
  mauren,
  planken,
  ruggell,
  schaan,
  schellenberg,
  triesen,
  vaduz,
} from "./linked-documents";
import { zurichCity } from "./zurich-city";

/** Every municipal collection a reader exists for. A new commune is a new adapter here and a line in LAW_AUTHORITIES. */
export const PUBLISHERS: Readonly<Record<string, PublisherAdapter>> = {
  [zurichCity.key]: zurichCity,
  [vaduz.key]: vaduz,
  [triesen.key]: triesen,
  [balzers.key]: balzers,
  [mauren.key]: mauren,
  [schaan.key]: schaan,
  [planken.key]: planken,
  [gamprin.key]: gamprin,
  [ruggell.key]: ruggell,
  [eschen.key]: eschen,
  [schellenberg.key]: schellenberg,
};

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
  triesenberg,
  vaduz,
} from "./linked-documents";
import { chur, luzernCity, schaffhausenCity, sion, thun } from "./iweb";
import { zurichCity } from "./zurich-city";

/** Every municipal collection a reader exists for. A new commune is a new adapter here and a line in LAW_AUTHORITIES. */
export const PUBLISHERS: Readonly<Record<string, PublisherAdapter>> = {
  [zurichCity.key]: zurichCity,
  [vaduz.key]: vaduz,
  [triesen.key]: triesen,
  [triesenberg.key]: triesenberg,
  [balzers.key]: balzers,
  [mauren.key]: mauren,
  [schaan.key]: schaan,
  [planken.key]: planken,
  [gamprin.key]: gamprin,
  [ruggell.key]: ruggell,
  [eschen.key]: eschen,
  [schellenberg.key]: schellenberg,
  [luzernCity.key]: luzernCity,
  [thun.key]: thun,
  [chur.key]: chur,
  [schaffhausenCity.key]: schaffhausenCity,
  [sion.key]: sion,
};

import type { StaticImageData } from "next/image";
import earthAtNight from "@/assets/images/earth-at-night.webp";
import earthByDay from "@/assets/images/earth-by-day.webp";
import landsgemeinde from "@/assets/images/landsgemeinde-glarus.webp";
import assemblySeated from "@/assets/images/assembly-seated.webp";
import villageKyburg from "@/assets/images/village-kyburg.webp";
import cityAtNight from "@/assets/images/city-at-night.webp";
import europeFromOrbit from "@/assets/images/europe-from-orbit.webp";
import mountainValley from "@/assets/images/mountain-valley.webp";
import starlinkTownHall from "@/assets/images/starlink-town-hall.webp";
import landsgemeindePainting from "@/assets/images/landsgemeinde-painting.webp";

/**
 * Every photograph on the site, with who made it and under what licence.
 *
 * One list, so the credits page cannot miss an image a page uses: a page takes
 * its photo from here, and /credits renders this. All are from Wikimedia
 * Commons, chosen for licences that permit reuse — public domain, CC0, or CC BY
 * (attribution, given on /credits). None shows a customer or implies one.
 */
export interface Photo {
  /** Its key in messages `Photos.<id>` — where its alt text lives, per language. */
  id: PhotoId;
  image: StaticImageData;
  title: string;
  author: string;
  license: string;
  licenseUrl: string | null;
  source: string;
}

export type PhotoId =
  | "earthAtNight"
  | "earthByDay"
  | "landsgemeinde"
  | "assemblySeated"
  | "village"
  | "city"
  | "europeFromOrbit"
  | "mountainValley"
  | "starlinkTownHall"
  | "landsgemeindePainting";

export const PHOTOS = {
  earthAtNight: {
    image: earthAtNight,
    id: "earthAtNight",
    title: "Europe, city lights from space",
    author: "NASA",
    license: "Public domain",
    licenseUrl: null,
    source: "https://commons.wikimedia.org/wiki/File:ISS-65_Europe,_city_lights_from_space.jpg",
  },
  earthByDay: {
    image: earthByDay,
    id: "earthByDay",
    title: "Blue Marble, Eastern Hemisphere (cropped)",
    author: "NASA, images by Reto Stöckli",
    license: "Public domain",
    licenseUrl: null,
    source: "https://commons.wikimedia.org/wiki/File:Blue_Marble_Eastern_Hemisphere.jpg",
  },
  landsgemeinde: {
    image: landsgemeinde,
    id: "landsgemeinde",
    title: "Landsgemeinde Glarus",
    author: "Glarus",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0",
    source: "https://commons.wikimedia.org/wiki/File:Landsgemeinde_Glarus_(18956672849).jpg",
  },
  assemblySeated: {
    image: assemblySeated,
    id: "assemblySeated",
    title: "Glarus Landsgemeinde",
    author: "Glarus",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0",
    source: "https://commons.wikimedia.org/wiki/File:Glarus_Landsgemeinde_(19384045289).jpg",
  },
  village: {
    image: villageKyburg,
    id: "village",
    title: "Kyburg aerial view",
    author: "Albinfo",
    license: "CC0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    source: "https://commons.wikimedia.org/wiki/File:Kyburg_Aerial_View.jpg",
  },
  city: {
    image: cityAtNight,
    id: "city",
    title: "City at night",
    author: "Slaffka Che",
    license: "CC BY 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by/3.0",
    source: "https://commons.wikimedia.org/wiki/File:500px_photo_(101127635).jpeg",
  },
  europeFromOrbit: {
    image: europeFromOrbit,
    id: "europeFromOrbit",
    title: "Southern Europe at night",
    author: "NASA",
    license: "Public domain",
    licenseUrl: null,
    source:
      "https://commons.wikimedia.org/wiki/File:ISS-53_Southern_Europe_with_the_%27boot%27_of_Italy_at_night.jpg",
  },
  mountainValley: {
    image: mountainValley,
    id: "mountainValley",
    title: "A Swiss mountain village",
    author: "U.S. Department of State",
    license: "Public domain",
    licenseUrl: null,
    source: "https://commons.wikimedia.org/wiki/File:A_Swiss_Mountain_Village_(12137111955).jpg",
  },
  starlinkTownHall: {
    id: "starlinkTownHall",
    image: starlinkTownHall,
    title: "Starlink über dem Rathaus in Tübingen",
    author: "Dktue",
    license: "CC0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    source:
      "https://commons.wikimedia.org/wiki/File:Starlink_%C3%BCber_dem_Rathaus_in_T%C3%BCbingen.jpg",
  },
  landsgemeindePainting: {
    id: "landsgemeindePainting",
    image: landsgemeindePainting,
    title: "Landsgemeinde, late 18th century (Museum Appenzell)",
    author: "Unknown painter",
    license: "Public domain",
    licenseUrl: null,
    source: "https://commons.wikimedia.org/wiki/File:Landsgemeinde_Ende_18._Jhr.jpg",
  },
} satisfies Record<string, Photo>;

/**
 * A night photograph has a daylight counterpart for the light theme: a section
 * wears the photograph that matches the reader's theme, under a scrim of that
 * theme's page colour, so the light theme reads as light and the type on it
 * keeps the theme's own ink. A night photograph with no counterpart belongs to
 * a section that says so (`alwaysDark` on FullBleed).
 */
const LIGHT_COUNTERPART: Partial<Record<PhotoId, Photo>> = {
  earthAtNight: PHOTOS.earthByDay,
  europeFromOrbit: PHOTOS.mountainValley,
  city: PHOTOS.village,
};

/** The photograph for the light theme, if this one is a night shot with a counterpart. */
export function lightCounterpart(photo: Photo): Photo | null {
  return LIGHT_COUNTERPART[photo.id] ?? null;
}

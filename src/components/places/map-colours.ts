"use client";

import { useEffect, useState } from "react";

/** The design tokens the map draws with, read from the page so both themes follow (design §9.1). */
export interface MapColours {
  /** Lowest value first. */
  scale: string[];
  noData: string;
  boundary: string;
  selected: string;
}

const SCALE_TOKENS = [1, 2, 3, 4, 5, 6, 7].map((k) => `--map-scale-${k}`);

/** A token as a colour: hex as it is, an HSL triplet ("0 0% 20%") as hsl(). */
function tokenColour(style: CSSStyleDeclaration, name: string): string {
  const value = style.getPropertyValue(name).trim();
  const triplet = /^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?%)\s+(\d+(?:\.\d+)?%)$/.exec(value);
  return triplet ? `hsl(${triplet[1]}, ${triplet[2]}, ${triplet[3]})` : value;
}

function readColours(): MapColours {
  const style = getComputedStyle(document.documentElement);
  return {
    scale: SCALE_TOKENS.map((name) => tokenColour(style, name)),
    noData: tokenColour(style, "--map-no-data"),
    boundary: tokenColour(style, "--map-boundary"),
    selected: tokenColour(style, "--accent-primary"),
  };
}

/** The map's colours, read again when the page's theme changes. */
export function useMapColours(): MapColours | null {
  const [colours, setColours] = useState<MapColours | null>(null);
  useEffect(() => {
    const read = () => setColours(readColours());
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return colours;
}

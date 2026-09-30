"use client";

import { useTranslations } from "next-intl";
import { formatMoney, type MoneyFormat } from "@/lib/places/compare-view";
import { classColour } from "@/lib/places/map-view";
import type { MapColours } from "./map-colours";

interface MapLegendProps {
  /** Ascending class breaks; one class more than breaks. */
  breaks: number[];
  /** The lowest and highest estimate drawn. */
  range: [number, number];
  colours: MapColours;
  money: MoneyFormat;
  /** What the colours show, in a sentence. */
  caption: string;
}

/** What each colour means: a range of tax per class, lowest first, and the colour of no figure. */
export default function MapLegend({ breaks, range, colours, money, caption }: MapLegendProps) {
  const t = useTranslations("Places.map");
  const classes = breaks.length + 1;
  const bounds = [range[0], ...breaks, range[1]];
  return (
    <figure className="space-y-2">
      <figcaption className="text-sm text-fg-secondary">{caption}</figcaption>
      <ul className="space-y-1 text-sm text-fg-primary">
        {Array.from({ length: classes }, (_, k) => (
          <li key={k} className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block h-3 w-6 shrink-0 rounded-control"
              style={{ backgroundColor: classColour(k, classes, colours.scale) }}
            />
            {t("legendRange", {
              from: formatMoney(bounds[k]!, money),
              to: formatMoney(bounds[k + 1]!, money),
            })}
          </li>
        ))}
        <li className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block h-3 w-6 shrink-0 rounded-control"
            style={{ backgroundColor: colours.noData }}
          />
          {t("notYet")}
        </li>
      </ul>
    </figure>
  );
}

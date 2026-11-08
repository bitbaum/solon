"use client";

import { useDeferredValue, useMemo } from "react";
import { formatMoney, parseAmount, parseAmounts } from "@/lib/places/compare-view";
import {
  classColour,
  classOf,
  estimatePlace,
  quantileBreaks,
  type MapData,
} from "@/lib/places/map-view";
import { useDeviceInputs } from "./device-inputs";
import type { MapColours } from "./map-colours";
import type { MapRow } from "./map-list";

/**
 * What tax would cost the reader in each drawn place of a country: the
 * estimates (run in the browser; the income never leaves it), their classes
 * on the map's colour scale, and the reader's situation that drives them.
 */
export function useTaxLayer(data: MapData | null, colours: MapColours | null) {
  const packs = useMemo(() => (data?.taxPack ? [data.taxPack] : []), [data]);
  const [inputs, updateInput] = useDeviceInputs(packs);
  const taxPack = data?.taxPack ?? null;
  const input = taxPack ? inputs[taxPack.key] : undefined;

  const entered = input ? parseAmount(input.amount) : null;
  const example = entered === null && taxPack?.exampleBase != null;
  const estimateInput = useMemo(
    () => ({
      base: entered ?? taxPack?.exampleBase ?? null,
      amounts: parseAmounts(input?.amounts),
      variant: input?.variant ?? "",
      conditions: input?.conditions ?? {},
    }),
    [entered, taxPack, input],
  );
  const deferredInput = useDeferredValue(estimateInput);

  const rows: MapRow[] = useMemo(
    () =>
      data
        ? data.places.map((place) => ({
            place,
            estimate: estimatePlace(data, place, deferredInput),
          }))
        : [],
    [data, deferredInput],
  );
  const byFeature = useMemo(() => new Map(rows.map((row) => [row.place.feature, row])), [rows]);
  const totals = useMemo(
    () =>
      rows
        .flatMap((row) => (row.estimate.kind === "estimate" ? [row.estimate.estimate.total] : []))
        .sort((a, b) => a - b),
    [rows],
  );
  const classes = colours?.scale.length ?? 0;
  const breaks = useMemo(() => quantileBreaks(totals, classes), [totals, classes]);
  const fills = useMemo(() => {
    const fill = new Map<string, string>();
    if (!colours) return fill;
    for (const row of rows) {
      if (row.estimate.kind === "estimate") {
        const k = classOf(row.estimate.estimate.total, breaks);
        fill.set(row.place.feature, classColour(k, breaks.length + 1, colours.scale));
      }
    }
    return fill;
  }, [rows, breaks, colours]);
  const money = taxPack ? { currency: taxPack.currency, formatLocale: taxPack.formatLocale } : null;

  /** A drawn place's name and what tax costs there, for its hover label. */
  const describe = (code: string, notYet: string): string => {
    const row = byFeature.get(code);
    if (!row) return "";
    return row.estimate.kind === "estimate"
      ? `${row.place.name}: ${formatMoney(row.estimate.estimate.total, row.estimate)}`
      : `${row.place.name}: ${notYet}`;
  };

  return {
    taxPack,
    input,
    updateInput,
    example,
    money,
    rows,
    byFeature,
    totals,
    breaks,
    fills,
    describe,
  };
}

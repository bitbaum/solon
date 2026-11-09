"use client";

import { useRouter } from "@/i18n/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Camera, MapController, MapFeature } from "@bitbaum/geo-kit/map";
import AtlasCanvas from "@/components/atlas/atlas-canvas";
import {
  atlasPalette,
  loadWorld,
  readAtlasTokens,
  type AtlasTokens,
} from "@/components/atlas/world";
import { useMapColours } from "@/components/places/map-colours";

/** One place with a value for the metric on the map. */
export interface MapValue {
  /** The outline's id on the map: `countries:<ISO numeric>`. */
  feature: string;
  name: string;
  /** The value in the metric's own terms, as a number for shading. */
  value: number;
  /** The value as the reader sees it ("22 %"). */
  text: string;
  year: number;
  /** The place's own page for this statistic, without the locale (the router adds it). */
  href: string;
}

export interface MetricMapProps {
  values: MapValue[];
  /** What the colours mean, one line. */
  legend: { low: string; high: string; none: string; caption: string };
  label: string;
  texts: {
    zoomIn: string;
    zoomOut: string;
    home: string;
    loading: string;
    unavailable: string;
    open: string;
    place: string;
    value: string;
    year: string;
  };
}

/** Rest on Europe, where most of what Solon holds is; the whole Earth in view. */
const HOME: Camera = { center: [8, 40], k: 1 };

/**
 * The world coloured by one statistic: each place Solon holds a value for is
 * shaded from lowest to highest of the places shown, the rest are grey.
 * Pick a place to see its value, the year, and a link to its series.
 */
export default function MetricMap({ values, legend, label, texts }: MetricMapProps) {
  const router = useRouter();
  const colours = useMapColours();
  const [tokens, setTokens] = useState<AtlasTokens | null>(null);
  const [world, setWorld] = useState<MapFeature[] | null>(null);
  const [broken, setBroken] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const map = useRef<MapController | null>(null);

  useEffect(() => {
    const read = () => setTokens(readAtlasTokens());
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let cancelled = false;
    loadWorld(new Set()).then(
      (f) => !cancelled && setWorld(f),
      () => !cancelled && setBroken(true),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const byFeature = useMemo(() => new Map(values.map((v) => [v.feature, v])), [values]);
  const fills = useMemo(() => {
    const out = new Map<string, string>();
    if (!colours || values.length === 0) return out;
    const lo = Math.min(...values.map((v) => v.value));
    const hi = Math.max(...values.map((v) => v.value));
    for (const v of values) {
      const step =
        hi === lo ? 3 : Math.round(((v.value - lo) / (hi - lo)) * (colours.scale.length - 1));
      out.set(v.feature, colours.scale[step]!);
    }
    return out;
  }, [colours, values]);

  const onMap = useCallback((controller: MapController | null) => {
    map.current = controller;
  }, []);
  const chosen = selected ? byFeature.get(selected) : undefined;
  const ready = colours && tokens && world && !broken;

  return (
    <figure className="w-full space-y-3">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-surface border border-default sm:aspect-[2/1]">
        {ready ? (
          <AtlasCanvas
            shapes={world}
            fills={fills}
            palette={atlasPalette(colours, tokens)}
            dots={new Map()}
            dotColour={colours.selected}
            selected={selected}
            onMap={onMap}
            home={HOME}
            spin={false}
            onSelect={(id) => setSelected(id && byFeature.has(id) ? id : null)}
            describe={(id) => {
              const v = byFeature.get(id);
              return v ? `${v.name}: ${v.text}` : "";
            }}
            label={label}
            zoomIn={texts.zoomIn}
            zoomOut={texts.zoomOut}
            home_={texts.home}
            onError={() => setBroken(true)}
          />
        ) : (
          <div role="status" className="flex h-full items-center justify-center text-fg-secondary">
            {broken ? texts.unavailable : texts.loading}
          </div>
        )}
      </div>
      {colours && (
        <div className="flex flex-wrap items-center gap-3 text-sm text-fg-secondary">
          <span>{legend.low}</span>
          <span aria-hidden className="flex">
            {colours.scale.map((c) => (
              <span key={c} className="h-3 w-6" style={{ background: c }} />
            ))}
          </span>
          <span>{legend.high}</span>
          <span className="inline-flex items-center gap-2">
            <span aria-hidden className="h-3 w-6" style={{ background: colours.noData }} />
            {legend.none}
          </span>
        </div>
      )}
      {chosen && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-surface border border-default bg-surface-base p-4">
          <p className="mb-0 text-fg-primary">
            <span className="font-semibold">{chosen.name}</span>: {chosen.text}{" "}
            <span className="text-fg-tertiary">({chosen.year})</span>
          </p>
          <button
            type="button"
            className="btn-secondary min-h-11"
            onClick={() => router.push(chosen.href)}
          >
            {texts.open}
          </button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-fg-tertiary">
              <th className="py-1 pr-4 font-normal">{texts.place}</th>
              <th className="py-1 pr-4 text-right font-normal">{texts.value}</th>
              <th className="py-1 text-right font-normal">{texts.year}</th>
            </tr>
          </thead>
          <tbody>
            {[...values]
              .sort((a, b) => b.value - a.value)
              .map((v) => (
                <tr key={v.feature} className="border-t border-subtle">
                  <th scope="row" className="py-1 pr-4 text-left font-normal text-fg-primary">
                    {v.name}
                  </th>
                  <td className="py-1 pr-4 text-right tabular-nums">{v.text}</td>
                  <td className="py-1 text-right tabular-nums text-fg-tertiary">{v.year}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <figcaption className="text-sm text-fg-tertiary">{legend.caption}</figcaption>
    </figure>
  );
}

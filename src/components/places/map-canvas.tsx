"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FeatureCollection, Geometry } from "geojson";
import {
  cameraForBounds,
  createMap,
  fade,
  shapesFromFeatures,
  type Limits,
  type MapController,
  type Palette,
} from "@bitbaum/geo-kit/map";
import type { MapColours } from "./map-colours";

interface MapCanvasProps {
  /** Each feature's `code` is the place's feature in the boundary file. */
  features: FeatureCollection<Geometry, { code: string }>;
  /** Each feature's colour; absent draws it as having no data. */
  fills: ReadonlyMap<string, string>;
  colours: MapColours;
  bounds: [number, number, number, number];
  selected: string | null;
  /** Where to move to when it changes: a place's or an address's bounds. */
  focus: { bounds: [number, number, number, number]; key: number } | null;
  onSelect: (feature: string | null) => void;
  /** What hovering a feature says. */
  describe: (feature: string) => string;
  label: string;
  zoomIn: string;
  zoomOut: string;
  onError: () => void;
}

/** From the whole country to a street of a city commune. */
const LIMITS: Limits = { minZoom: 1, maxZoom: 3000, maxTilt: 85 };

const paletteOf = (colours: MapColours): Palette => ({
  // No base map under the places: the data is the picture.
  sphere: "transparent",
  land: colours.noData,
  border: colours.boundary,
  hover: fade(colours.selected, 0.6),
  selected: colours.selected,
  borderWidth: 0.5,
});

/**
 * The places, drawn from their boundary file and coloured by the caller, on
 * the fleet's one map renderer (`@bitbaum/geo-kit/map`): the globe, zoomed in
 * to the country. Drag, pinch and the wheel move it; the keyboard turns and
 * zooms it, and choosing a place by keyboard is the list's and the search
 * box's job.
 */
export default function MapCanvas({
  features,
  fills,
  colours,
  bounds,
  selected,
  focus,
  onSelect,
  describe,
  label,
  zoomIn,
  zoomOut,
  onError,
}: MapCanvasProps) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<MapController | null>(null);
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);
  const callbacks = useRef({ onSelect, describe, onError });
  useEffect(() => {
    callbacks.current = { onSelect, describe, onError };
  });

  const shapes = useMemo(
    () =>
      shapesFromFeatures(
        features.features.map((f) => ({
          id: f.properties.code,
          geometry: f.geometry,
          properties: {},
        })),
      ),
    [features],
  );
  const home = useMemo(() => cameraForBounds(bounds, LIMITS, 0.95), [bounds]);

  useEffect(() => {
    const el = canvas.current;
    const container = box.current;
    if (!el || !container || !el.getContext("2d")) {
      callbacks.current.onError();
      return;
    }
    const map = createMap(el, {
      shapes,
      palette: paletteOf(colours),
      fills,
      limits: { ...LIMITS, minZoom: home.k * 0.8 },
      home,
      onSelect: (id) => callbacks.current.onSelect(id),
      onHover: (id, x, y) => setTip(id ? { text: callbacks.current.describe(id), x, y } : null),
    });
    const resize = new ResizeObserver(() => {
      map.resize(container.clientWidth, container.clientHeight);
    });
    resize.observe(container);
    map.resize(container.clientWidth, container.clientHeight);
    mapRef.current = map;
    return () => {
      resize.disconnect();
      map.destroy();
      mapRef.current = null;
    };
    // The map is made once per boundary file; colours, fills and the selection update it in place.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shapes, home]);

  useEffect(() => mapRef.current?.setFills(fills), [fills]);
  useEffect(() => mapRef.current?.setPalette(paletteOf(colours)), [colours]);
  useEffect(() => mapRef.current?.setSelected(selected), [selected]);
  useEffect(() => {
    if (focus) mapRef.current?.flyTo(cameraForBounds(focus.bounds, LIMITS, 0.6));
  }, [focus]);

  const control =
    "flex h-10 w-10 items-center justify-center text-lg text-fg-primary hover:bg-surface-raised";
  return (
    <div ref={box} className="relative h-full w-full">
      <canvas
        ref={canvas}
        role="img"
        aria-label={label}
        className="block h-full w-full outline-none focus-visible:ring-2 focus-visible:ring-accent"
        onPointerLeave={() => setTip(null)}
      />
      <div className="absolute right-3 top-3 flex flex-col overflow-hidden rounded-control border border-default bg-surface-overlay">
        <button type="button" aria-label={zoomIn} className={control} onClick={() => mapRef.current?.zoomBy(1.6)}>
          +
        </button>
        <button
          type="button"
          aria-label={zoomOut}
          className={`${control} border-t border-default`}
          onClick={() => mapRef.current?.zoomBy(1 / 1.6)}
        >
          −
        </button>
      </div>
      {tip && (
        <div
          role="status"
          className="pointer-events-none absolute rounded-control border border-default bg-surface-overlay px-3 py-1.5 text-sm text-fg-primary"
          style={{ left: tip.x + 12, top: tip.y + 12 }}
        >
          {tip.text}
        </div>
      )}
    </div>
  );
}

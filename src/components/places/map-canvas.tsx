"use client";

import { useEffect, useRef, useState } from "react";
import type { MapColours } from "./map-colours";
import type * as MapLibre from "maplibre-gl";
import type { FeatureCollection, Geometry } from "geojson";
import maplibrePackage from "maplibre-gl/package.json";
import "maplibre-gl/dist/maplibre-gl.css";

async function loadMapLibre(): Promise<typeof MapLibre> {
  const url = `/vendor/maplibre-gl/${maplibrePackage.version}/maplibre-gl.mjs`;
  return (await import(
    /* webpackIgnore: true */ /* turbopackIgnore: true */ url
  )) as typeof MapLibre;
}

interface MapCanvasProps {
  /** Each feature's `id` is the place's feature in the boundary file. */
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
  onError: () => void;
}

const SOURCE = "places";

/**
 * The places, drawn from their boundary file and coloured by the caller, with
 * no base map under them: the data is the picture. Keyboard pans and zooms;
 * choosing a place by keyboard is the list's and the search box's job.
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
  onError,
}: MapCanvasProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibre.Map | null>(null);
  const [ready, setReady] = useState(false);
  const callbacks = useRef({ onSelect, describe, onError });
  useEffect(() => {
    callbacks.current = { onSelect, describe, onError };
  });

  useEffect(() => {
    let map: MapLibre.Map | null = null;
    let cancelled = false;
    let resize: ResizeObserver | null = null;
    loadMapLibre()
      .then((maplibre) => {
        if (cancelled || !container.current) {
          return;
        }
        const [w, s, e, n] = bounds;
        const padX = (e - w) * 0.25;
        const padY = (n - s) * 0.25;
        map = new maplibre.Map({
          container: container.current,
          style: { version: 8, sources: {}, layers: [] },
          bounds,
          fitBoundsOptions: { padding: 16 },
          maxBounds: [w - padX, s - padY, e + padX, n + padY],
          attributionControl: false,
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
          renderWorldCopies: false,
        });
        map.touchZoomRotate.disableRotation();
        map.keyboard.disableRotation();
        map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
        const popup = new maplibre.Popup({
          closeButton: false,
          closeOnClick: false,
          className: "places-map-tip",
          offset: 8,
        });
        map.on("load", () => {
          if (!map) {
            return;
          }
          map.addSource(SOURCE, { type: "geojson", data: features, promoteId: "code" });
          map.addLayer({
            id: "places-fill",
            type: "fill",
            source: SOURCE,
            paint: {
              "fill-color": ["coalesce", ["feature-state", "fill"], colours.noData],
            },
          });
          map.addLayer({
            id: "places-line",
            type: "line",
            source: SOURCE,
            paint: {
              "line-color": colours.boundary,
              "line-width": ["interpolate", ["linear"], ["zoom"], 6, 0.2, 10, 0.8, 13, 1.5],
            },
          });
          map.addLayer({
            id: "places-selected",
            type: "line",
            source: SOURCE,
            filter: ["==", ["get", "code"], ""],
            paint: { "line-color": colours.selected, "line-width": 2.5 },
          });
          setReady(true);
        });
        map.on("click", (event) => {
          const hit = map?.queryRenderedFeatures(event.point, { layers: ["places-fill"] })[0];
          callbacks.current.onSelect(hit ? String(hit.properties.code) : null);
        });
        map.on("mousemove", "places-fill", (event) => {
          const code = event.features?.[0]?.properties.code;
          if (!map || code === undefined) {
            return;
          }
          map.getCanvas().style.cursor = "pointer";
          popup
            .setLngLat(event.lngLat)
            .setText(callbacks.current.describe(String(code)))
            .addTo(map);
        });
        map.on("mouseleave", "places-fill", () => {
          if (map) {
            map.getCanvas().style.cursor = "";
          }
          popup.remove();
        });
        map.on("error", () => callbacks.current.onError());
        mapRef.current = map;
        resize = new ResizeObserver(() => map?.resize());
        resize.observe(container.current);
      })
      .catch(() => callbacks.current.onError());
    return () => {
      cancelled = true;
      resize?.disconnect();
      map?.remove();
      mapRef.current = null;
      setReady(false);
    };
    // The map is made once per boundary file; colours and fills update it in place.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [features]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) {
      return;
    }
    for (const feature of features.features) {
      const code = feature.properties.code;
      map.setFeatureState({ source: SOURCE, id: code }, { fill: fills.get(code) ?? null });
    }
  }, [ready, fills, features]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) {
      return;
    }
    map.setPaintProperty("places-fill", "fill-color", [
      "coalesce",
      ["feature-state", "fill"],
      colours.noData,
    ]);
    map.setPaintProperty("places-line", "line-color", colours.boundary);
    map.setPaintProperty("places-selected", "line-color", colours.selected);
  }, [ready, colours]);

  useEffect(() => {
    const map = mapRef.current;
    if (ready && map) {
      map.setFilter("places-selected", ["==", ["get", "code"], selected ?? ""]);
    }
  }, [ready, selected]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !focus) {
      return;
    }
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    map.fitBounds(focus.bounds, { padding: 64, maxZoom: 12, duration: still ? 0 : 900 });
  }, [ready, focus]);

  return (
    <div
      ref={container}
      role="region"
      aria-label={label}
      className="h-full w-full [&_.maplibregl-canvas]:outline-none"
    />
  );
}

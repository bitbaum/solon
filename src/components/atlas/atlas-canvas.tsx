"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GeoProjection } from "d3-geo";
import {
  createMap,
  shapesFromFeatures,
  type Camera,
  type LabelStyles,
  type Limits,
  type MapLabel,
  type MapController,
  type MapFeature,
  type Palette,
} from "@bitbaum/geo-kit/map";
import { pointAt } from "./world";

/** From the whole Earth to a street of a city commune, on one globe. */
export const ATLAS_LIMITS: Limits = { minZoom: 0.7, maxZoom: 3000, maxTilt: 75 };

/** Within this many pixels of a dot, a tap or a hover is that dot's place. */
const DOT_REACH = 12;

export interface AtlasCanvasProps {
  /** Every shape drawn, world first, a country's places after (so on top). */
  shapes: readonly MapFeature[];
  fills: ReadonlyMap<string, string>;
  palette: Palette;
  /** Dots on places too small to tap (Liechtenstein), by shape id. */
  dots: ReadonlyMap<string, [number, number]>;
  dotColour: string;
  selected: string | null;
  /** Called with the map once it is made and sized (so the page can fly it), and null when it goes. */
  onMap: (map: MapController | null) => void;
  home: Camera;
  /** Turn slowly while nobody touches it (the world, not a country). */
  spin: boolean;
  onSelect: (id: string | null) => void;
  /** What hovering a shape says; empty says nothing. */
  describe: (id: string) => string;
  /** Names on the map: countries, subdivisions, towns. */
  labels?: readonly MapLabel[];
  labelStyles?: LabelStyles | null;
  onSelectLabel?: (id: string) => void;
  /** Where the map looks, after it settles: the page loads what this view needs. */
  onCamera?: (camera: Camera, radius: number) => void;
  label: string;
  zoomIn: string;
  zoomOut: string;
  home_: string;
  onError: () => void;
}

/**
 * The atlas's one canvas, on the fleet's one map renderer
 * (`@bitbaum/geo-kit/map`): a globe zoomed out, a flat map of a country or a
 * commune zoomed in. Drag, pinch and the wheel move it; the keyboard turns and
 * zooms it, and choosing a place by keyboard is the search box's and the
 * list's job.
 */
export default function AtlasCanvas(props: AtlasCanvasProps) {
  const { shapes, fills, palette, dots, selected, home, label } = props;
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const map = useRef<MapController | null>(null);
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);
  const reported = useRef("");
  const settle = useRef(0);
  const live = useRef(props);
  useEffect(() => {
    live.current = props;
  });

  const built = useMemo(() => shapesFromFeatures([...shapes]), [shapes]);

  const dotHit = (x: number, y: number, projection: GeoProjection): string | null => {
    for (const [id, point] of live.current.dots) {
      const at = pointAt(point, projection);
      if (at && Math.hypot(at[0] - x, at[1] - y) <= DOT_REACH) return id;
    }
    return null;
  };

  useEffect(() => {
    const el = canvas.current;
    const container = box.current;
    if (!el || !container || !el.getContext("2d")) {
      live.current.onError();
      return;
    }
    const controller = createMap(el, {
      shapes: built,
      palette: live.current.palette,
      fills: live.current.fills,
      limits: ATLAS_LIMITS,
      home: live.current.home,
      idleTurn: true,
      holdStill: () => !live.current.spin,
      pickFirst: (x, y, projection, kind) => {
        const id = dotHit(x, y, projection);
        if (!id) return false;
        if (kind === "tap") live.current.onSelect(id);
        else setTip({ text: live.current.describe(id), x, y });
        return true;
      },
      labels: live.current.labels ?? [],
      ...(live.current.labelStyles ? { labelStyles: live.current.labelStyles } : {}),
      ...(live.current.onSelectLabel
        ? { onSelectLabel: (id: string) => live.current.onSelectLabel?.(id) }
        : {}),
      over: (ctx, _basis, projection) => {
        // Tell the page where the map rests, once it has rested a moment.
        const cam = controller.camera();
        const radius = projection.scale() / cam.k;
        const key = `${cam.center[0].toFixed(1)},${cam.center[1].toFixed(1)},${cam.k.toFixed(2)},${radius.toFixed(0)}`;
        if (key !== reported.current) {
          reported.current = key;
          window.clearTimeout(settle.current);
          settle.current = window.setTimeout(
            () => live.current.onCamera?.(controller.camera(), radius),
            220,
          );
        }
        if (live.current.dots.size === 0) return;
        ctx.save();
        ctx.fillStyle = live.current.dotColour;
        ctx.strokeStyle = live.current.palette.sphere;
        ctx.lineWidth = 1.5;
        for (const point of live.current.dots.values()) {
          const at = pointAt(point, projection);
          if (!at) continue;
          ctx.beginPath();
          ctx.arc(at[0], at[1], 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      },
      onSelect: (id) => live.current.onSelect(id),
      onHover: (id, x, y) => {
        const text = id ? live.current.describe(id) : "";
        setTip(text ? { text, x, y } : null);
      },
    });
    const resize = new ResizeObserver(() =>
      controller.resize(container.clientWidth, container.clientHeight),
    );
    resize.observe(container);
    controller.resize(container.clientWidth, container.clientHeight);
    map.current = controller;
    live.current.onMap(controller);
    return () => {
      window.clearTimeout(settle.current);
      resize.disconnect();
      controller.destroy();
      map.current = null;
      live.current.onMap(null);
    };
    // Made once; shapes, colours, the selection and the camera update it in place.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => map.current?.setShapes(built), [built]);
  useEffect(() => map.current?.setFills(fills), [fills]);
  useEffect(() => map.current?.setPalette(palette), [palette]);
  useEffect(() => map.current?.setSelected(selected), [selected]);
  useEffect(() => map.current?.invalidate(), [dots]);
  useEffect(
    () => map.current?.setLabels(props.labels ?? [], props.labelStyles ?? undefined),
    [props.labels, props.labelStyles],
  );

  const control =
    "flex h-11 w-11 items-center justify-center text-lg text-fg-primary hover:bg-surface-raised";
  return (
    <div ref={box} className="relative h-full w-full">
      <canvas
        ref={canvas}
        role="img"
        aria-label={label}
        className="block h-full w-full cursor-grab outline-none focus-visible:ring-2 focus-visible:ring-accent"
        onPointerLeave={() => setTip(null)}
      />
      <div className="absolute bottom-3 right-3 flex flex-col overflow-hidden rounded-control border border-default bg-surface-overlay">
        <button
          type="button"
          className={control}
          aria-label={props.zoomIn}
          onClick={() => map.current?.zoomBy(1.6)}
        >
          +
        </button>
        <button
          type="button"
          className={`${control} border-t border-default`}
          aria-label={props.zoomOut}
          onClick={() => map.current?.zoomBy(1 / 1.6)}
        >
          −
        </button>
        <button
          type="button"
          className={`${control} border-t border-default`}
          aria-label={props.home_}
          onClick={() => map.current?.flyTo(home)}
        >
          ⟲
        </button>
      </div>
      {tip && (
        <div
          role="status"
          className="pointer-events-none absolute z-10 rounded-control border border-default bg-surface-overlay px-3 py-1.5 text-sm text-fg-primary"
          style={{ left: tip.x + 12, top: tip.y + 12 }}
        >
          {tip.text}
        </div>
      )}
    </div>
  );
}

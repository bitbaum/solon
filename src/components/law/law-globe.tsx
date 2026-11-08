"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { Feature, Geometry } from "geojson";
import { geoCentroid, geoDistance, type GeoProjection } from "d3-geo";
import {
  WORLD_LIMITS,
  createMap,
  fade,
  shapesFromFeatures,
  type Camera,
  type MapController,
  type MapFeature,
  type Palette,
} from "@bitbaum/geo-kit/map";
import type { GlobePlace } from "@/lib/law/globe";

interface LawGlobeProps {
  /** The places to shade; fetched from /api/v1/law/globe when not given. */
  places?: GlobePlace[];
}

/** Rest on Europe, where most of what Solon holds is; the whole Earth in view. */
const HOME: Camera = { center: [8, 40], k: 1 };

/** A token as a colour: hex as it is, an HSL triplet as hsl(). */
function token(style: CSSStyleDeclaration, name: string): string {
  const value = style.getPropertyValue(name).trim();
  const triplet = /^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?%)\s+(\d+(?:\.\d+)?%)$/.exec(value);
  return triplet ? `hsl(${triplet[1]}, ${triplet[2]}, ${triplet[3]})` : value;
}

interface Colours {
  palette: Palette;
  scale: string[];
}

/** The globe's colours, from the design tokens, so it is the site's own. */
function readColours(): Colours {
  const s = getComputedStyle(document.documentElement);
  const accent = token(s, "--accent-primary");
  return {
    palette: {
      sphere: token(s, "--surface-raised"),
      sphereLight: token(s, "--surface-hover"),
      graticule: token(s, "--border-subtle"),
      land: token(s, "--map-no-data"),
      border: token(s, "--map-boundary"),
      hover: fade(accent, 0.7),
      selected: accent,
      glow: [fade(accent, 0.18), fade(accent, 0)],
      limb: [fade(token(s, "--surface-page"), 0), fade(token(s, "--surface-page"), 0.45)],
      borderWidth: 0.5,
    },
    scale: [1, 2, 3, 4, 5, 6, 7].map((k) => token(s, `--map-scale-${k}`)),
  };
}

/** More law, a stronger shade: by order of magnitude, so ten acts show and ten thousand stand out. */
const shadeOf = (acts: number, scale: string[]) =>
  scale[Math.min(scale.length - 1, Math.max(0, Math.round(Math.log10(Math.max(acts, 1)) * 1.6)))]!;

/** Each place that holds law, shaded by how much. */
const fillsOf = (places: readonly GlobePlace[], scale: string[]) =>
  new Map(
    scale.length
      ? places.filter((p) => p.acts > 0).map((p) => [p.feature, shadeOf(p.acts, scale)])
      : [],
  );

/** Within this many pixels of a place's dot, a tap or a hover is that place's. */
const DOT_REACH = 12;

/** Where each place's dot stands on the canvas now, or null on the far side of the Earth. */
function dotAt(point: [number, number], projection: GeoProjection): [number, number] | null {
  const [lambda, phi] = projection.rotate();
  if (geoDistance(point, [-lambda, -phi]) > Math.PI / 2 - 0.05) return null;
  return projection(point) ?? null;
}

type Layer = { objects: Record<string, unknown> };

/** The outlines, loaded only once the globe is on screen: Natural Earth's countries, the Census Bureau's states. */
async function loadOutlines(stateIds: Set<string>): Promise<MapFeature[]> {
  const [{ feature }, world, us] = await Promise.all([
    import("topojson-client"),
    import("world-atlas/countries-50m.json"),
    import("us-atlas/states-10m.json"),
  ]);
  const features = (topology: Layer, object: string) =>
    (
      feature(topology as never, topology.objects[object] as never) as unknown as {
        features: Feature<Geometry, { name?: string }>[];
      }
    ).features;
  const countries = features(world.default as Layer, "countries")
    .filter((f) => f.id !== undefined && f.geometry)
    .map((f) => ({ id: `countries:${f.id}`, geometry: f.geometry, properties: {} }));
  // A state is drawn only where Solon holds its law, on top of its country.
  const states = features(us.default as Layer, "states")
    .filter((f) => stateIds.has(String(f.id)))
    .map((f) => ({ id: `states:${f.id}`, geometry: f.geometry, properties: {} }));
  return [...countries, ...states];
}

/**
 * The law Solon holds, on the Earth: every place shaded by how much of its
 * law Solon holds, a tap opening it. The fleet's one map renderer
 * (`@bitbaum/geo-kit/map`) draws it, the site's tokens colour it.
 */
export default function LawGlobe({ places: given }: LawGlobeProps) {
  const [fetched, setFetched] = useState<GlobePlace[]>([]);
  useEffect(() => {
    if (given) return;
    let cancelled = false;
    fetch("/api/v1/law/globe")
      .then((res) => (res.ok ? res.json() : { places: [] }))
      .then((body: { places: GlobePlace[] }) => !cancelled && setFetched(body.places))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [given]);
  const places = given ?? fetched;
  const t = useTranslations("Law.globe");
  const locale = useLocale();
  const labels = {
    globe: t("label"),
    held: (name: string, count: number) => t("held", { name, count }),
    none: (name: string) => t("none", { name }),
    zoomIn: t("zoomIn"),
    zoomOut: t("zoomOut"),
    home: t("home"),
    credit: t("credit"),
  };
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const map = useRef<MapController | null>(null);
  const [features, setFeatures] = useState<MapFeature[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);
  // A country is named in the reader's language; a state by its own name.
  const byFeature = useMemo(() => {
    const regions = new Intl.DisplayNames([locale], { type: "region" });
    return new Map(
      places.map((p) => [
        p.feature,
        { ...p, name: p.region ? (regions.of(p.region) ?? p.name) : p.name },
      ]),
    );
  }, [places, locale]);
  const live = useRef({ byFeature, router, labels, places });
  const scale = useRef<string[]>([]);
  useEffect(() => {
    live.current = { byFeature, router, labels, places };
  });

  // A dot at the middle of every place Solon holds law for, so the small ones (Liechtenstein) can be seen and tapped.
  const dots = useMemo(
    () =>
      new Map(
        (features ?? []).flatMap((f) =>
          byFeature.get(f.id) && byFeature.get(f.id)!.acts > 0
            ? [[f.id, geoCentroid(f.geometry as never) as [number, number]] as const]
            : [],
        ),
      ),
    [features, byFeature],
  );
  const liveDots = useRef(dots);
  useEffect(() => {
    liveDots.current = dots;
  });
  const dotHit = (x: number, y: number, projection: GeoProjection): string | null => {
    for (const [id, point] of liveDots.current) {
      const at = dotAt(point, projection);
      if (at && Math.hypot(at[0] - x, at[1] - y) <= DOT_REACH) return id;
    }
    return null;
  };

  const stateIds = useMemo(
    () =>
      new Set(places.filter((p) => p.feature.startsWith("states:")).map((p) => p.feature.slice(7))),
    [places],
  );
  useEffect(() => {
    let cancelled = false;
    loadOutlines(stateIds).then(
      (f) => !cancelled && setFeatures(f),
      () => !cancelled && setFailed(true),
    );
    return () => {
      cancelled = true;
    };
  }, [stateIds]);

  useEffect(() => {
    const el = canvas.current;
    const container = box.current;
    if (!features || !el || !container || !el.getContext("2d")) return;
    let colours = readColours();
    scale.current = colours.scale;
    const controller = createMap(el, {
      shapes: shapesFromFeatures(features),
      palette: colours.palette,
      fills: fillsOf(live.current.places, colours.scale),
      limits: WORLD_LIMITS,
      home: HOME,
      idleTurn: true,
      pickFirst: (x, y, projection, kind) => {
        const id = dotHit(x, y, projection);
        if (!id) return false;
        const place = live.current.byFeature.get(id)!;
        if (kind === "tap") live.current.router.push(`/law/place/${place.key}`);
        else setTip({ text: live.current.labels.held(place.name, place.acts), x, y });
        return true;
      },
      over: (ctx, _basis, projection) => {
        ctx.save();
        ctx.fillStyle = colours.palette.selected;
        ctx.strokeStyle = colours.palette.sphere;
        ctx.lineWidth = 1.5;
        for (const point of liveDots.current.values()) {
          const at = dotAt(point, projection);
          if (!at) continue;
          ctx.beginPath();
          ctx.arc(at[0], at[1], 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      },
      onSelect: (id) => {
        const place = id ? live.current.byFeature.get(id) : undefined;
        if (place) live.current.router.push(`/law/place/${place.key}`);
      },
      onHover: (id, x, y) => {
        const place = id ? live.current.byFeature.get(id) : undefined;
        setTip(
          place
            ? {
                text:
                  place.acts > 0
                    ? live.current.labels.held(place.name, place.acts)
                    : live.current.labels.none(place.name),
                x,
                y,
              }
            : null,
        );
      },
    });
    const resize = new ResizeObserver(() =>
      controller.resize(container.clientWidth, container.clientHeight),
    );
    resize.observe(container);
    controller.resize(container.clientWidth, container.clientHeight);
    map.current = controller;
    // The theme lives in <html>'s class: read the tokens again when it changes.
    const theme = new MutationObserver(() => {
      colours = readColours();
      controller.setPalette(colours.palette);
    });
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => {
      theme.disconnect();
      resize.disconnect();
      controller.destroy();
      map.current = null;
    };
    // The map is made once per set of outlines; the shading updates it in place.
  }, [features]);

  useEffect(() => {
    map.current?.setFills(fillsOf(places, scale.current));
  }, [places, features]);

  const control =
    "flex h-11 w-11 items-center justify-center text-lg text-fg-primary hover:bg-surface-raised";
  return (
    <figure className="w-full">
      <div ref={box} className="relative aspect-square w-full">
        <canvas
          ref={canvas}
          role="img"
          aria-label={labels.globe}
          className="block h-full w-full cursor-grab outline-none focus-visible:ring-2 focus-visible:ring-accent"
          onPointerLeave={() => setTip(null)}
        />
        {failed && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-fg-tertiary">
            {labels.globe}
          </p>
        )}
        <div className="absolute bottom-3 right-3 flex flex-col overflow-hidden rounded-control border border-default bg-surface-overlay">
          <button
            type="button"
            className={control}
            aria-label={labels.zoomIn}
            onClick={() => map.current?.zoomBy(1.6)}
          >
            +
          </button>
          <button
            type="button"
            className={control}
            aria-label={labels.zoomOut}
            onClick={() => map.current?.zoomBy(1 / 1.6)}
          >
            −
          </button>
          <button
            type="button"
            className={control}
            aria-label={labels.home}
            onClick={() => map.current?.flyTo(HOME)}
          >
            ⟲
          </button>
        </div>
        {tip && (
          <div
            className="pointer-events-none absolute z-10 rounded-control border border-default bg-surface-overlay px-3 py-1.5 text-sm text-fg-primary"
            style={{ left: tip.x + 12, top: tip.y + 12 }}
          >
            {tip.text}
          </div>
        )}
      </div>
      <figcaption className="mt-2 text-xs text-fg-tertiary">{labels.credit}</figcaption>
    </figure>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { geoCentroid } from "d3-geo";
import {
  cameraFor,
  cameraForBounds,
  type Camera,
  type MapController,
  type MapFeature,
} from "@bitbaum/geo-kit/map";
import { Link, useRouter } from "@/i18n/navigation";
import { REGISTER_POLICY_DEFAULTS } from "@/lib/config/places/policies";
import type { GlobePlace } from "@/lib/law/globe";
import type { AddressHit } from "@/lib/places/address-search";
import { compareHref, formatMoney } from "@/lib/places/compare-view";
import { areaHolds, type MapData, type MapPlace } from "@/lib/places/map-view";
import { loadDrawn, type Bounds, type Drawn } from "@/components/places/drawn";
import { useMapColours } from "@/components/places/map-colours";
import MapCard from "@/components/places/map-card";
import MapLegend from "@/components/places/map-legend";
import MapList from "@/components/places/map-list";
import MapSearch from "@/components/places/map-search";
import SourceList from "@/components/places/source-list";
import TaxSituation from "@/components/places/tax-situation";
import { useTaxLayer } from "@/components/places/tax-layer";
import AtlasCanvas, { ATLAS_LIMITS } from "./atlas-canvas";
import { COUNTRIES } from "@/lib/config/world/countries";
import { atlasPalette, loadWorld, readAtlasTokens, shadeOf, type AtlasTokens } from "./world";
import {
  ADMIN1,
  ADMIN1_FROM_LEVEL,
  countriesNear,
  labelStyles,
  loadAdmin1,
  loadTowns,
  loadWorldIndex,
  loadWorldLabels,
  TOWNS_FROM_LEVEL,
  townLabels,
  worldLabels,
  type Town,
  zoomOfLevel,
  type WorldIndex,
  type WorldLabels,
} from "./world-labels";

/** Rest on Europe, where most of what Solon holds is; the whole Earth in view. */
const HOME: Camera = { center: [8, 40], k: 1 };
/** Roughly a street's width around an address, so the map zooms to it rather than the whole place. */
const ADDRESS_SPAN = 0.004;
/** A country fills most of the map, however small (Liechtenstein stops short of one valley). */
const COUNTRY_ZOOM = { fill: 0.85, most: 120 };
/** A country's own places are drawn under this prefix, apart from the world's shapes. */
const SUB = "sub:";

interface AtlasProps {
  /**
   * `preview` is the home page's: the world only, a tap opening the country in
   * the atlas on /places. `full` is /places: a tap flies into the country.
   */
  mode: "preview" | "full";
  /** The law key of the country open at first (`?in=`), in full mode. */
  initial?: string | null;
}

/**
 * The atlas (one for all of Solon): the Earth, every place whose law Solon
 * holds shaded by how much, and, inside a country, its places, coloured by
 * what tax would cost the reader there. Beside it, what Solon holds for the
 * place in view: its law, its places, its tax. Estimates run in the browser;
 * an income never leaves it.
 */
export default function Atlas({ mode, initial = null }: AtlasProps) {
  const t = useTranslations("Atlas");
  const tg = useTranslations("Law.globe");
  const tm = useTranslations("Places.map");
  const tc = useTranslations("Places.compare");
  const tp = useTranslations("Places");
  const locale = useLocale();
  const router = useRouter();
  const colours = useMapColours();
  const [tokens, setTokens] = useState<AtlasTokens | null>(null);
  useEffect(() => {
    const read = () => setTokens(readAtlasTokens());
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // What Solon holds where.
  const [places, setPlaces] = useState<GlobePlace[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/v1/law/globe", { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : { places: [] }))
      .then((body: { places: GlobePlace[] }) => setPlaces(body.places))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);
  const named = useMemo(() => {
    const regions = new Intl.DisplayNames([locale], { type: "region" });
    return places.map((p) => ({
      ...p,
      name: p.region ? (regions.of(p.region) ?? p.name) : p.name,
    }));
  }, [places, locale]);
  const byFeature = useMemo(() => new Map(named.map((p) => [p.feature, p])), [named]);

  // The world's outlines.
  const stateIds = useMemo(
    () =>
      new Set(places.filter((p) => p.feature.startsWith("states:")).map((p) => p.feature.slice(7))),
    [places],
  );
  const stateKey = [...stateIds].sort().join(",");
  const [world, setWorld] = useState<MapFeature[] | null>(null);
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    let cancelled = false;
    loadWorld(new Set(stateKey ? stateKey.split(",") : [])).then(
      (f) => !cancelled && setWorld(f),
      () => !cancelled && setBroken(true),
    );
    return () => {
      cancelled = true;
    };
  }, [stateKey]);
  const worldById = useMemo(() => new Map((world ?? []).map((f) => [f.id, f])), [world]);

  // Names and subdivisions for the whole world, once the globe is on screen.
  const [labelData, setLabelData] = useState<WorldLabels | null>(null);
  const [worldIndex, setWorldIndex] = useState<WorldIndex | null>(null);
  useEffect(() => {
    if (!world) return;
    loadWorldLabels().then(setLabelData, () => undefined);
    loadWorldIndex().then(setWorldIndex, () => undefined);
  }, [world]);
  const [cam, setCam] = useState<{ camera: Camera; radius: number } | null>(null);
  const onCamera = useCallback((camera: Camera, radius: number) => setCam({ camera, radius }), []);
  const radius = Math.round((cam?.radius ?? 280) / 20) * 20;
  // ISO two-letter code to the world's shape id, and back, from the labels file.
  const featureOfA2 = useMemo(
    () =>
      new Map(
        COUNTRIES.flatMap((c) => (c.n3 ? [[c.a2, `countries:${c.n3}` as string] as const] : [])),
      ),
    [],
  );
  const a2OfFeature = useMemo(
    () => new Map([...featureOfA2].map(([a2, f]) => [f, a2])),
    [featureOfA2],
  );
  const regionByCode = useMemo(
    () => new Map((labelData?.regions ?? []).map((r) => [r.code, r])),
    [labelData],
  );
  const [admin1, setAdmin1] = useState<Map<string, MapFeature[]>>(new Map());
  const [towns, setTowns] = useState<Map<string, Town[]>>(new Map());
  // Asked once per country; a result is kept whenever it lands, so a newer view never drops it.
  const askedTowns = useRef(new Set<string>());
  useEffect(() => {
    if (!cam || !worldIndex) return;
    const { camera } = cam;
    if (camera.k < zoomOfLevel(TOWNS_FROM_LEVEL, cam.radius)) return;
    const reach = (Math.asin(Math.min(1, 1.4 / camera.k)) * 180) / Math.PI;
    for (const a2 of countriesNear(worldIndex, camera.center, reach, 6)) {
      if (askedTowns.current.has(a2)) continue;
      askedTowns.current.add(a2);
      loadTowns(a2, worldIndex).then(
        (list) => setTowns((was) => (was.has(a2) ? was : new Map(was).set(a2, list))),
        () => askedTowns.current.delete(a2),
      );
    }
  }, [cam, worldIndex]);
  const askedAdmin1 = useRef(new Set<string>());
  useEffect(() => {
    if (!cam || !worldIndex) return;
    const { camera } = cam;
    if (camera.k < zoomOfLevel(ADMIN1_FROM_LEVEL, cam.radius)) return;
    const reach = (Math.asin(Math.min(1, 1.4 / camera.k)) * 180) / Math.PI;
    for (const a2 of countriesNear(worldIndex, camera.center, reach)) {
      if (askedAdmin1.current.has(a2)) continue;
      askedAdmin1.current.add(a2);
      loadAdmin1(a2, worldIndex).then(
        (features) => setAdmin1((was) => (was.has(a2) ? was : new Map(was).set(a2, features))),
        () => askedAdmin1.current.delete(a2),
      );
    }
  }, [cam, worldIndex]);

  // The country open, by its law key, and its places when drawn.
  const [open, setOpen] = useState<string | null>(mode === "full" ? initial : null);
  const country = named.find((p) => p.key === open) ?? null;
  // What was loaded for a country, kept with the country it is for, so another's never shows.
  const [loaded, setLoaded] = useState<{
    pack: string;
    data: MapData | null;
    drawn: Drawn | null;
    failed?: boolean;
  } | null>(null);
  const wanted = country?.pack && country.drawn ? country.pack : null;
  useEffect(() => {
    if (!wanted) return;
    const controller = new AbortController();
    fetch(`/api/v1/places/map?${new URLSearchParams({ pack: wanted, locale })}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`map data: ${res.status}`);
        return res.json() as Promise<MapData>;
      })
      .then(async (mapData) => {
        setLoaded({ pack: wanted, data: mapData, drawn: null });
        const drawnPlaces = await loadDrawn(mapData, controller.signal);
        setLoaded({ pack: wanted, data: mapData, drawn: drawnPlaces });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLoaded((was) => ({
            pack: wanted,
            data: was?.pack === wanted ? was.data : null,
            drawn: null,
            failed: true,
          }));
        }
      });
    return () => controller.abort();
  }, [wanted, locale]);
  const current = loaded && loaded.pack === wanted ? loaded : null;
  const data = current?.data ?? null;
  const drawn = current?.drawn ?? null;
  const failed = Boolean(current?.failed);
  const loading = Boolean(wanted) && !drawn && !failed;

  const tax = useTaxLayer(data, colours);
  const [selected, setSelected] = useState<string | null>(null);
  const map = useRef<MapController | null>(null);
  const fly = (camera: Camera | null) => {
    if (camera) map.current?.flyTo(camera);
  };
  const [view, setView] = useState<"map" | "list">("map");
  const [notice, setNotice] = useState<string | null>(null);
  const [tray, setTray] = useState<MapPlace[]>([]);

  // Keep the address in step, so a view can be shared: /places?in=ch.
  useEffect(() => {
    if (mode !== "full") return;
    const url = new URL(window.location.href);
    if (open) url.searchParams.set("in", open);
    else url.searchParams.delete("in");
    window.history.replaceState(window.history.state, "", url);
  }, [mode, open]);

  const openCountry = useCallback(
    (place: GlobePlace | undefined) => {
      if (!place) return;
      if (mode === "preview") {
        router.push(`/places?in=${place.key}`);
        return;
      }
      setSelected(null);
      setNotice(null);
      setView("map");
      setOpen(place.key);
      const shape = worldById.get(place.feature);
      if (shape) fly(cameraFor(shape.geometry, ATLAS_LIMITS, COUNTRY_ZOOM));
    },
    [mode, router, worldById],
  );

  // Facing the country asked for in the address, once both the map and the country are known.
  const faced = useRef(false);
  const onMap = useCallback((controller: MapController | null) => {
    map.current = controller;
  }, []);
  useEffect(() => {
    if (faced.current || !country || !world || !map.current) return;
    faced.current = true;
    const shape = worldById.get(country.feature);
    const camera = shape ? cameraFor(shape.geometry, ATLAS_LIMITS, COUNTRY_ZOOM) : null;
    if (camera) map.current.flyTo(camera);
  });

  // Once its places arrive, frame them rather than the country's outline (which may include islands far away).
  useEffect(() => {
    if (drawn) map.current?.flyTo(cameraForBounds(drawn.bounds, ATLAS_LIMITS, 0.9));
  }, [drawn]);

  const openA2 = drawn ? (country?.region ?? null) : null;
  const shapes = useMemo<MapFeature[]>(() => {
    const all = world ?? [];
    const countries = all.filter((f) => f.id.startsWith("countries:"));
    const rest = all.filter((f) => !f.id.startsWith("countries:"));
    // Each lies over the one before, so each is its own layer (geo-kit never merges layers into one path).
    const subdivisions = [...admin1]
      .flatMap(([a2, features]) => (a2 === openA2 ? [] : features))
      .map((f) => ({ ...f, layer: 1 }));
    const base = [...countries, ...subdivisions, ...rest.map((f) => ({ ...f, layer: 2 }))];
    if (!drawn) return base;
    return [
      ...base,
      ...drawn.features.features.map((f) => ({
        id: SUB + f.properties.code,
        geometry: f.geometry,
        properties: {},
        layer: 3,
      })),
    ];
  }, [world, drawn, admin1, openA2]);

  const fills = useMemo(() => {
    const out = new Map<string, string>();
    if (!colours) return out;
    if (open) {
      for (const [code, fill] of tax.fills) out.set(SUB + code, fill);
      return out;
    }
    for (const p of named) if (p.acts > 0) out.set(p.feature, shadeOf(p.acts, colours.scale));
    // A subdivision is drawn over its country, so it wears the country's shade.
    for (const [a2, features] of admin1) {
      const fill = out.get(featureOfA2.get(a2) ?? "");
      if (fill) for (const f of features) out.set(f.id, fill);
    }
    return out;
  }, [colours, open, tax.fills, named, admin1, featureOfA2]);

  // A dot on each country Solon holds law for, so the small ones can be found; none inside a country.
  const dots = useMemo(() => {
    if (open) return new Map<string, [number, number]>();
    return new Map(
      named.flatMap((p) => {
        const shape = worldById.get(p.feature);
        return p.acts > 0 && shape
          ? [[p.feature, geoCentroid(shape.geometry as never) as [number, number]] as const]
          : [];
      }),
    );
  }, [open, named, worldById]);

  const regionNames = useMemo(() => new Intl.DisplayNames([locale], { type: "region" }), [locale]);
  const countryName = (a2: string | undefined): string => {
    if (!a2) return "";
    try {
      return regionNames.of(a2) ?? a2;
    } catch {
      return a2;
    }
  };
  const describe = (id: string): string => {
    if (id.startsWith(SUB)) return tax.describe(id.slice(SUB.length), tm("notYet"));
    if (id.startsWith(ADMIN1)) {
      const region = regionByCode.get(id.slice(ADMIN1.length));
      if (!region) return "";
      const place = byFeature.get(featureOfA2.get(region.a2) ?? "");
      const name = `${region.names[locale] ?? region.name}, ${countryName(region.a2)}`;
      return place && place.acts > 0 ? tg("held", { name, count: place.acts }) : name;
    }
    const place = byFeature.get(id);
    if (place && place.acts > 0) return tg("held", { name: place.name, count: place.acts });
    return place?.name ?? countryName(a2OfFeature.get(id));
  };

  const onSelect = (id: string | null) => {
    setNotice(null);
    if (!id) {
      setSelected(null);
      return;
    }
    if (id.startsWith(SUB)) {
      setSelected(id);
      return;
    }
    const countryFeature = id.startsWith(ADMIN1)
      ? featureOfA2.get(regionByCode.get(id.slice(ADMIN1.length))?.a2 ?? "")
      : id;
    const place = byFeature.get(countryFeature ?? "");
    if (place && place.key !== open) openCountry(place);
    // A place Solon holds nothing for yet is still named and outlined, so a tap always answers.
    else if (!place) setSelected(id);
  };

  const onSelectLabel = (id: string) => {
    if (!labelData || !cam) return;
    const [kind, key] = [id.slice(0, 2), id.slice(2)];
    const r = cam.radius;
    if (kind === "c:") {
      const feature = featureOfA2.get(key);
      const place = feature ? byFeature.get(feature) : undefined;
      if (place) return openCountry(place);
      const shape = feature ? worldById.get(feature) : undefined;
      if (feature) setSelected(feature);
      if (shape) fly(cameraFor(shape.geometry, ATLAS_LIMITS, COUNTRY_ZOOM));
      return;
    }
    if (kind === "r:") {
      const region = regionByCode.get(key);
      if (!region) return;
      setSelected(ADMIN1 + key);
      fly({ center: region.at, k: Math.max(cam.camera.k, zoomOfLevel(region.z + 1.5, r)) });
      return;
    }
    if (kind === "g:") {
      const [a2, i] = key.split(":");
      const t = towns.get(a2 ?? "")?.[Number(i)];
      if (t) fly({ center: [t[0], t[1]], k: Math.max(cam.camera.k * 2, zoomOfLevel(10, r)) });
      return;
    }
    const town = labelData.towns[Number(key)];
    if (town) fly({ center: town.at, k: Math.max(cam.camera.k * 1.5, zoomOfLevel(town.z + 2, r)) });
  };

  const showBounds = (feature: string, bounds: Bounds | undefined) => {
    setNotice(null);
    setSelected(SUB + feature);
    setView("map");
    if (bounds) fly(cameraForBounds(bounds, ATLAS_LIMITS, 0.6));
  };
  const showPlace = (place: MapPlace) =>
    showBounds(place.feature, drawn?.areas.get(place.feature)?.bounds);
  const showAddress = (hit: AddressHit) => {
    const [x, y] = hit.position;
    const holder = [...(drawn?.areas ?? [])].find(
      ([code, area]) =>
        tax.byFeature.has(code) &&
        x >= area.bounds[0] &&
        x <= area.bounds[2] &&
        y >= area.bounds[1] &&
        y <= area.bounds[3] &&
        areaHolds(area.geometry, hit.position),
    );
    if (!holder) {
      setNotice(tm("addressOutside", { address: hit.label }));
      return;
    }
    showBounds(holder[0], [x - ADDRESS_SPAN, y - ADDRESS_SPAN, x + ADDRESS_SPAN, y + ADDRESS_SPAN]);
  };

  const backToWorld = () => {
    setOpen(null);
    setSelected(null);
    setNotice(null);
    fly(HOME);
  };

  const limit = REGISTER_POLICY_DEFAULTS.compareLimit;
  const toggleCompare = (place: MapPlace) =>
    setTray((current) =>
      current.some((p) => p.slugPath === place.slugPath)
        ? current.filter((p) => p.slugPath !== place.slugPath)
        : current.length < limit
          ? [...current, place]
          : current,
    );

  const selectedRow = selected ? tax.byFeature.get(selected.slice(SUB.length)) : undefined;
  const selectedTotal =
    selectedRow?.estimate.kind === "estimate" ? selectedRow.estimate.estimate.total : null;
  const rank =
    selectedTotal === null
      ? null
      : {
          rank: tax.totals.filter((total) => total < selectedTotal - 0.5).length + 1,
          count: tax.totals.length,
        };
  const caption =
    data && tax.taxPack && tax.money
      ? tax.example
        ? tm("legendExample", {
            amount: formatMoney(tax.taxPack.exampleBase!, tax.money),
            year: data.period.slice(0, 4),
          })
        : data.earlierYear
          ? tm("legendEarlier", { year: data.period.slice(0, 4) })
          : tm("legend", { year: data.period.slice(0, 4) })
      : "";

  const labels = useMemo(
    () =>
      labelData
        ? [
            ...worldLabels(
              labelData,
              locale,
              radius,
              new Set(openA2 ? [openA2] : []),
              new Set(towns.keys()),
            ),
            ...[...towns].flatMap(([a2, list]) => townLabels(a2, list, radius)),
          ]
        : [],
    [labelData, locale, radius, openA2, towns],
  );
  const styles = useMemo(
    () =>
      tokens && colours
        ? labelStyles({
            text: tokens.text,
            muted: tokens.muted,
            faint: tokens.faint,
            halo: tokens.land,
            font: tokens.font,
          })
        : null,
    [tokens, colours],
  );
  const palette = useMemo(() => {
    if (!colours || !tokens) return null;
    const p = atlasPalette(colours, tokens);
    // Inside an open country its places carry the colour; a wash over the whole country would hide it.
    return open ? { ...p, selectedFill: undefined } : p;
  }, [colours, tokens, open]);
  const ready = colours && tokens && palette && world && !broken;
  const canvas = ready ? (
    <AtlasCanvas
      shapes={shapes}
      fills={fills}
      palette={palette}
      dots={dots}
      dotColour={colours.selected}
      selected={selected ?? country?.feature ?? null}
      onMap={onMap}
      home={HOME}
      spin={!open}
      onSelect={onSelect}
      labels={labels}
      labelStyles={styles}
      onSelectLabel={onSelectLabel}
      onCamera={onCamera}
      describe={describe}
      label={country ? t("mapLabelCountry", { country: country.name }) : tg("label")}
      zoomIn={tg("zoomIn")}
      zoomOut={tg("zoomOut")}
      home_={tg("home")}
      onError={() => setBroken(true)}
    />
  ) : (
    <div role="status" className="flex h-full items-center justify-center text-fg-secondary">
      {broken ? t("unavailable") : tm("loading")}
    </div>
  );

  if (mode === "preview") {
    return (
      <figure className="w-full">
        <div className="relative aspect-square w-full">{canvas}</div>
        <figcaption className="mt-2 text-xs text-fg-tertiary">{tg("credit")}</figcaption>
      </figure>
    );
  }

  const held = named.filter((p) => p.acts > 0 || p.pack).sort((a, b) => b.acts - a.acts);

  return (
    <div className="space-y-4">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-3">
          {drawn && data && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <MapSearch data={data} onPlace={showPlace} onAddress={showAddress} />
              </div>
              <div
                role="group"
                aria-label={tm("viewLabel")}
                className="inline-flex shrink-0 rounded-control border border-default p-1"
              >
                {(["map", "list"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={view === v}
                    onClick={() => setView(v)}
                    className={`min-h-10 rounded-control px-4 text-sm font-semibold ${
                      view === v
                        ? "bg-accent text-on-accent"
                        : "text-fg-primary hover:bg-surface-raised"
                    }`}
                  >
                    {v === "map" ? tm("viewMap") : tm("viewList")}
                  </button>
                ))}
              </div>
            </div>
          )}
          {notice && (
            <p role="status" className="text-sm text-fg-secondary">
              {notice}
            </p>
          )}
          {view === "list" && drawn && data ? (
            <MapList rows={tax.rows} levelName={data.levelName} onShow={showPlace} />
          ) : (
            <div className="relative h-[70vh] min-h-96 overflow-hidden rounded-surface border border-default bg-surface-raised">
              {canvas}
              {selectedRow && (
                <div className="absolute inset-x-3 bottom-3 sm:right-auto sm:w-80">
                  <MapCard
                    place={selectedRow.place}
                    estimate={selectedRow.estimate}
                    taxPack={tax.taxPack}
                    rank={rank}
                    aboveCheapest={
                      selectedTotal === null || tax.totals.length === 0
                        ? null
                        : selectedTotal - tax.totals[0]!
                    }
                    example={tax.example}
                    compare={{
                      holds: tray.some((p) => p.slugPath === selectedRow.place.slugPath),
                      full: tray.length >= limit,
                      toggle: () => toggleCompare(selectedRow.place),
                    }}
                    onClose={() => setSelected(null)}
                  />
                </div>
              )}
            </div>
          )}
          <p className="text-xs text-fg-tertiary">{tg("credit")}</p>
        </div>

        <aside className="space-y-6" aria-live="polite">
          {country ? (
            <>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={backToWorld}
                  className="text-sm text-fg-secondary hover:text-fg-primary hover:underline"
                >
                  ← {t("world")}
                </button>
                <h2 className="headline text-2xl text-fg-primary">{country.name}</h2>
              </div>
              <section className="space-y-2 rounded-surface border border-default bg-surface-base p-5">
                <h3 className="font-semibold text-fg-primary">{t("lawTitle")}</h3>
                <p className="text-sm text-fg-secondary">
                  {country.acts > 0
                    ? t("lawHeld", { count: country.acts })
                    : t("lawNone", { country: country.name })}
                </p>
                <Link
                  href={`/law/place/${country.key}`}
                  className="inline-block text-sm font-semibold text-fg-primary hover:underline"
                >
                  {t("lawOpen")} →
                </Link>
              </section>
              {country.pack && (
                <section className="space-y-2 rounded-surface border border-default bg-surface-base p-5">
                  <h3 className="font-semibold text-fg-primary">{t("placesTitle")}</h3>
                  <p className="text-sm text-fg-secondary">
                    {loading
                      ? tm("loading")
                      : drawn && data
                        ? t("placesDrawn", { level: data.levelName })
                        : t("placesNotDrawn")}
                  </p>
                  <Link
                    href={`/places/${country.pack}`}
                    className="inline-block text-sm font-semibold text-fg-primary hover:underline"
                  >
                    {t("placesOpen", { country: country.name })} →
                  </Link>
                </section>
              )}
              {drawn && tax.taxPack && tax.input && (
                <details className="group rounded-surface border border-default bg-surface-base">
                  <summary className="cursor-pointer list-none px-5 py-4 font-semibold text-fg-primary">
                    {tc("yourSituation")}
                    <span className="block text-sm font-normal text-fg-secondary">
                      {t("situationHint")}
                    </span>
                  </summary>
                  <div className="border-t border-default">
                    <TaxSituation
                      pack={tax.taxPack}
                      input={tax.input}
                      onChange={(patch) => tax.updateInput(tax.taxPack!.key, patch)}
                      title={tc("yourSituation")}
                      idPrefix="atlas"
                      layout="narrow"
                    />
                  </div>
                </details>
              )}
              {drawn &&
              tax.money &&
              tax.totals.length > 0 &&
              tax.totals[0] === tax.totals.at(-1) ? (
                <p className="text-sm text-fg-secondary">
                  {t("taxSameEverywhere", { amount: formatMoney(tax.totals[0]!, tax.money) })}
                </p>
              ) : null}
              {drawn &&
                tax.taxPack &&
                colours &&
                tax.money &&
                tax.totals.length > 0 &&
                tax.totals[0] !== tax.totals.at(-1) && (
                  <MapLegend
                    breaks={tax.breaks}
                    range={[tax.totals[0]!, tax.totals.at(-1)!]}
                    colours={colours}
                    money={tax.money}
                    caption={caption}
                  />
                )}
              {drawn && tax.taxPack && (
                <p className="text-xs text-fg-tertiary">
                  {tax.taxPack.excludes} {tc("disclaimer")} {tc("privacy")}
                </p>
              )}
              {data && data.sources.length > 0 && (
                <details className="rounded-surface border border-default bg-surface-base p-5 text-sm">
                  <summary className="cursor-pointer font-semibold text-fg-primary">
                    {t("sources", { count: data.sources.length })}
                  </summary>
                  <div className="mt-4">
                    <SourceList sources={data.sources} t={tp} />
                  </div>
                </details>
              )}
            </>
          ) : (
            <>
              <div className="space-y-2">
                <h2 className="headline text-2xl text-fg-primary">{t("worldTitle")}</h2>
                <p className="text-sm text-fg-secondary">{t("worldIntro")}</p>
              </div>
              <ul className="divide-y divide-default rounded-surface border border-default bg-surface-base">
                {held.map((p) => (
                  <li key={p.key}>
                    <button
                      type="button"
                      onClick={() => openCountry(p)}
                      className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left hover:bg-surface-raised"
                    >
                      <span className="font-medium text-fg-primary">{p.name}</span>
                      <span className="text-sm text-fg-tertiary">
                        {t("lawCount", { count: p.acts })}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>
      </div>

      {tray.length > 0 && (
        <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-surface border border-default bg-surface-overlay p-3">
          <p className="min-w-0 flex-1 text-sm text-fg-primary">
            {tm("trayLabel", { places: tray.map((p) => p.name).join(" · ") })}
          </p>
          <button type="button" onClick={() => setTray([])} className="btn-secondary min-h-11">
            {tm("trayClear")}
          </button>
          <Link href={compareHref(tray.map((p) => p.slugPath))} className="btn-primary min-h-11">
            {tm("trayCompare", { count: tray.length })}
          </Link>
        </div>
      )}
    </div>
  );
}

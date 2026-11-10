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
import {
  WORLD,
  regionFeature,
  regionName,
  worldRegionByCode,
  type WorldRegion,
} from "@/lib/config/world";
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
import AtlasCanvas, { ATLAS_LIMITS, type PlaceName } from "./atlas-canvas";
import { COUNTRIES } from "@/lib/config/world/countries";
import {
  BEYOND_UN,
  PLACE_KINDS,
  SELF_GOVERNING_POINTS,
  kindOf,
  type PlaceKind,
} from "@/lib/config/world/kinds";
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
/** A country with this many places or fewer lists them all, open; a larger one keeps the list closed. */
const PLACE_LIST_OPEN = 30;
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
  /**
   * In full mode, what a country's places show: `places` (/places) draws them
   * plainly, a tap opening the place's page; `tax` (/places/tax) colours them
   * by what tax would cost the reader, with the form that drives it.
   */
  layer?: "places" | "tax";
}

/**
 * The atlas (one for all of Solon): the Earth, every place whose law Solon
 * holds shaded by how much, and, inside a country, its places, coloured by
 * what tax would cost the reader there. Beside it, what Solon holds for the
 * place in view: its law, its places, its tax. Estimates run in the browser;
 * an income never leaves it.
 */
export default function Atlas({ mode, initial = null, layer = "places" }: AtlasProps) {
  const t = useTranslations("Atlas");
  const tg = useTranslations("Law.globe");
  const tm = useTranslations("Places.map");
  const tc = useTranslations("Places.compare");
  const tp = useTranslations("Places");
  const locale = useLocale();
  const router = useRouter();
  const colours = useMapColours();
  // What the world view shows: every place, or only those beyond the UN's member states.
  const [show, setShow] = useState<"all" | "beyond">("all");
  const beyond = mode === "full" && layer === "places" && show === "beyond";
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
  // Every country and territory drawn on the globe, so one Solon holds nothing for still opens its page.
  const regionByFeature = useMemo(
    () =>
      new Map(
        WORLD.flatMap((r) => {
          const feature = regionFeature(r);
          return feature ? [[feature, r] as const] : [];
        }),
      ),
    [],
  );
  /** The page of a country Solon holds, by its law place: its pack's path, else its world slug. */
  const pageOf = useCallback((place: GlobePlace | null) => {
    if (!place) return null;
    if (place.pack) return `/places/${place.pack}`;
    const region = place.region ? worldRegionByCode(place.region) : undefined;
    return region ? `/places/${region.slug}` : null;
  }, []);

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
    // Once a country's own places are drawn they are its shape: its coarse outline from the world file
    // (Natural Earth, a few dozen points for Liechtenstein) is left out, or it shows through as a
    // second, mismatched border over the places.
    const outer = country?.feature;
    return [
      ...base.filter((f) => f.id !== outer),
      ...drawn.features.features.map((f) => ({
        id: SUB + f.properties.code,
        geometry: f.geometry,
        properties: {},
        layer: 3,
      })),
    ];
  }, [world, drawn, admin1, openA2, country?.feature]);

  const fills = useMemo(() => {
    const out = new Map<string, string>();
    if (!colours) return out;
    if (open) {
      if (layer === "tax") {
        for (const [code, fill] of tax.fills) out.set(SUB + code, fill);
      } else {
        for (const place of data?.places ?? []) out.set(SUB + place.feature, colours.scale[1]!);
      }
      return out;
    }
    if (beyond) {
      // Only the places beyond the UN's member states, in one shade: their kind is said in the list.
      for (const [feature, region] of regionByFeature) {
        if (BEYOND_UN.has(kindOf(region))) out.set(feature, colours.scale.at(-1)!);
      }
      return out;
    }
    for (const p of named) if (p.acts > 0) out.set(p.feature, shadeOf(p.acts, colours.scale));
    // A subdivision is drawn over its country, so it wears the country's shade.
    for (const [a2, features] of admin1) {
      const fill = out.get(featureOfA2.get(a2) ?? "");
      if (fill) for (const f of features) out.set(f.id, fill);
    }
    return out;
  }, [colours, open, layer, tax.fills, data, named, admin1, featureOfA2, beyond, regionByFeature]);

  // A dot on each country Solon holds law for, so the small ones can be found; none inside a country.
  const dots = useMemo(() => {
    if (open) return new Map<string, [number, number]>();
    if (beyond) {
      // A dot where a place beyond the UN has no outline to fill: a proclaimed state, a special
      // jurisdiction, a place that governs itself the world's outlines do not draw.
      return new Map(
        WORLD.flatMap((r) => {
          const point = r.point ?? (regionFeature(r) ? undefined : SELF_GOVERNING_POINTS[r.slug]);
          return point && BEYOND_UN.has(kindOf(r)) ? [[`beyond:${r.slug}`, point] as const] : [];
        }),
      );
    }
    return new Map(
      named.flatMap((p) => {
        const shape = worldById.get(p.feature);
        return p.acts > 0 && shape
          ? [[p.feature, geoCentroid(shape.geometry as never) as [number, number]] as const]
          : [];
      }),
    );
  }, [open, named, worldById, beyond]);

  const regionNames = useMemo(() => new Intl.DisplayNames([locale], { type: "region" }), [locale]);
  const countryName = (a2: string | undefined): string => {
    if (!a2) return "";
    try {
      return regionNames.of(a2) ?? a2;
    } catch {
      return a2;
    }
  };

  // The names of a country's places, written on the map wherever one fits inside its shape.
  const placeNames = useMemo(() => {
    const out = new Map<string, PlaceName>();
    if (!open || !drawn || !data) return out;
    for (const place of data.places) {
      const area = drawn.areas.get(place.feature);
      if (!area) continue;
      out.set(SUB + place.feature, {
        text: place.name,
        point: geoCentroid(area.geometry as never) as [number, number],
        bounds: area.bounds,
      });
    }
    return out;
  }, [open, drawn, data]);

  const placeByFeature = useMemo(
    () => new Map((data?.places ?? []).map((p) => [p.feature, p])),
    [data],
  );
  const describe = (id: string): string => {
    if (id.startsWith(SUB)) {
      const code = id.slice(SUB.length);
      return layer === "tax"
        ? tax.describe(code, tm("notYet"))
        : (placeByFeature.get(code)?.name ?? "");
    }
    if (id.startsWith(ADMIN1)) {
      const region = regionByCode.get(id.slice(ADMIN1.length));
      if (!region) return "";
      const place = byFeature.get(featureOfA2.get(region.a2) ?? "");
      const name = `${region.names[locale] ?? region.name}, ${countryName(region.a2)}`;
      return place && place.acts > 0 ? tg("held", { name, count: place.acts }) : name;
    }
    const place = byFeature.get(id);
    if (place && place.acts > 0) return tg("held", { name: place.name, count: place.acts });
    const region = regionByFeature.get(id);
    return region ? regionName(region, locale) : (place?.name ?? countryName(a2OfFeature.get(id)));
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
    // A subdivision answers for its country.
    const countryFeature = id.startsWith(ADMIN1)
      ? (featureOfA2.get(regionByCode.get(id.slice(ADMIN1.length))?.a2 ?? "") ?? "")
      : id;
    const place = byFeature.get(countryFeature);
    if (place && (place.acts > 0 || place.pack)) {
      if (place.key !== open) openCountry(place);
      return;
    }
    // A country Solon holds nothing for yet: its own page says so, and can be shared.
    const region = regionByFeature.get(countryFeature);
    if (region) router.push(`/places/${region.slug}`);
    // Outside every list, it is still named and outlined, so a tap always answers.
    else setSelected(id);
  };

  const onSelectLabel = (id: string) => {
    if (!labelData || !cam) return;
    const [kind, key] = [id.slice(0, 2), id.slice(2)];
    const r = cam.radius;
    if (kind === "c:") {
      const feature = featureOfA2.get(key);
      if (feature) onSelect(feature);
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
      names={placeNames}
      nameColour={tokens.text}
      nameHalo={tokens.page}
      selected={selected ?? (drawn ? null : (country?.feature ?? null))}
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

  const beyondPlaces = new Map<PlaceKind, typeof WORLD>();
  for (const r of WORLD) {
    const kind = kindOf(r);
    if (BEYOND_UN.has(kind)) beyondPlaces.set(kind, [...(beyondPlaces.get(kind) ?? []), r]);
  }
  for (const list of beyondPlaces.values()) {
    (list as WorldRegion[]).sort((a, b) =>
      regionName(a, locale).localeCompare(regionName(b, locale), locale),
    );
  }
  const held = named
    .filter((p) => (layer === "tax" ? p.drawn : p.acts > 0 || p.pack))
    .sort((a, b) => b.acts - a.acts);
  const countryPage = pageOf(country);
  const selectedPlace = selected ? placeByFeature.get(selected.slice(SUB.length)) : undefined;
  const pageLink = country && countryPage && (
    <Link href={countryPage} className="btn-primary min-h-11 w-full justify-center">
      {t("pageOpen", { country: country.name })}
    </Link>
  );
  const sourceList = data && data.sources.length > 0 && (
    <details className="rounded-surface border border-default bg-surface-base p-5 text-sm">
      <summary className="cursor-pointer font-semibold text-fg-primary">
        {t("sources", { count: data.sources.length })}
      </summary>
      <div className="mt-4">
        <SourceList sources={data.sources} t={tp} />
      </div>
    </details>
  );

  const head = country ? (
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

      {layer === "places" && (
        <>
          {pageLink}
          <section className="space-y-2 rounded-surface border border-default bg-surface-base p-5">
            <h3 className="font-semibold text-fg-primary">{t("lawTitle")}</h3>
            {country.acts === 0 ? (
              <p className="text-sm text-fg-secondary">{t("lawNone", { country: country.name })}</p>
            ) : country.below > 0 ? (
              // The nation's count is the one its Law page shows; what lies below it is said apart.
              <>
                <p className="text-sm text-fg-secondary">
                  {t("lawNation", { count: country.own })}
                </p>
                <p className="text-sm text-fg-secondary">
                  {t("lawBelow", { count: country.below })}
                </p>
              </>
            ) : (
              <p className="text-sm text-fg-secondary">{t("lawHeld", { count: country.own })}</p>
            )}
            <Link
              href={`/law/place/${country.key}`}
              className="inline-block text-sm font-semibold text-fg-primary hover:underline"
            >
              {t("lawOpen")} →
            </Link>
          </section>
        </>
      )}
    </>
  ) : (
    <>
      <div className="space-y-2">
        <h2 className="headline text-2xl text-fg-primary">
          {layer === "tax" ? t("taxWorldTitle") : t("worldTitle")}
        </h2>
        <p className="text-sm text-fg-secondary">
          {layer === "tax" ? t("taxWorldIntro") : beyond ? t("beyondIntro") : t("worldIntro")}
        </p>
      </div>
      {layer === "places" && (
        <div
          role="group"
          aria-label={t("showLabel")}
          className="inline-flex rounded-control border border-default p-1"
        >
          {(["all", "beyond"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={show === v}
              onClick={() => setShow(v)}
              className={`min-h-10 rounded-control px-4 text-sm font-semibold ${
                show === v ? "bg-accent text-on-accent" : "text-fg-primary hover:bg-surface-raised"
              }`}
            >
              {v === "all" ? t("showAll") : t("showBeyond")}
            </button>
          ))}
        </div>
      )}
    </>
  );

  const rest = country ? (
    <>
      {layer === "places" ? (
        <>
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
              {drawn && data?.taxPack && (
                <Link
                  href={`/places/tax?in=${country.key}`}
                  className="inline-block text-sm font-semibold text-fg-primary hover:underline"
                >
                  {t("taxOpen", { country: country.name })} →
                </Link>
              )}
            </section>
          )}
          {drawn && data && data.places.length > 0 && (
            <details
              open={data.places.length <= PLACE_LIST_OPEN}
              className="rounded-surface border border-default bg-surface-base text-sm"
            >
              <summary className="min-h-11 cursor-pointer px-5 py-3 font-semibold text-fg-primary">
                {t("placesList", { count: data.places.length })}
              </summary>
              <ul className="divide-y divide-default border-t border-default">
                {[...data.places]
                  .sort((a, b) => a.name.localeCompare(b.name, locale))
                  .map((place) => (
                    <li key={place.slugPath}>
                      <Link
                        href={`/places/${place.slugPath}`}
                        className="flex min-h-11 items-center px-5 py-3 text-fg-primary hover:bg-surface-raised"
                      >
                        {place.name}
                      </Link>
                    </li>
                  ))}
              </ul>
            </details>
          )}
        </>
      ) : (
        <>
          {loading && <p className="text-sm text-fg-secondary">{tm("loading")}</p>}
          {!loading && !(drawn && tax.taxPack) && (
            <p className="text-sm text-fg-secondary">{t("taxNone", { country: country.name })}</p>
          )}
          {drawn && tax.taxPack && tax.input && (
            <TaxSituation
              pack={tax.taxPack}
              input={tax.input}
              onChange={(patch) => tax.updateInput(tax.taxPack!.key, patch)}
              title={tc("yourSituation")}
              idPrefix="atlas"
              layout="narrow"
            />
          )}
          {drawn && tax.money && tax.totals.length > 0 && tax.totals[0] === tax.totals.at(-1) ? (
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
          {pageLink}
        </>
      )}
      {sourceList}
    </>
  ) : beyond ? (
    <>
      {PLACE_KINDS.filter((k) => BEYOND_UN.has(k)).map((kind) => {
        const list = beyondPlaces.get(kind) ?? [];
        return list.length === 0 ? null : (
          <section key={kind} className="space-y-2">
            <h3 className="text-sm font-semibold text-fg-secondary">
              {tp(`profile.kicker.${kind}`)} · {list.length}
            </h3>
            <ul className="divide-y divide-default rounded-surface border border-default bg-surface-base">
              {list.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={`/places/${r.slug}`}
                    className="flex min-h-11 items-center justify-between gap-3 px-5 py-2 text-fg-primary hover:bg-surface-raised"
                  >
                    <span>{regionName(r, locale)}</span>
                    <span aria-hidden className="text-fg-tertiary">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </>
  ) : (
    <>
      <ul className="divide-y divide-default rounded-surface border border-default bg-surface-base">
        {held.map((p) => (
          <li key={p.key}>
            <button
              type="button"
              onClick={() => openCountry(p)}
              className="flex min-h-11 w-full items-center justify-between gap-3 px-5 py-3 text-left hover:bg-surface-raised"
            >
              <span className="font-medium text-fg-primary">{p.name}</span>
              <span className="text-sm text-fg-tertiary">{t("lawCount", { count: p.acts })}</span>
            </button>
          </li>
        ))}
      </ul>
      {layer === "places" && (
        <Link
          href="/places/world"
          className="inline-block text-sm font-semibold text-fg-primary hover:underline"
        >
          {t("everyCountry")} →
        </Link>
      )}
    </>
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="space-y-6 lg:col-start-2 lg:row-start-1" aria-live="polite">
          {head}
        </div>
        <div className="space-y-3 lg:col-start-1 lg:row-span-2 lg:row-start-1">
          {drawn && data && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <MapSearch data={data} onPlace={showPlace} onAddress={showAddress} />
              </div>
              {layer === "tax" && (
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
              )}
            </div>
          )}
          {notice && (
            <p role="status" className="text-sm text-fg-secondary">
              {notice}
            </p>
          )}
          {layer === "tax" && view === "list" && drawn && data ? (
            <MapList rows={tax.rows} levelName={data.levelName} onShow={showPlace} />
          ) : (
            <div className="relative h-[60vh] min-h-80 overflow-hidden rounded-surface border border-default bg-surface-raised">
              {canvas}
              {layer === "tax" && selectedRow && (
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
              {layer === "places" && selectedPlace && (
                <div className="absolute inset-x-3 bottom-3 sm:right-auto sm:w-80">
                  <section
                    aria-labelledby="atlas-place-title"
                    className="space-y-3 rounded-surface border border-default bg-surface-overlay p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 id="atlas-place-title" className="font-semibold text-fg-primary">
                          {selectedPlace.name}
                        </h2>
                        {selectedPlace.parentName && (
                          <p className="text-sm text-fg-tertiary">{selectedPlace.parentName}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelected(null)}
                        aria-label={tm("close")}
                        className="-m-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-control text-fg-secondary hover:bg-surface-raised"
                      >
                        <span aria-hidden>×</span>
                      </button>
                    </div>
                    <Link
                      href={`/places/${selectedPlace.slugPath}`}
                      className="btn-primary min-h-11"
                    >
                      {tm("open")}
                    </Link>
                  </section>
                </div>
              )}
            </div>
          )}
          <p className="text-xs text-fg-tertiary">{tg("credit")}</p>
        </div>

        <div className="space-y-6 lg:col-start-2 lg:row-start-2" aria-live="polite">
          {rest}
        </div>
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

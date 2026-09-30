"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import { loadGeographyManifest, loadGeographyResources } from "@bitbaum/geo-kit";
import { feature as topologyFeatures } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import type { FeatureCollection, Geometry } from "geojson";
import { Link } from "@/i18n/navigation";
import { REGISTER_POLICY_DEFAULTS } from "@/lib/config/places/policies";
import { compareHref, formatMoney, parseAmount } from "@/lib/places/compare-view";
import type { AddressHit } from "@/lib/places/address-search";
import {
  areaBounds,
  areaHolds,
  classColour,
  classOf,
  estimatePlace,
  quantileBreaks,
  type AreaGeometry,
  type MapData,
  type MapPlace,
} from "@/lib/places/map-view";
import { useDeviceInputs } from "./device-inputs";
import { useMapColours } from "./map-colours";
import MapCard from "./map-card";
import MapLegend from "./map-legend";
import MapList, { type MapRow } from "./map-list";
import MapSearch from "./map-search";
import SourceList from "./source-list";
import TaxSituation from "./tax-situation";

type Bounds = [number, number, number, number];
type Features = FeatureCollection<Geometry, { code: string }>;

interface Drawn {
  features: Features;
  bounds: Bounds;
  /** Each feature's geometry and bounds, to find which place holds an address. */
  areas: Map<string, { geometry: AreaGeometry; bounds: Bounds }>;
}

const MapCanvas = dynamic(() => import("./map-canvas"), { ssr: false });

const WIDE = "(min-width: 48rem)";
/** Roughly a street's width around an address, so the map zooms to it rather than the whole place. */
const ADDRESS_SPAN = 0.004;

function useWide(): boolean {
  return useSyncExternalStore(
    (listener) => {
      const query = window.matchMedia(WIDE);
      query.addEventListener("change", listener);
      return () => query.removeEventListener("change", listener);
    },
    () => window.matchMedia(WIDE).matches,
    () => true,
  );
}

/** The boundary file, verified against the manifest by geo-kit, as GeoJSON features. */
async function loadDrawn(data: MapData, signal: AbortSignal): Promise<Drawn> {
  const baseUrl = window.location.origin;
  // The manifest is revalidated, so a cached one cannot predate the edition the map data names.
  const manifest = await loadGeographyManifest(data.resource.manifest, {
    baseUrl,
    signal,
    fetcher: (input, init) => fetch(input, { ...init, cache: "no-cache" }),
  });
  const [loaded] = await loadGeographyResources(
    manifest,
    { resourceIds: [data.resource.id], asOf: data.on },
    { baseUrl, signal },
  );
  if (
    !loaded ||
    loaded.resource.sha256 !== data.resource.sha256 ||
    loaded.data.type !== "Topology"
  ) {
    throw new Error("boundary file does not match the map data");
  }
  const topology = loaded.data as unknown as Topology;
  const object = topology.objects[data.levelKey] ?? Object.values(topology.objects)[0];
  if (!object) {
    throw new Error("boundary file has no objects");
  }
  const collection = topologyFeatures(topology, object as GeometryCollection);
  const areas = new Map<string, { geometry: AreaGeometry; bounds: Bounds }>();
  const features: Features = {
    type: "FeatureCollection",
    features: collection.features.flatMap((f) => {
      const geometry = f.geometry as AreaGeometry | null;
      if (f.id === undefined || !geometry) {
        return [];
      }
      const code = String(f.id);
      areas.set(code, { geometry, bounds: areaBounds(geometry) });
      return [{ type: "Feature" as const, id: code, properties: { code }, geometry: f.geometry }];
    }),
  };
  const all = [...areas.values()].map((a) => a.bounds);
  const bounds: Bounds = [
    Math.min(...all.map((b) => b[0])),
    Math.min(...all.map((b) => b[1])),
    Math.max(...all.map((b) => b[2])),
    Math.max(...all.map((b) => b[3])),
  ];
  return { features, bounds, areas };
}

/**
 * The map on /places (design §9.1): every place of a level, coloured by what
 * tax would cost the reader there, with a list that says the same in order.
 * Estimates run in the browser; the income never leaves it.
 */
export default function PlacesMap({ packKey }: { packKey: string }) {
  const t = useTranslations("Places.map");
  const tc = useTranslations("Places.compare");
  const tp = useTranslations("Places");
  const locale = useLocale();
  const wide = useWide();
  const colours = useMapColours();

  const [data, setData] = useState<MapData | "error" | null>(null);
  const [drawn, setDrawn] = useState<Drawn | "error" | null>(null);
  const [chosenView, setChosenView] = useState<"map" | "list" | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ bounds: Bounds; key: number } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [tray, setTray] = useState<MapPlace[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ pack: packKey, locale });
    fetch(`/api/v1/places/map?${query}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`map data: ${response.status}`);
        }
        return response.json() as Promise<MapData>;
      })
      .then(async (loaded) => {
        setData(loaded);
        setDrawn(await loadDrawn(loaded, controller.signal));
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setData((current) => current ?? "error");
          setDrawn("error");
        }
      });
    return () => controller.abort();
  }, [packKey, locale]);

  const ready = data !== null && data !== "error" ? data : null;
  const packs = useMemo(() => (ready?.taxPack ? [ready.taxPack] : []), [ready]);
  const [inputs, updateInput] = useDeviceInputs(packs);
  const taxPack = ready?.taxPack ?? null;
  const input = taxPack ? inputs[taxPack.key] : undefined;

  const entered = input ? parseAmount(input.amount) : null;
  const example = entered === null && taxPack?.exampleBase != null;
  const estimateInput = useMemo(
    () => ({
      base: entered ?? taxPack?.exampleBase ?? null,
      variant: input?.variant ?? "",
      conditions: input?.conditions ?? {},
    }),
    [entered, taxPack, input],
  );
  const deferredInput = useDeferredValue(estimateInput);

  const rows: MapRow[] = useMemo(
    () =>
      ready
        ? ready.places.map((place) => ({
            place,
            estimate: estimatePlace(ready, place, deferredInput),
          }))
        : [],
    [ready, deferredInput],
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
    if (!colours) {
      return fill;
    }
    for (const row of rows) {
      if (row.estimate.kind === "estimate") {
        const k = classOf(row.estimate.estimate.total, breaks);
        fill.set(row.place.feature, classColour(k, breaks.length + 1, colours.scale));
      }
    }
    return fill;
  }, [rows, breaks, colours]);

  const money = taxPack ? { currency: taxPack.currency, formatLocale: taxPack.formatLocale } : null;
  const describe = useCallback(
    (code: string) => {
      const row = byFeature.get(code);
      if (!row) {
        return "";
      }
      return row.estimate.kind === "estimate"
        ? `${row.place.name}: ${formatMoney(row.estimate.estimate.total, row.estimate)}`
        : `${row.place.name}: ${t("notYet")}`;
    },
    [byFeature, t],
  );

  const view = drawn === "error" ? "list" : (chosenView ?? (wide ? "map" : "list"));
  const drawnReady = drawn !== null && drawn !== "error" ? drawn : null;

  const show = (feature: string, bounds: Bounds | undefined) => {
    setNotice(null);
    setSelected(feature);
    if (bounds) {
      setFocus((current) => ({ bounds, key: (current?.key ?? 0) + 1 }));
    }
    if (drawnReady) {
      setChosenView("map");
    }
  };
  const showPlace = (place: MapPlace) =>
    show(place.feature, drawnReady?.areas.get(place.feature)?.bounds);
  const showAddress = (hit: AddressHit) => {
    const [x, y] = hit.position;
    const holder = [...(drawnReady?.areas ?? [])].find(
      ([code, area]) =>
        byFeature.has(code) &&
        x >= area.bounds[0] &&
        x <= area.bounds[2] &&
        y >= area.bounds[1] &&
        y <= area.bounds[3] &&
        areaHolds(area.geometry, hit.position),
    );
    if (!holder) {
      setNotice(t("addressOutside", { address: hit.label }));
      return;
    }
    show(holder[0], [x - ADDRESS_SPAN, y - ADDRESS_SPAN, x + ADDRESS_SPAN, y + ADDRESS_SPAN]);
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

  if (data === "error") {
    return (
      <p className="rounded-surface border border-default p-5 text-fg-secondary">
        {t("loadError")}
      </p>
    );
  }
  if (!ready) {
    return (
      <div
        role="status"
        className="flex h-[65vh] min-h-80 items-center justify-center rounded-surface border border-default bg-surface-raised text-fg-secondary"
      >
        {t("loading")}
      </div>
    );
  }

  const selectedRow = selected ? byFeature.get(selected) : undefined;
  const selectedTotal =
    selectedRow?.estimate.kind === "estimate" ? selectedRow.estimate.estimate.total : null;
  const rank =
    selectedTotal === null
      ? null
      : {
          rank: totals.filter((total) => total < selectedTotal - 0.5).length + 1,
          count: totals.length,
        };
  const year = ready.period.slice(0, 4);
  const caption = example
    ? t("legendExample", { amount: formatMoney(taxPack!.exampleBase!, money!), year })
    : ready.earlierYear
      ? t("legendEarlier", { year })
      : t("legend", { year });

  return (
    <div className="space-y-6">
      <MapSearch data={ready} onPlace={showPlace} onAddress={showAddress} />
      {notice && (
        <p role="status" className="text-sm text-fg-secondary">
          {notice}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-3">
          {drawn !== "error" && (
            <div
              role="group"
              aria-label={t("viewLabel")}
              className="inline-flex rounded-control border border-default p-1"
            >
              {(["map", "list"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={view === v}
                  onClick={() => setChosenView(v)}
                  className={`min-h-10 rounded-control px-4 text-sm font-semibold ${
                    view === v
                      ? "bg-accent text-on-accent"
                      : "text-fg-primary hover:bg-surface-raised"
                  }`}
                >
                  {v === "map" ? t("viewMap") : t("viewList")}
                </button>
              ))}
            </div>
          )}
          {drawn === "error" && <p className="text-sm text-fg-secondary">{t("mapUnavailable")}</p>}

          {view === "map" ? (
            <div className="relative h-[65vh] min-h-80 overflow-hidden rounded-surface border border-default bg-surface-raised">
              {drawnReady && colours ? (
                <MapCanvas
                  features={drawnReady.features}
                  fills={fills}
                  colours={colours}
                  bounds={drawnReady.bounds}
                  selected={selected}
                  focus={focus}
                  onSelect={(code) => {
                    setNotice(null);
                    setSelected(code);
                  }}
                  describe={describe}
                  label={t("mapLabel", { level: ready.levelName })}
                  onError={() => setDrawn("error")}
                />
              ) : (
                <div
                  role="status"
                  className="flex h-full items-center justify-center text-fg-secondary"
                >
                  {t("loading")}
                </div>
              )}
              {selectedRow && (
                <div className="absolute inset-x-3 bottom-3 sm:right-auto sm:w-80">
                  <MapCard
                    place={selectedRow.place}
                    estimate={selectedRow.estimate}
                    taxPack={taxPack}
                    rank={rank}
                    aboveCheapest={
                      selectedTotal === null || totals.length === 0
                        ? null
                        : selectedTotal - totals[0]!
                    }
                    example={example}
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
          ) : (
            <MapList rows={rows} levelName={ready.levelName} onShow={showPlace} />
          )}
        </div>

        <aside className="order-first space-y-6 lg:order-none">
          {taxPack && input && (
            <TaxSituation
              pack={taxPack}
              input={input}
              onChange={(patch) => updateInput(taxPack.key, patch)}
              title={tc("yourSituation")}
              idPrefix="map"
              layout="narrow"
            />
          )}
          {taxPack && colours && money && totals.length > 0 && (
            <MapLegend
              breaks={breaks}
              range={[totals[0]!, totals.at(-1)!]}
              colours={colours}
              money={money}
              caption={caption}
            />
          )}
          {taxPack && (
            <p className="text-xs text-fg-tertiary">
              {taxPack.excludes} {tc("disclaimer")}
            </p>
          )}
          <p className="text-xs text-fg-tertiary">{tc("privacy")}</p>
        </aside>
      </div>

      {tray.length > 0 && (
        <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-surface border border-default bg-surface-overlay p-3">
          <p className="min-w-0 flex-1 text-sm text-fg-primary">
            {t("trayLabel", { places: tray.map((p) => p.name).join(" · ") })}
          </p>
          <button type="button" onClick={() => setTray([])} className="btn-secondary min-h-11">
            {t("trayClear")}
          </button>
          <Link href={compareHref(tray.map((p) => p.slugPath))} className="btn-primary min-h-11">
            {t("trayCompare", { count: tray.length })}
          </Link>
        </div>
      )}

      <SourceList sources={ready.sources} t={tp} />
    </div>
  );
}

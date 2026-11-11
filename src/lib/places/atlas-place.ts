/**
 * One place as the map needs it (design: docs/design/2026-11-place-navigation.md,
 * "Map behaviour"): the place, what it is part of, its own outline when one is
 * drawn, and the places directly inside it, each with its outline when it has
 * one. Keyed by the place, so a map can select it, frame its own area and draw
 * its children without knowing which pack, level or law authority it belongs to.
 *
 * `view` is pure; `loadAtlasPlace` reads what it needs. Counts of law and
 * statistics are not here: they come from their own modules so that every
 * surface shows the same number.
 */
import { and, eq, inArray } from "drizzle-orm";
import type { CountryPack, PlacesConfig } from "@/lib/config/places/schema";
import type { Database } from "@/lib/db/client";
import { areaAssertions, areas } from "@/lib/db/places-schema";
import { loadChain, loadRefinements, type ChainPlace } from "./chain";
import { geographyFileHref, parseGeometryRef } from "./geography";
import { drawnOn } from "./map-data";
import { findPlace, type Located } from "./paths";
import { displayName, localized } from "./place-view";

/** Where a place's outline is: a feature in a boundary file, which the browser verifies by its hash. */
export interface AreaRef {
  file: string;
  feature: string;
}

export interface AtlasLink {
  path: string;
  name: string;
  levelName: string;
}

export interface AtlasChild {
  path: string;
  name: string;
  area: AreaRef | null;
}

export interface AtlasChildren {
  levelKey: string;
  levelName: string;
  places: AtlasChild[];
}

export interface AtlasPlace {
  on: string;
  place: AtlasLink & { pack: string; packName: string; area: AreaRef | null };
  /** What it is part of, the widest first. */
  chain: AtlasLink[];
  children: AtlasChildren[];
  /** How many of the places inside it have an outline, of how many it has. */
  drawn: { children: number; total: number };
}

export interface AtlasInput {
  config: Pick<PlacesConfig, "packs">;
  on: string;
  locale: string;
  chain: readonly ChainPlace[];
  parts: readonly ChainPlace[];
  /** Outline references by place id. */
  areas: ReadonlyMap<string, AreaRef>;
}

const asRef = (geometryRef: string): AreaRef | null => {
  const ref = parseGeometryRef(geometryRef);
  return ref ? { file: geographyFileHref(ref.resourceId), feature: ref.featureId } : null;
};

export function view(input: AtlasInput): AtlasPlace | null {
  const { chain, locale } = input;
  const self = chain.find((p) => p.depth === 0);
  const pack: CountryPack | undefined = input.config.packs.find((p) => p.key === self?.countryPack);
  if (!self || !pack || !self.slugPath) {
    return null;
  }
  const levelName = (key: string | null) => {
    const level = pack.levels.find((l) => l.key === key);
    return level ? localized(level.names, locale) : (key ?? "");
  };
  const link = (p: ChainPlace): AtlasLink => ({
    path: `/places/${p.slugPath}`,
    name: displayName(p.names, locale, pack.defaultLocales),
    levelName: levelName(p.levelKey),
  });
  const children = pack.levels.flatMap((level) => {
    const places = input.parts
      .filter((p) => p.levelKey === level.key && p.slugPath)
      .map((p) => ({
        path: `/places/${p.slugPath}`,
        name: displayName(p.names, locale, pack.defaultLocales),
        area: input.areas.get(p.id) ?? null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, locale));
    return places.length > 0
      ? [{ levelKey: level.key, levelName: levelName(level.key), places }]
      : [];
  });
  const all = children.flatMap((c) => c.places);
  return {
    on: input.on,
    place: {
      ...link(self),
      pack: pack.key,
      packName: localized(pack.names, locale),
      area: input.areas.get(self.id) ?? null,
    },
    chain: chain
      .filter((p) => p.depth !== null && p.depth > 0 && p.slugPath)
      .sort((a, b) => b.depth! - a.depth!)
      .map(link),
    children,
    drawn: { children: all.filter((c) => c.area).length, total: all.length },
  };
}

export async function loadAtlasPlace(
  db: Database,
  config: PlacesConfig,
  slugPath: string,
  on: string,
  locale: string,
): Promise<(AtlasPlace & Located) | null> {
  const place = await findPlace(db, config, slugPath);
  const pack = config.packs.find((p) => p.key === place?.countryPack);
  if (!place || !pack) {
    return null;
  }
  const chain = await loadChain(db, place.id, on);
  const parts = (
    await loadRefinements(
      db,
      [place.id],
      pack.levels.map((l) => l.key),
      on,
    )
  ).map((r) => r.place);
  const rows = await db
    .select({ id: areaAssertions.jurisdictionId, geometryRef: areas.geometryRef })
    .from(areas)
    .innerJoin(areaAssertions, eq(areaAssertions.areaId, areas.id))
    .where(
      and(
        drawnOn(on),
        inArray(areaAssertions.jurisdictionId, [place.id, ...parts.map((p) => p.id)]),
      ),
    );
  const refs = new Map(
    rows.flatMap((r) => {
      const ref = asRef(r.geometryRef);
      return ref ? [[r.id, ref] as const] : [];
    }),
  );
  const atlas = view({ config, on, locale, chain, parts, areas: refs });
  return atlas && { ...atlas, canonicalPath: place.canonicalPath };
}

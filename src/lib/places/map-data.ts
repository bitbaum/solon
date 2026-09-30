/**
 * The database side of the map on /places (design §9.1): every place a current
 * area is drawn for at one level of a pack, its chain, and the facts its pack's
 * tax model reads, loaded at once rather than place by place (a country's
 * communes are thousands). `map-view.ts` is what the browser does with it.
 */
import { and, eq, gt, inArray, isNull, lte, or, sql } from "drizzle-orm";
import type { CountryPack, PlacesConfig } from "@/lib/config/places/schema";
import type { Database } from "@/lib/db/client";
import {
  areaAssertions,
  areas,
  jurisdictionNames,
  jurisdictionRelations,
  jurisdictions,
} from "@/lib/db/places-schema";
import { evaluate, type Fact, type TaxModel } from "@/lib/tax-model";
import { loadFacts, type ChainFact, type ChainName } from "./chain";
import { taxPackView, yearsBefore } from "./compare";
import { geographyFileHref, parseGeometryRef } from "./geography";
import type { MapData, MapPlace } from "./map-view";
import { loadRetrievals } from "./place-page";
import { displayName, localized, placeSources } from "./place-view";

/** How many fiscal years back the map looks for figures not yet published for this one (as /compare). */
const YEARS_BACK = 2;
const MAX_DEPTH = 32;

/** Where each drawn place of the pack is, on `on`: its feature in a boundary file. */
async function drawnPlaces(db: Database, pack: CountryPack, on: string) {
  const rows = await db
    .select({
      geometryRef: areas.geometryRef,
      sourceId: areas.sourceId,
      id: jurisdictions.id,
      levelKey: jurisdictions.levelKey,
      slugPath: jurisdictions.slugPath,
    })
    .from(areas)
    .innerJoin(areaAssertions, eq(areaAssertions.areaId, areas.id))
    .innerJoin(jurisdictions, eq(jurisdictions.id, areaAssertions.jurisdictionId))
    .where(
      and(
        eq(jurisdictions.countryPack, pack.key),
        eq(areaAssertions.assertion, "administers"),
        isNull(areas.supersededAt),
        isNull(areaAssertions.supersededAt),
        or(isNull(areas.validFrom), lte(areas.validFrom, on)),
        or(isNull(areas.validTo), gt(areas.validTo, on)),
        or(isNull(areaAssertions.validFrom), lte(areaAssertions.validFrom, on)),
        or(isNull(areaAssertions.validTo), gt(areaAssertions.validTo, on)),
      ),
    );
  return rows.flatMap((row) => {
    const ref = parseGeometryRef(row.geometryRef);
    return ref && row.levelKey && row.slugPath
      ? [{ ...row, levelKey: row.levelKey, slugPath: row.slugPath, ref }]
      : [];
  });
}

/** Each start's `part_of` ancestors on `on`, depth 1 upwards, and the places overlapping any of them. */
async function loadChains(db: Database, starts: readonly string[], on: string) {
  const ancestry = await db.execute<{ start: string; id: string; depth: number }>(sql`
    WITH RECURSIVE chain(start, id, depth) AS (
      SELECT value, value, 0 FROM json_array_elements_text(${JSON.stringify(starts)}::json)
      UNION ALL
      SELECT c.start, r.to_id, c.depth + 1
      FROM ${jurisdictionRelations} r
      JOIN chain c ON r.from_id = c.id
      WHERE r.relation = 'part_of'
        AND r.superseded_at IS NULL
        AND (r.valid_from IS NULL OR r.valid_from <= ${on}::date)
        AND (r.valid_to IS NULL OR r.valid_to > ${on}::date)
        AND c.depth < ${MAX_DEPTH}
    )
    SELECT start, id, min(depth)::int AS depth FROM chain GROUP BY start, id
  `);
  const chains = new Map<string, { id: string; depth: number }[]>();
  for (const row of ancestry.rows) {
    const chain = chains.get(row.start) ?? [];
    chain.push({ id: row.id, depth: Number(row.depth) });
    chains.set(row.start, chain);
  }
  const members = [...new Set(ancestry.rows.map((r) => r.id))];
  const overlaps =
    members.length === 0
      ? []
      : await db
          .select({ from: jurisdictionRelations.fromId, to: jurisdictionRelations.toId })
          .from(jurisdictionRelations)
          .where(
            and(
              inArray(jurisdictionRelations.toId, members),
              eq(jurisdictionRelations.relation, "overlaps"),
              isNull(jurisdictionRelations.supersededAt),
              or(isNull(jurisdictionRelations.validFrom), lte(jurisdictionRelations.validFrom, on)),
              or(isNull(jurisdictionRelations.validTo), gt(jurisdictionRelations.validTo, on)),
            ),
          );
  const overlapping = new Map<string, string[]>();
  for (const { from, to } of overlaps) {
    overlapping.set(to, [...(overlapping.get(to) ?? []), from]);
  }
  /** The place first, then up the hierarchy, then what overlaps any of them. */
  return (start: string): string[] => {
    const chain = (chains.get(start) ?? []).sort((a, b) => a.depth - b.depth).map((p) => p.id);
    return [...new Set([...chain, ...chain.flatMap((id) => overlapping.get(id) ?? [])])];
  };
}

async function loadNames(db: Database, ids: readonly string[], on: string) {
  const rows =
    ids.length === 0
      ? []
      : await db
          .select({
            jurisdictionId: jurisdictionNames.jurisdictionId,
            locale: jurisdictionNames.locale,
            script: jurisdictionNames.script,
            name: jurisdictionNames.name,
            nameType: jurisdictionNames.nameType,
          })
          .from(jurisdictionNames)
          .where(
            and(
              inArray(jurisdictionNames.jurisdictionId, [...ids]),
              isNull(jurisdictionNames.supersededAt),
              or(isNull(jurisdictionNames.validFrom), lte(jurisdictionNames.validFrom, on)),
              or(isNull(jurisdictionNames.validTo), gt(jurisdictionNames.validTo, on)),
            ),
          );
  const names = new Map<string, ChainName[]>();
  for (const { jurisdictionId, ...name } of rows) {
    names.set(jurisdictionId, [...(names.get(jurisdictionId) ?? []), name]);
  }
  return names;
}

/** Each place's facts in the evaluator's terms, at its own level; the newest period wins. */
export function factsByPlace(
  chainFacts: readonly ChainFact[],
  levelOf: ReadonlyMap<string, string>,
): Map<string, Fact[]> {
  const newest = new Map<string, ChainFact>();
  for (const fact of chainFacts) {
    const key = `${fact.jurisdictionId} ${fact.metricKey} ${fact.variant ?? ""}`;
    const seen = newest.get(key);
    if (!seen || seen.validFrom < fact.validFrom) {
      newest.set(key, fact);
    }
  }
  const byPlace = new Map<string, Fact[]>();
  for (const fact of newest.values()) {
    const level = levelOf.get(fact.jurisdictionId);
    if (!level) {
      continue;
    }
    byPlace.set(fact.jurisdictionId, [
      ...(byPlace.get(fact.jurisdictionId) ?? []),
      {
        level,
        metric: fact.metricKey,
        ...(fact.variant === null ? {} : { variant: fact.variant }),
        value: fact.value,
      },
    ]);
  }
  return byPlace;
}

/** Whether every figure the model reads at these levels is recorded, for every variant. */
function published(model: TaxModel, facts: readonly Fact[], levels: ReadonlySet<string>): boolean {
  return model.variants.every((variant) => {
    try {
      return evaluate(model, facts, { values: { [model.base]: 1 }, variant }).missing.every(
        (ref) => !levels.has(ref.level),
      );
    } catch {
      return true;
    }
  });
}

/**
 * The map of a pack's places at the level most of its areas draw (or `level`),
 * on `on`. Null when the pack is unknown or no area is drawn for it.
 */
export async function loadMapData(
  db: Database,
  config: PlacesConfig,
  packKey: string,
  on: string,
  locale: string,
  level?: string,
): Promise<MapData | null> {
  const pack = config.packs.find((p) => p.key === packKey);
  if (!pack) {
    return null;
  }
  const drawn = await drawnPlaces(db, pack, on);
  const perLevel = new Map<string, number>();
  for (const d of drawn) {
    perLevel.set(d.levelKey, (perLevel.get(d.levelKey) ?? 0) + 1);
  }
  const levelKey = level ?? [...perLevel].sort((a, b) => b[1] - a[1])[0]?.[0];
  const atLevel = drawn.filter((d) => d.levelKey === levelKey);
  // One boundary file per level: the one drawing the most of its places.
  const perFile = new Map<string, number>();
  for (const d of atLevel) {
    perFile.set(d.ref.resourceId, (perFile.get(d.ref.resourceId) ?? 0) + 1);
  }
  const sha = [...perFile].sort((a, b) => b[1] - a[1])[0]?.[0];
  const places = atLevel.filter((d) => d.ref.resourceId === sha);
  if (!levelKey || !sha || places.length === 0) {
    return null;
  }

  const chainOf = await loadChains(
    db,
    places.map((p) => p.id),
    on,
  );
  const members = [...new Set(places.flatMap((p) => chainOf(p.id)))];
  const memberRows = await db
    .select({ id: jurisdictions.id, levelKey: jurisdictions.levelKey })
    .from(jurisdictions)
    .where(inArray(jurisdictions.id, members));
  const levelOf = new Map(
    memberRows.flatMap((r) => (r.levelKey ? [[r.id, r.levelKey] as const] : [])),
  );

  // The latest period whose figures are published for the most places: every
  // place is estimated for the same one, never a mix of years.
  const model = pack.taxModel;
  const metrics = model
    ? [
        ...new Set(
          model.components
            .flatMap((c) => [c.tariff, ...(c.multipliers ?? [])])
            .map((r) => r.metric),
        ),
      ]
    : [];
  let period = on;
  let byPlace = new Map<string, Fact[]>();
  let best = -1;
  let sourceIds: string[] = [];
  for (let back = 0; back <= YEARS_BACK && model; back++) {
    const day = yearsBefore(on, back);
    const chainFacts = await loadFacts(db, members, day, metrics);
    const candidate = factsByPlace(chainFacts, levelOf);
    const complete = places.filter((p) => {
      const chain = chainOf(p.id);
      const levels = new Set(chain.flatMap((id) => levelOf.get(id) ?? []));
      return published(
        model,
        chain.flatMap((id) => candidate.get(id) ?? []),
        levels,
      );
    }).length;
    if (complete > best) {
      best = complete;
      period = day;
      byPlace = candidate;
      sourceIds = chainFacts.map((f) => f.sourceId);
    }
  }

  const groupIndex = new Map<string, number>();
  const factGroups: Fact[][] = [];
  const groupOf = (id: string) => {
    const facts = byPlace.get(id);
    if (!facts) {
      return [];
    }
    if (!groupIndex.has(id)) {
      groupIndex.set(id, factGroups.length);
      factGroups.push(facts);
    }
    return [groupIndex.get(id)!];
  };
  const parents = new Map(places.map((p) => [p.id, chainOf(p.id)[1]]));
  const names = await loadNames(
    db,
    [...new Set([...places.map((p) => p.id), ...[...parents.values()].flatMap((id) => id ?? [])])],
    on,
  );
  const nameOf = (id: string) => displayName(names.get(id) ?? [], locale, pack.defaultLocales);
  const mapPlaces: MapPlace[] = places
    .map((p) => {
      const parent = parents.get(p.id);
      return {
        feature: p.ref.featureId,
        slugPath: p.slugPath,
        name: nameOf(p.id),
        parentName: parent ? nameOf(parent) : null,
        groups: chainOf(p.id).flatMap(groupOf),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, locale));

  const retrievals = await loadRetrievals(db, [...sourceIds, ...places.map((p) => p.sourceId)]);
  const levelName = pack.levels.find((l) => l.key === levelKey);
  return {
    packKey: pack.key,
    levelKey,
    levelName: levelName ? localized(levelName.names, locale) : levelKey,
    resource: {
      id: `${places[0]!.ref.sourceId}:${places[0]!.ref.datasetVersion}`,
      href: geographyFileHref(sha),
      sha256: sha,
    },
    period,
    earlierYear: period !== on,
    taxPack: taxPackView(config, pack, period, locale),
    levels: [...new Set(members.flatMap((id) => levelOf.get(id) ?? []))],
    factGroups,
    places: mapPlaces,
    sources: placeSources(config, retrievals, locale),
  };
}

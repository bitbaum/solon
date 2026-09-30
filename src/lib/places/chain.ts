/**
 * A place and everything above it on a given day — the chain the place page
 * breadcrumbs, the civic split shares over, and the tax model reads from.
 *
 * The chain is the place, its `part_of` ancestors, and the places at
 * overlapping levels that overlap any of them (a school municipality serving
 * the municipality). One recursive query; every relation and fact is taken as
 * it stood on `on`, as currently recorded.
 */
import { and, eq, inArray, isNull, lte, or, gt, sql } from "drizzle-orm";
import type { Database, Tx } from "@/lib/db/client";
import {
  facts,
  jurisdictionNames,
  jurisdictionRelations,
  jurisdictions,
} from "@/lib/db/places-schema";
import type { Fact as EvaluatorFact, Tariff } from "@/lib/tax-model";
import type { NameType } from "./vocabulary";

export interface ChainName {
  locale: string;
  script: string | null;
  name: string;
  nameType: NameType;
}

export interface ChainPlace {
  id: string;
  countryPack: string | null;
  levelKey: string | null;
  slugPath: string | null;
  /** 0 for the place itself, then 1, 2, … up the hierarchy; null for overlapping places. */
  depth: number | null;
  names: ChainName[];
}

export interface ChainFact {
  jurisdictionId: string;
  metricKey: string;
  variant: string | null;
  validFrom: string;
  value: number | Tariff;
  sourceId: string;
}

type Executor = Database | Tx;

const MAX_DEPTH = 32;

/** The place and its chain on `on` (ISO date), the place first, the root last, overlaps after. */
export async function loadChain(
  db: Executor,
  jurisdictionId: string,
  on: string,
): Promise<ChainPlace[]> {
  const ancestry = await db.execute<{ id: string; depth: number }>(sql`
    WITH RECURSIVE chain(id, depth) AS (
      SELECT ${jurisdictionId}::text, 0
      UNION ALL
      SELECT r.to_id, c.depth + 1
      FROM ${jurisdictionRelations} r
      JOIN chain c ON r.from_id = c.id
      WHERE r.relation = 'part_of'
        AND r.superseded_at IS NULL
        AND (r.valid_from IS NULL OR r.valid_from <= ${on}::date)
        AND (r.valid_to IS NULL OR r.valid_to > ${on}::date)
        AND c.depth < ${MAX_DEPTH}
    )
    SELECT id, min(depth)::int AS depth FROM chain GROUP BY id ORDER BY depth
  `);
  const depthOf = new Map(ancestry.rows.map((row) => [row.id, Number(row.depth)]));
  if (depthOf.size === 0) {
    return [];
  }
  const overlapping = await db
    .select({ id: jurisdictionRelations.fromId })
    .from(jurisdictionRelations)
    .where(
      and(
        inArray(jurisdictionRelations.toId, [...depthOf.keys()]),
        eq(jurisdictionRelations.relation, "overlaps"),
        isNull(jurisdictionRelations.supersededAt),
        or(isNull(jurisdictionRelations.validFrom), lte(jurisdictionRelations.validFrom, on)),
        or(isNull(jurisdictionRelations.validTo), gt(jurisdictionRelations.validTo, on)),
      ),
    );
  const ids = [...new Set([...depthOf.keys(), ...overlapping.map((r) => r.id)])];

  const places = await db.select().from(jurisdictions).where(inArray(jurisdictions.id, ids));
  const names = await db
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
        inArray(jurisdictionNames.jurisdictionId, ids),
        isNull(jurisdictionNames.supersededAt),
        or(isNull(jurisdictionNames.validFrom), lte(jurisdictionNames.validFrom, on)),
        or(isNull(jurisdictionNames.validTo), gt(jurisdictionNames.validTo, on)),
      ),
    );

  return places
    .map((place) => ({
      id: place.id,
      countryPack: place.countryPack,
      levelKey: place.levelKey,
      slugPath: place.slugPath,
      depth: depthOf.get(place.id) ?? null,
      names: names
        .filter((n) => n.jurisdictionId === place.id)
        .map(({ jurisdictionId: _, ...name }) => name),
    }))
    .sort((a, b) => (a.depth ?? MAX_DEPTH + 1) - (b.depth ?? MAX_DEPTH + 1));
}

/** The current facts of these places for the period containing `on`; only these metrics, when given. */
export async function loadFacts(
  db: Executor,
  jurisdictionIds: string[],
  on: string,
  metricKeys?: readonly string[],
): Promise<ChainFact[]> {
  if (jurisdictionIds.length === 0 || metricKeys?.length === 0) {
    return [];
  }
  const rows = await db
    .select()
    .from(facts)
    .where(
      and(
        inArray(facts.jurisdictionId, jurisdictionIds),
        metricKeys ? inArray(facts.metricKey, [...metricKeys]) : undefined,
        isNull(facts.supersededAt),
        lte(facts.validFrom, on),
        or(isNull(facts.validTo), gt(facts.validTo, on)),
      ),
    );
  return rows.map((row) => ({
    jurisdictionId: row.jurisdictionId,
    metricKey: row.metricKey,
    variant: row.variant,
    validFrom: row.validFrom,
    value: row.valueNumeric !== null ? Number(row.valueNumeric) : (row.valueJson as Tariff),
    sourceId: row.sourceId,
  }));
}

/**
 * The chain's facts in the evaluator's terms: each fact published by the
 * level of the place that holds it. Pure. When a period has several facts for
 * one key, the newest period wins.
 */
export function evaluatorFacts(
  chain: readonly ChainPlace[],
  chainFacts: readonly ChainFact[],
): EvaluatorFact[] {
  const levelOf = new Map(chain.map((place) => [place.id, place.levelKey]));
  const newest = new Map<string, ChainFact & { level: string }>();
  for (const fact of chainFacts) {
    const level = levelOf.get(fact.jurisdictionId);
    if (!level) {
      continue;
    }
    const key = `${level} ${fact.metricKey} ${fact.variant ?? ""}`;
    const seen = newest.get(key);
    if (!seen || seen.validFrom < fact.validFrom) {
      newest.set(key, { ...fact, level });
    }
  }
  return [...newest.values()].map((fact) => ({
    level: fact.level,
    metric: fact.metricKey,
    ...(fact.variant === null ? {} : { variant: fact.variant }),
    value: fact.value,
  }));
}

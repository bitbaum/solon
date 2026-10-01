/**
 * What `/places/coverage` shows (design §9.2): per pack, how many places each
 * level holds, how many of them have each fact the tax model reads, and how
 * fresh each source is — computed from the data, never written by hand. The
 * view is pure; the loader counts in the database.
 */
import { and, count, countDistinct, desc, eq, gt, isNull, lte, max, ne, or } from "drizzle-orm";
import type { PlacesConfig } from "@/lib/config/places/schema";
import type { Database } from "@/lib/db/client";
import { facts, jurisdictions, placeImportRuns, sources } from "@/lib/db/places-schema";
import { modelRefs } from "@/lib/tax-model";
import type { ImportRunStatus } from "./vocabulary";
import { localized } from "./place-view";

export interface LevelCoverage {
  key: string;
  name: string;
  places: number;
  /** Only some parents are divided into this level. */
  partial: boolean;
  /** Beside the hierarchy rather than in it. */
  overlapping: boolean;
}

export interface MetricCoverage {
  levelName: string;
  metricLabel: string;
  /** Places at the level with a current fact for the metric. */
  places: number;
  /** Places at the level. */
  of: number;
  /** The pack's tax model reads it. */
  inTaxModel: boolean;
}

export interface SourceCoverage {
  key: string;
  publisher: string;
  dataset: string;
  homepage: string;
  /** YYYY-MM-DD of the latest retrieval; null when never retrieved. */
  retrievedOn: string | null;
  lastRun: { status: RealRunStatus; on: string } | null;
}

export interface PackCoverage {
  key: string;
  name: string;
  levels: LevelCoverage[];
  metrics: MetricCoverage[];
  hasTaxModel: boolean;
  sources: SourceCoverage[];
}

export interface CoverageInput {
  config: PlacesConfig;
  locale: string;
  /** Current state places per pack and level. */
  placeCounts: readonly { countryPack: string; levelKey: string; places: number }[];
  /** Current state places per pack, level and metric that hold a current fact. */
  factCounts: readonly {
    countryPack: string;
    levelKey: string;
    metricKey: string;
    places: number;
  }[];
  retrievals: readonly { sourceKey: string; retrievedAt: Date }[];
  /** The latest run of each source that was not a dry run. */
  runs: readonly { sourceKey: string; status: RealRunStatus; startedAt: Date }[];
}

/** Dry runs change nothing, so they say nothing about freshness. */
export type RealRunStatus = Exclude<ImportRunStatus, "dry_run">;

const isoDay = (date: Date) => date.toISOString().slice(0, 10);

export function coverageView(input: CoverageInput): PackCoverage[] {
  const { config, locale } = input;
  const metricLabel = (key: string) => {
    const metric = config.metrics.find((m) => m.key === key);
    return metric ? localized(metric.label, locale) : key;
  };

  return config.packs.map((pack) => {
    const placesAt = (levelKey: string) =>
      input.placeCounts.find((c) => c.countryPack === pack.key && c.levelKey === levelKey)
        ?.places ?? 0;
    const levelName = (key: string) => {
      const level = pack.levels.find((l) => l.key === key);
      return level ? localized(level.names, locale) : key;
    };

    const readRefs = pack.taxModel ? modelRefs(pack.taxModel) : [];
    const pairs = [
      ...readRefs.map((r) => ({ levelKey: r.level, metricKey: r.metric })),
      ...input.factCounts.filter((c) => c.countryPack === pack.key),
    ].filter(
      (p, i, all) =>
        all.findIndex((q) => q.levelKey === p.levelKey && q.metricKey === p.metricKey) === i,
    );

    return {
      key: pack.key,
      name: localized(pack.names, locale),
      levels: pack.levels.map((level) => ({
        key: level.key,
        name: localized(level.names, locale),
        places: placesAt(level.key),
        partial: level.coverage === "partial",
        overlapping: level.overlaps !== undefined,
      })),
      metrics: pairs.map(({ levelKey, metricKey }) => ({
        levelName: levelName(levelKey),
        metricLabel: metricLabel(metricKey),
        places:
          input.factCounts.find(
            (c) =>
              c.countryPack === pack.key && c.levelKey === levelKey && c.metricKey === metricKey,
          )?.places ?? 0,
        of: placesAt(levelKey),
        inTaxModel: readRefs.some((r) => r.level === levelKey && r.metric === metricKey),
      })),
      hasTaxModel: pack.taxModel !== undefined,
      sources: pack.sources.flatMap((key) => {
        const source = config.sources.find((s) => s.key === key);
        if (!source) {
          return [];
        }
        const retrieval = input.retrievals.find((r) => r.sourceKey === key);
        const run = input.runs.find((r) => r.sourceKey === key);
        return [
          {
            key,
            publisher: source.publisher,
            dataset: source.dataset,
            homepage: source.homepage,
            retrievedOn: retrieval ? isoDay(retrieval.retrievedAt) : null,
            lastRun: run ? { status: run.status, on: isoDay(run.startedAt) } : null,
          },
        ];
      }),
    };
  });
}

export async function loadCoverage(
  db: Database,
  config: PlacesConfig,
  on: string,
  locale: string,
): Promise<PackCoverage[]> {
  const current = and(
    eq(jurisdictions.origin, "state"),
    or(isNull(jurisdictions.validFrom), lte(jurisdictions.validFrom, on)),
    or(isNull(jurisdictions.validTo), gt(jurisdictions.validTo, on)),
  );

  const placeRows = await db
    .select({
      countryPack: jurisdictions.countryPack,
      levelKey: jurisdictions.levelKey,
      places: count(),
    })
    .from(jurisdictions)
    .where(current)
    .groupBy(jurisdictions.countryPack, jurisdictions.levelKey);

  const factRows = await db
    .select({
      countryPack: jurisdictions.countryPack,
      levelKey: jurisdictions.levelKey,
      metricKey: facts.metricKey,
      places: countDistinct(facts.jurisdictionId),
    })
    .from(facts)
    .innerJoin(jurisdictions, eq(jurisdictions.id, facts.jurisdictionId))
    .where(
      and(
        current,
        isNull(facts.supersededAt),
        lte(facts.validFrom, on),
        or(isNull(facts.validTo), gt(facts.validTo, on)),
      ),
    )
    .groupBy(jurisdictions.countryPack, jurisdictions.levelKey, facts.metricKey);

  const retrievals = await db
    .select({ sourceKey: sources.sourceKey, retrievedAt: max(sources.retrievedAt) })
    .from(sources)
    .groupBy(sources.sourceKey);

  const runs = await db
    .selectDistinctOn([placeImportRuns.sourceKey], {
      sourceKey: placeImportRuns.sourceKey,
      status: placeImportRuns.status,
      startedAt: placeImportRuns.startedAt,
    })
    .from(placeImportRuns)
    .where(ne(placeImportRuns.status, "dry_run"))
    .orderBy(placeImportRuns.sourceKey, desc(placeImportRuns.startedAt));

  const known = <T extends { countryPack: string | null; levelKey: string | null }>(rows: T[]) =>
    rows.flatMap((r) =>
      r.countryPack && r.levelKey
        ? [{ ...r, countryPack: r.countryPack, levelKey: r.levelKey }]
        : [],
    );

  return coverageView({
    config,
    locale,
    placeCounts: known(placeRows),
    factCounts: known(factRows),
    retrievals: retrievals.flatMap((r) =>
      r.retrievedAt ? [{ sourceKey: r.sourceKey, retrievedAt: new Date(r.retrievedAt) }] : [],
    ),
    runs: runs.flatMap((r) => (r.status === "dry_run" ? [] : [{ ...r, status: r.status }])),
  });
}

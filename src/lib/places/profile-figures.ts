/**
 * A place's figures for its profile (config: PROFILE_FIGURES): for each, the
 * first of its metrics the place holds, the latest value, where that value
 * stands among the countries reporting the same year, its recent trend and
 * where it comes from. A figure the place has no value for is left out; a
 * place with none shows no figures at all.
 */
import { sql } from "drizzle-orm";
import {
  PROFILE_FIGURES,
  PROFILE_MIN_PEERS,
  PROFILE_PEERS_SCHEME,
  PROFILE_TREND_YEARS,
  type ProfileFigureGroup,
} from "@/lib/config/places/profile-figures";
import type { Metric, PlacesConfig } from "@/lib/config/places/schema";
import type { Database } from "@/lib/db/client";
import { rowsOf } from "@/lib/db/rows";
import { metricPath } from "@/lib/statistics/present";
import { localized } from "./place-view";

export interface ProfileFigureView {
  key: string;
  group: ProfileFigureGroup;
  metricKey: string;
  label: string;
  unit: Metric["unit"];
  value: number;
  year: number;
  /** How many of the countries reporting that year have a lower value, of how many others. */
  position: { below: number; others: number } | null;
  trend: { year: number; value: number }[];
  publisher: string;
  href: string;
}

export async function loadProfileFigures(
  db: Database,
  config: PlacesConfig,
  jurisdictionId: string,
  locale: string,
): Promise<ProfileFigureView[]> {
  const metrics = new Map(config.metrics.map((m) => [m.key, m]));
  const keys = PROFILE_FIGURES.flatMap((f) => f.metrics).filter((k) => metrics.has(k));
  if (keys.length === 0) return [];
  const rows = rowsOf<{ metric_key: string; year: number; value: string }>(
    await db.execute(sql`
      SELECT f.metric_key, EXTRACT(YEAR FROM f.valid_from)::int AS year, f.value_numeric::text AS value
      FROM facts f
      WHERE f.jurisdiction_id = ${jurisdictionId} AND f.superseded_at IS NULL
        AND f.variant IS NULL AND f.value_numeric IS NOT NULL
        AND f.metric_key IN (${sql.join(
          keys.map((k) => sql`${k}`),
          sql`, `,
        )})
      ORDER BY f.metric_key, f.valid_from`),
  );
  const series = new Map<string, { year: number; value: number }[]>();
  for (const r of rows) {
    series.set(r.metric_key, [
      ...(series.get(r.metric_key) ?? []),
      { year: Number(r.year), value: Number(r.value) },
    ]);
  }

  const out: ProfileFigureView[] = [];
  for (const figure of PROFILE_FIGURES) {
    const metricKey = figure.metrics.find((k) => (series.get(k)?.length ?? 0) > 0);
    const metric = metricKey ? metrics.get(metricKey) : undefined;
    if (!metricKey || !metric?.statistic) continue;
    const points = series.get(metricKey)!;
    const latest = points.at(-1)!;
    const [peers] = rowsOf<{ below: string; others: string }>(
      await db.execute(sql`
        SELECT count(*) FILTER (WHERE f.value_numeric < ${latest.value}) AS below,
               count(*) FILTER (WHERE f.jurisdiction_id <> ${jurisdictionId}) AS others
        FROM facts f
        WHERE f.metric_key = ${metricKey} AND f.superseded_at IS NULL AND f.variant IS NULL
          AND f.value_numeric IS NOT NULL
          AND EXTRACT(YEAR FROM f.valid_from)::int = ${latest.year}
          AND EXISTS (
            SELECT 1 FROM jurisdiction_identifiers i
            WHERE i.jurisdiction_id = f.jurisdiction_id AND i.scheme = ${PROFILE_PEERS_SCHEME}
              AND i.superseded_at IS NULL
          )`),
    );
    const others = Number(peers?.others ?? 0);
    out.push({
      key: figure.key,
      group: figure.group,
      metricKey,
      label: localized(metric.label, locale),
      unit: metric.unit,
      value: latest.value,
      year: latest.year,
      position: others + 1 >= PROFILE_MIN_PEERS ? { below: Number(peers!.below), others } : null,
      trend: points.filter((p) => p.year > latest.year - PROFILE_TREND_YEARS),
      publisher: metric.statistic.series.publisher,
      href: metricPath(metricKey),
    });
  }
  return out;
}

/** The place a country's figures are held on, by its country code; null where Solon holds none. */
export async function countryPlaceId(db: Database, code: string): Promise<string | null> {
  const [row] = rowsOf<{ id: string }>(
    await db.execute(sql`
      SELECT jurisdiction_id AS id FROM jurisdiction_identifiers
      WHERE scheme = ${PROFILE_PEERS_SCHEME} AND value = ${code} AND superseded_at IS NULL
      LIMIT 1`),
  );
  return row?.id ?? null;
}

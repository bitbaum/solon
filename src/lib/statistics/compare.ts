/**
 * Two measures against each other, and an axis's measures side by side:
 * the data for a scatter plot and for parallel coordinates. Pure, so the
 * pages and the tests read one answer.
 */
import type { Axis, AxisScore } from "./axes";
import type { PlaceSeries } from "./read";

export interface ScatterPoint {
  code: string;
  name: string;
  x: number;
  y: number;
  /** The year both values describe: the latest year the place has both. */
  year: number;
}

/**
 * One point per place that has both measures, at the latest year it has both,
 * so a point never pairs a value from one year with a value from another.
 */
export function scatterPoints(
  xs: readonly PlaceSeries[],
  ys: readonly PlaceSeries[],
): ScatterPoint[] {
  const out: ScatterPoint[] = [];
  for (const x of xs) {
    const y = ys.find((s) => s.jurisdictionId === x.jurisdictionId);
    if (!y) continue;
    const yByYear = new Map(y.points.map((p) => [p.year, p.value]));
    const year = [...x.points]
      .reverse()
      .map((p) => p.year)
      .find((yr) => yByYear.has(yr));
    if (year === undefined) continue;
    out.push({
      code: x.code,
      name: x.name,
      x: x.points.find((p) => p.year === year)!.value,
      y: yByYear.get(year)!,
      year,
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export interface ParallelColumn {
  metric: string;
  min: number;
  max: number;
}

export interface ParallelLine {
  code: string;
  name: string;
  /** Per column: where the value sits between that column's min and max (0 to 1), or null. */
  at: (number | null)[];
  values: (number | null)[];
}

/**
 * The places' latest values on each of an axis's measures, each column scaled
 * between its own lowest and highest value among the places shown. Values are
 * drawn as they are, not turned by the axis's signs, so a line reads like the
 * numbers do.
 */
export function parallelData(
  axis: Axis,
  scores: readonly AxisScore[],
): { columns: ParallelColumn[]; lines: ParallelLine[] } {
  const columns = axis.components.map((c) => {
    const values = scores.flatMap((s) => {
      const v = s.parts.find((p) => p.metric === c.metric)?.value;
      return v === null || v === undefined ? [] : [v];
    });
    return {
      metric: c.metric,
      min: values.length ? Math.min(...values) : 0,
      max: values.length ? Math.max(...values) : 0,
    };
  });
  const lines = scores.map((s) => {
    const values = columns.map(
      (col) => s.parts.find((p) => p.metric === col.metric)?.value ?? null,
    );
    return {
      code: s.code,
      name: s.name,
      values,
      at: values.map((v, i) => {
        if (v === null) return null;
        const { min, max } = columns[i]!;
        return max === min ? 0.5 : (v - min) / (max - min);
      }),
    };
  });
  return { columns, lines };
}

/**
 * A reader's own axis from a link: `use=<metric>` once per measure, `w.<metric>` its
 * weight (0 to 10) and `d.<metric>=-1` when a lower value should move the score up.
 * Only measures that are statistics are taken; null when none is chosen.
 */
export function customAxisFromQuery(
  query: Readonly<Record<string, string | string[] | undefined>>,
  statistics: ReadonlySet<string>,
  label: Axis["label"],
  direction: Axis["direction"],
  author: string,
): Axis | null {
  const used = [query.use].flat().filter((m): m is string => typeof m === "string");
  const chosen = [...new Set(used)].filter((m) => statistics.has(m));
  if (chosen.length === 0) return null;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  return {
    key: "custom",
    version: 1,
    label,
    direction,
    author,
    components: chosen.map((metric) => {
      const w = Number(one(query[`w.${metric}`]));
      return {
        metric,
        sign: one(query[`d.${metric}`]) === "-1" ? (-1 as const) : (1 as const),
        weight: Number.isFinite(w) ? Math.min(10, Math.max(0, w)) : 1,
      };
    }),
  };
}

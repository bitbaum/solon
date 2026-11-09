/**
 * Axes: several measures read together along one named direction, never one
 * score of "freedom" in Solon's own voice (design: "Axes and weights are
 * policies, not Solon's opinion"). An axis is a versioned definition with its
 * author; the weights are the reader's, or a group's own policy
 * (`statistic_axes`, voted like any other policy).
 */
import { z } from "zod";
import { localizedTextSchema } from "@/lib/config/places/schema";
import type { PlaceSeries } from "./read";

/** The policy key a group stores its own axes and weights under. */
export const STATISTIC_AXES_POLICY_KEY = "statistic_axes";

export const axisSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_]*$/),
  version: z.number().int().positive(),
  label: localizedTextSchema,
  /** What a higher score means, said plainly; never "freer" or "better". */
  direction: localizedTextSchema,
  /** Who defined it, and on what. */
  author: z.string().min(1),
  components: z
    .array(
      z.object({
        metric: z.string().min(1),
        /** 1: a higher value moves the score up; -1: down. */
        sign: z.union([z.literal(1), z.literal(-1)]),
        weight: z.number().min(0).max(10),
      }),
    )
    .min(1),
});
export type Axis = z.infer<typeof axisSchema>;

/** What a group votes: its axes, as a list, under STATISTIC_AXES_POLICY_KEY. */
export const axesPolicySchema = z.object({ axes: z.array(axisSchema).min(1) });

export interface AxisScore {
  jurisdictionId: string;
  code: string;
  name: string;
  /** 0–100 along the axis among the places shown; null when no component has a value. */
  score: number | null;
  /** Per component: the latest value and its year, or null where the place has none. */
  parts: { metric: string; value: number | null; year: number | null }[];
}

/**
 * Scores among the places given, so a score says where a place sits among
 * those, nothing absolute: each component's latest value is placed between
 * the lowest and highest of the places (0 to 1), turned by its sign, and the
 * weighted mean of the components a place has is its score. A component no
 * place has, or whose weight is zero, counts for nothing.
 */
export function scoreAxis(
  axis: Axis,
  seriesByMetric: ReadonlyMap<string, readonly PlaceSeries[]>,
  weights: Readonly<Record<string, number>> = {},
): AxisScore[] {
  const places = new Map<string, { code: string; name: string }>();
  // Only places with at least one of the axis's own series.
  for (const c of axis.components) {
    for (const s of seriesByMetric.get(c.metric) ?? []) {
      places.set(s.jurisdictionId, { code: s.code, name: s.name });
    }
  }
  const latest = (metric: string, id: string) => {
    const s = seriesByMetric.get(metric)?.find((x) => x.jurisdictionId === id);
    const p = s?.points.at(-1);
    return p ? { value: p.value, year: p.year } : null;
  };
  const ranges = new Map<string, { min: number; max: number }>();
  for (const c of axis.components) {
    const values = [...places.keys()].flatMap((id) => {
      const v = latest(c.metric, id);
      return v ? [v.value] : [];
    });
    if (values.length > 0)
      ranges.set(c.metric, { min: Math.min(...values), max: Math.max(...values) });
  }
  return [...places.entries()].map(([id, place]) => {
    let sum = 0;
    let total = 0;
    const parts = axis.components.map((c) => {
      const v = latest(c.metric, id);
      const weight = weights[c.metric] ?? c.weight;
      const range = ranges.get(c.metric);
      if (v && range && weight > 0) {
        const unit =
          range.max === range.min ? 0.5 : (v.value - range.min) / (range.max - range.min);
        sum += weight * (c.sign === 1 ? unit : 1 - unit);
        total += weight;
      }
      return { metric: c.metric, value: v?.value ?? null, year: v?.year ?? null };
    });
    return {
      jurisdictionId: id,
      ...place,
      score: total > 0 ? Math.round((sum / total) * 1000) / 10 : null,
      parts,
    };
  });
}

/** Reader weights from a query (`w.<metric>=3`), each clamped to 0–10. */
export function weightsFromQuery(
  axis: Axis,
  query: Readonly<Record<string, string | string[] | undefined>>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of axis.components) {
    const raw = query[`w.${c.metric}`];
    const n = Number(Array.isArray(raw) ? raw[0] : raw);
    if (raw !== undefined && Number.isFinite(n)) out[c.metric] = Math.min(10, Math.max(0, n));
  }
  return out;
}

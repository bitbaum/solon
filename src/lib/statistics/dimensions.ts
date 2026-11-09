/**
 * Dimensions: a freedom or a rule of public life (taxation, personal use of a
 * substance, speech, exit) held as three layers that are never collapsed into
 * one score:
 *
 * - `de_jure`: what the law says, including what it works out to for a typical
 *   case (a statutory rate, and the burden the rules put on an average wage);
 * - `de_facto`: what happens in practice (enforcement, prosecution, compliance,
 *   tolerance), which can differ from the law and is evidenced separately;
 * - `outcome`: what results for people and society (revenue, prices,
 *   availability, self-reported ease).
 *
 * A dimension is a definition with an author and a version, so a group can adopt
 * or amend it by vote. A layer with no series says so and says what would fill
 * it: a gap in the data is stated, never hidden.
 */
import { z } from "zod";
import { localizedTextSchema } from "@/lib/config/places/schema";

export const DIMENSION_LAYERS = ["de_jure", "de_facto", "outcome"] as const;
export type DimensionLayer = (typeof DIMENSION_LAYERS)[number];

const layerSchema = z.object({
  /** Metric keys of live statistics, each a measure on this layer. */
  metrics: z.array(z.string().min(1)).default([]),
  /** Rubric keys of legal features coded from the law, each a measure on this layer. */
  rubrics: z.array(z.string().min(1)).default([]),
  /** What series would fill the layer, where it holds none; required then. */
  wanted: localizedTextSchema.optional(),
});

export const dimensionSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_]*$/),
  version: z.number().int().positive(),
  label: localizedTextSchema,
  /** What the dimension is about, in a sentence a reader can disagree with on its merits. */
  summary: localizedTextSchema,
  layers: z.object({ de_jure: layerSchema, de_facto: layerSchema, outcome: layerSchema }),
  /** Who defined it, and on what. */
  author: z.string().min(1),
});
export type Dimension = z.infer<typeof dimensionSchema>;
export type DimensionInput = z.input<typeof dimensionSchema>;

/** Every measure of a dimension, with the layer it sits on, in layer order. */
export const measuresOf = (d: Dimension): { metric: string; layer: DimensionLayer }[] =>
  DIMENSION_LAYERS.flatMap((layer) => d.layers[layer].metrics.map((metric) => ({ metric, layer })));

/** Parse the dimensions and cross-check them against the catalog of live statistics. */
export function defineDimensions(
  input: readonly DimensionInput[],
  liveMetrics: ReadonlySet<string>,
  rubricKeys: ReadonlySet<string> = new Set(),
): Dimension[] {
  const dimensions = input.map((d) => dimensionSchema.parse(d));
  const problems: string[] = [];
  const keys = new Set<string>();
  const placed = new Map<string, string>();
  for (const d of dimensions) {
    if (keys.has(d.key)) problems.push(`dimension "${d.key}" is declared twice`);
    keys.add(d.key);
    for (const layer of DIMENSION_LAYERS) {
      const l = d.layers[layer];
      if (l.metrics.length === 0 && l.rubrics.length === 0 && !l.wanted) {
        problems.push(
          `dimension "${d.key}": the ${layer} layer has no series and does not say what would fill it`,
        );
      }
      for (const r of l.rubrics) {
        if (!rubricKeys.has(r)) problems.push(`dimension "${d.key}": rubric "${r}" does not exist`);
        const where = placed.get(`rubric:${r}`);
        if (where) problems.push(`rubric "${r}" is on two layers: ${where} and ${d.key}.${layer}`);
        placed.set(`rubric:${r}`, `${d.key}.${layer}`);
      }
      for (const m of l.metrics) {
        if (!liveMetrics.has(m))
          problems.push(`dimension "${d.key}": "${m}" is not a live statistic`);
        const where = placed.get(m);
        if (where) problems.push(`"${m}" is on two layers: ${where} and ${d.key}.${layer}`);
        placed.set(m, `${d.key}.${layer}`);
      }
    }
  }
  if (problems.length > 0) throw new Error(`dimensions:\n- ${problems.join("\n- ")}`);
  return dimensions;
}

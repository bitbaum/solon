/**
 * Rubrics: how a legal feature is coded. A person reading a statute and placing
 * it on a scale is making a judgement, and a judgement made twice should come
 * out the same. So the question, every point of the scale (with a definition),
 * and the edge cases already decided are data, versioned; a coding names the
 * version it worked from, and a feature with no rubric is refused.
 */
import { z } from "zod";
import { localizedTextSchema } from "@/lib/config/places/schema";

export const rubricSchema = z
  .object({
    key: z.string().regex(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/, "dotted lower snake case"),
    version: z.number().int().positive(),
    label: localizedTextSchema,
    /** What is asked of the text, in one sentence that has a yes-or-a-point for an answer. */
    question: localizedTextSchema,
    /** Every point a coding may take, ordered, each with what puts a case there. */
    scale: z
      .array(
        z.object({
          value: z.number(),
          label: localizedTextSchema,
          definition: localizedTextSchema,
        }),
      )
      .min(2),
    /** Cases that were hard and how they were decided, so the next reader decides them alike. */
    edgeCases: z.array(localizedTextSchema).default([]),
    author: z.string().min(1),
  })
  .refine((r) => new Set(r.scale.map((p) => p.value)).size === r.scale.length, {
    message: "a scale cannot have the same point twice",
  });
export type Rubric = z.infer<typeof rubricSchema>;
export type RubricInput = z.input<typeof rubricSchema>;

export function defineRubrics(input: readonly RubricInput[]): Rubric[] {
  const rubrics = input.map((r) => rubricSchema.parse(r));
  const seen = new Set<string>();
  for (const r of rubrics) {
    if (seen.has(r.key)) throw new Error(`rubric "${r.key}" is declared twice`);
    seen.add(r.key);
  }
  return rubrics;
}

/** The scale's point for a value, or undefined when the value is not one. */
export const pointOf = (rubric: Rubric, value: number) =>
  rubric.scale.find((p) => p.value === value);

/**
 * Where what is measured differs between places, and what that leaves unknown.
 * Statistical offices decide what to collect and what to publish, for reasons
 * that are legal, historical, practical or political; the same question can be
 * answerable in one country and not in another. This registry records, per
 * topic and place, what a source that was read says is collected, with which
 * crossings (age, sex …) and under what legal frame, and derives from it where
 * a gap is: a place whose answer to the topic's question is absent while
 * another's is published.
 *
 * It states and proposes; it does not conclude. A gap is not a fault of an
 * office: it may be a law the country chose. A proposal says what would be
 * collected, what question it would answer, what must accompany it so it is
 * not misread, and what the objections and safeguards are. Nothing here
 * characterises an office or the people in a statistic.
 */
import { z } from "zod";
import { localizedTextSchema } from "@/lib/config/places/schema";

export const COVERAGE_STATUSES = [
  /** Collected, and published as figures anyone can read. */
  "published",
  /** Collected, available only to approved researchers or on request. */
  "restricted",
  /** An office could collect it but does not, as far as its own pages say. */
  "not_collected",
  /** The law bars collecting or using the category. */
  "barred_by_law",
] as const;

/** What a breakdown is crossed with, where it is published: the things a fair comparison needs. */
export const CROSSINGS = ["age", "sex", "region", "income", "education", "offence_type"] as const;

const evidenceSchema = z.object({
  publisher: z.string().min(1),
  url: z.url(),
  read: z.iso.date(),
  expect: z.array(z.string().min(1)),
  unchecked: z.literal(true).optional(),
});

const placeSchema = z.object({
  scheme: z.literal("iso_3166_1"),
  value: z.string().regex(/^[A-Z]{2}$/),
});

export const topicSchema = z.object({
  key: z.string().regex(/^[a-z0-9_.]+$/),
  label: localizedTextSchema,
  /** The question an answer would settle, in a sentence. */
  question: localizedTextSchema,
  /** What the measure is for: the uses that justify collecting it. */
  purposes: z.array(localizedTextSchema).min(1),
  /** The breakdowns a source can offer, from the coarsest to the finest. */
  variants: z
    .array(z.object({ key: z.string().regex(/^[a-z0-9_]+$/), label: localizedTextSchema }))
    .min(1),
  /** What a reader must keep in mind so the figures are not misread. */
  cautions: z.array(localizedTextSchema).min(1),
  /** What could go wrong in collecting or publishing it, and what offices and laws do about it. */
  risks: z.array(z.object({ risk: localizedTextSchema, safeguard: localizedTextSchema })),
  /** What would let an explanation be tested, not only a difference shown. */
  companions: z.array(localizedTextSchema),
  author: z.string().min(1),
});
export type Topic = z.infer<typeof topicSchema>;

export const coverageSchema = z.object({
  topic: z.string(),
  place: placeSchema,
  /** Which of the topic's variants this line is about. */
  variant: z.string().regex(/^[a-z0-9_]+$/),
  status: z.enum(COVERAGE_STATUSES),
  crossings: z.array(z.enum(CROSSINGS)).default([]),
  publisher: z.string().min(1),
  /** What it collects, in the office's own terms, and how it defines the group. */
  summary: localizedTextSchema,
  /** The legal or policy reason for collecting or not collecting, only where a page says so. */
  frame: localizedTextSchema.optional(),
  /** What about it was not read, so nobody fills it in from memory. */
  unread: z.array(z.string().min(1)).default([]),
  /** Pages read, each with the words relied on. */
  evidence: z.array(evidenceSchema).min(1),
});
export type Coverage = z.infer<typeof coverageSchema>;

export interface GapRow {
  variant: string;
  place: string;
  status: Coverage["status"];
  /** Places that publish this variant, for the reader to compare against. */
  publishedElsewhere: string[];
}

export function defineGaps(input: { topics: readonly unknown[]; coverage: readonly unknown[] }) {
  const topics = input.topics.map((t) => topicSchema.parse(t));
  const coverage = input.coverage.map((c) => coverageSchema.parse(c));
  const keys = new Set(topics.map((t) => t.key));
  if (keys.size !== topics.length) throw new Error("a topic is declared twice");
  const seen = new Set<string>();
  for (const c of coverage) {
    const topic = topics.find((t) => t.key === c.topic);
    if (!topic) throw new Error(`coverage names the unknown topic "${c.topic}"`);
    const id = `${c.topic}:${c.place.value}:${c.variant}`;
    if (seen.has(id)) throw new Error(`${id} is covered twice`);
    seen.add(id);
    if (!topic.variants.some((v) => v.key === c.variant)) {
      throw new Error(`${id}: "${c.variant}" is not a variant of ${topic.key}`);
    }
    if (c.status === "barred_by_law" && !c.frame) {
      throw new Error(`${id}: a bar in law must quote the law that bars it (frame)`);
    }
    for (const e of c.evidence) {
      if (!e.unchecked && e.expect.length === 0) {
        throw new Error(
          `${id}: ${e.url} must name the words it relies on, or say a program cannot read it`,
        );
      }
    }
  }
  return { topics, coverage };
}

/**
 * For each variant some place publishes: the places that do not. A variant
 * nobody publishes is not a gap between places, and is not listed.
 */
export function gapsOf(topic: string, coverage: readonly Coverage[]): GapRow[] {
  const here = coverage.filter((c) => c.topic === topic);
  const rows: GapRow[] = [];
  for (const variant of new Set(here.map((c) => c.variant))) {
    const of = here.filter((c) => c.variant === variant);
    const published = of.filter((c) => c.status === "published").map((c) => c.place.value);
    if (published.length === 0) continue;
    for (const c of of.filter((x) => x.status !== "published")) {
      rows.push({ variant, place: c.place.value, status: c.status, publishedElsewhere: published });
    }
  }
  return rows;
}

export const publishedWith = (c: Coverage, crossing: (typeof CROSSINGS)[number]) =>
  c.status === "published" && c.crossings.includes(crossing);

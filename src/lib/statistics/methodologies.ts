/**
 * Rankings and ratings of governance and freedom, described so a reader can
 * judge them: who makes each, what it claims to measure, how (experts scoring
 * countries, a composite of other sources, official statistics, text coded from
 * the law), what it is made of, and whether its data may be shown here. Every
 * line about a publisher's method rests on a page that was read (`evidence`);
 * what was not read is listed as `unread`, never filled in.
 *
 * The critical questions are derived from these properties (questionsFor), so
 * every index is asked the same things and none is singled out.
 */
import { z } from "zod";
import { localizedTextSchema } from "@/lib/config/places/schema";

export const METHOD_KINDS = [
  /** Experts or staff score each country against questions. */
  "expert_scoring",
  /** An aggregate of other indicators or indexes, rescaled and weighted. */
  "composite",
  /** Surveys of what people or firms perceive. */
  "perception",
  /** Figures a statistical office or international body publishes. */
  "official_statistics",
  /** Features read from the text of the law and placed on a written scale. */
  "coded_from_law",
] as const;

/** What it is about: the law, what happens, what results, or how it is seen. */
export const METHOD_LAYERS = ["de_jure", "de_facto", "outcome", "perception"] as const;

export const LICENCE_VERDICTS = ["loadable", "unclear", "permission", "not_loadable"] as const;

const evidenceSchema = z.object({
  publisher: z.string().min(1),
  url: z.url(),
  read: z.iso.date(),
  expect: z.array(z.string().min(1)),
  unchecked: z.literal(true).optional(),
});

export const methodologySchema = z.object({
  key: z.string().regex(/^[a-z0-9_]+$/),
  name: z.string().min(1),
  publisher: z.string().min(1),
  homepage: z.url(),
  /** What it says it measures, in a sentence. */
  claims: localizedTextSchema,
  kinds: z.array(z.enum(METHOD_KINDS)).min(1),
  layers: z.array(z.enum(METHOD_LAYERS)).min(1),
  /** Its parts as the publisher names them, from a page that was read. */
  components: z.array(z.string().min(1)),
  coverage: localizedTextSchema.optional(),
  /** Other datasets it takes inputs from, as the publisher says. */
  draws_on: z.array(z.string().min(1)).default([]),
  licence: z.object({
    verdict: z.enum(LICENCE_VERDICTS),
    /** The decisive words of the terms, quoted. */
    terms: z.string().min(1),
    why: localizedTextSchema,
  }),
  /** Things about it not yet read, so nobody fills them in from memory. */
  unread: z.array(z.string().min(1)).default([]),
  evidence: z.array(evidenceSchema).min(1),
});
export type Methodology = z.infer<typeof methodologySchema>;

export function defineMethodologies(input: readonly unknown[]): Methodology[] {
  const out = input.map((m) => methodologySchema.parse(m));
  const seen = new Set<string>();
  for (const m of out) {
    if (seen.has(m.key)) throw new Error(`methodology ${m.key} declared twice`);
    seen.add(m.key);
    if (m.licence.verdict === "loadable" && m.draws_on.some((d) => /share-?alike|BY-SA/i.test(d)))
      throw new Error(`${m.key}: loadable, but draws on share-alike data`);
  }
  return out;
}

export type QuestionKey =
  | "experts"
  | "composite"
  | "perception"
  | "official"
  | "coded"
  | "weights"
  | "layer"
  | "inputs"
  | "licence"
  | "unread";

/**
 * What a careful reader asks of an index, from what it is: the same questions
 * for every index of a kind. Keys, so each page asks them in its language.
 */
export function questionsFor(m: Methodology): QuestionKey[] {
  const q: QuestionKey[] = [];
  if (m.kinds.includes("expert_scoring")) q.push("experts");
  if (m.kinds.includes("composite")) q.push("composite", "weights");
  if (m.kinds.includes("perception")) q.push("perception");
  if (m.kinds.includes("official_statistics")) q.push("official");
  if (m.kinds.includes("coded_from_law")) q.push("coded");
  if (m.layers.length > 1 || m.layers.includes("perception")) q.push("layer");
  if (m.draws_on.length > 0) q.push("inputs");
  if (m.licence.verdict !== "loadable") q.push("licence");
  if (m.unread.length > 0) q.push("unread");
  return q;
}

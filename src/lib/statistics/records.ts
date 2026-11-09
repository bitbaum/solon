/**
 * What a statistics record may say, by kind (design:
 * docs/design/2026-11-freedom-laws-statistics.md, "The model"). A record names
 * places and acts by their identifiers, never by our ids, so it survives a
 * reload of either.
 */
import { z } from "zod";
import { localizedTextSchema } from "@/lib/config/places/schema";
import { ASSESSMENT_CONFIDENCES, ASSESSMENT_METHODS, ENFORCEMENT_FORMS } from "./vocabulary";

const placeRef = z.object({ scheme: z.string().min(1), value: z.string().min(1) });
const isoDate = z.iso.date();
const httpsUrl = z.url({ protocol: /^https$/ });

/** An act, by its authority and one of its identifiers (config/law ACT_IDENTIFIER_SCHEMES). */
export const actRefSchema = z.object({
  authority: z.string().min(1),
  scheme: z.string().min(1),
  value: z.string().min(1),
});
export type ActRef = z.infer<typeof actRefSchema>;

/** Where a statement comes from: a page someone opened, and when. */
export const evidenceSchema = z.object({
  publisher: z.string().min(1),
  url: httpsUrl,
  /** The day the page was read for this record. */
  read: isoDate,
  /**
   * Words the page must still contain for the record to stand: a figure, a name,
   * a quoted sentence. `pnpm run statistics:verify` fetches the page and fails
   * when one is gone, so a page that moved or was rewritten is found, not trusted.
   */
  expect: z.array(z.string().min(1)).default([]),
  /**
   * A page for people that a program cannot read (a JavaScript app, or a front
   * that refuses programs). It stays a link; the record also cites a copy a program
   * can read, which carries the checked words.
   */
  unchecked: z.literal(true).optional(),
});

/** A metric is about this act, or this article of it. */
export const lawLinkBodySchema = z.object({
  /** The place whose series the link is about; null where the metric is read. */
  place: placeRef.nullable(),
  act: actRefSchema,
  /** The publisher's anchor of the article (`art_36`); null for the act as a whole. */
  provision: z.string().min(1).nullable(),
  /** Why the series is about this law, in the reader's terms. */
  why: localizedTextSchema,
  evidence: z.array(evidenceSchema).min(1),
});

/** A step in how something came about: dated, said plainly, with the page that says so. */
export const processStepSchema = z.object({
  on: isoDate,
  step: localizedTextSchema,
  evidence: z.array(evidenceSchema).min(1),
});

/**
 * A vote, as the body's own record states it. Either member counts (`for`,
 * `against`) or a share of the electorate (`forPercent`); a breakdown names
 * the groups (parties, delegations) and how each voted, when the record does.
 */
export const voteSchema = z.object({
  body: localizedTextSchema,
  /** Null where the source gives the result but not the day. */
  on: isoDate.nullable(),
  question: localizedTextSchema,
  outcome: z.enum(["adopted", "rejected"]),
  /** What the source says beyond the counts ("unanimous"). */
  note: localizedTextSchema.optional(),
  for: z.number().int().min(0).optional(),
  against: z.number().int().min(0).optional(),
  /** Members who did not vote. */
  absent: z.number().int().min(0).optional(),
  forPercent: z.number().min(0).max(100).optional(),
  turnoutPercent: z.number().min(0).max(100).optional(),
  breakdown: z
    .array(
      z.object({
        group: z.string().min(1),
        for: z.number().int().min(0),
        against: z.number().int().min(0),
        absent: z.number().int().min(0).default(0),
      }),
    )
    .default([]),
  evidence: z.array(evidenceSchema).min(1),
});

/** Who took part in something, and how: the roles a reader can follow. */
export const ACTOR_ROLES = [
  "initiator",
  "sponsor",
  "responsible",
  "voted_for",
  "voted_against",
  "recommends_yes",
  "recommends_no",
  "supports",
  "opposes",
  "comments",
] as const;
export type ActorRole = (typeof ACTOR_ROLES)[number];

export const actorSchema = z.object({
  name: z.string().min(1),
  /** What the name is, in the reader's terms: a party, a body, an official. */
  description: localizedTextSchema.optional(),
  role: z.enum(ACTOR_ROLES),
  /** What they did or said, where the source gives more than the role. */
  note: localizedTextSchema.optional(),
  evidence: z.array(evidenceSchema).min(1),
});

/** A statement made about it by someone, kept apart from what happened. */
export const reportedSchema = z.object({
  kind: z.enum(["claim", "critique", "context"]),
  /** Who says so. */
  by: z.string().min(1),
  statement: localizedTextSchema,
  evidence: z.array(evidenceSchema).min(1),
});

/** One side of a change to a law: the words, in the language they were enacted in. */
export const wordingSchema = z.object({
  text: z.string().min(1),
  lang: z.string().min(2),
  /** A reader's-language rendering, when the words are in another. */
  translation: localizedTextSchema.optional(),
  evidence: z.array(evidenceSchema).min(1),
});

export const EVENT_CATEGORIES = ["statute", "referendum", "ordinance"] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

/**
 * Something that happened to the law of a place, for a timeline and a page of
 * its own: what changed, how it came about, who stood where, and what was
 * said about it, each line with the page it was read on. A claim about an
 * effect is never a fact here: it is a `reported` line with who made it.
 */
export const eventBodySchema = z.object({
  /** The path of the event's page: lower case words and hyphens. */
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  /** The place the law applies to, at the level Solon holds. */
  place: placeRef,
  /** Where inside that place, when narrower (a city, a canton). */
  scope: localizedTextSchema.optional(),
  category: z.enum(EVENT_CATEGORIES),
  /** The day it was decided: passed, signed, voted. */
  on: isoDate,
  /** The day the change begins to apply; absent where nothing changed. */
  effective: isoDate.optional(),
  title: localizedTextSchema,
  summary: localizedTextSchema,
  /** The act and the article, where Solon's law register can hold it. */
  act: actRefSchema.optional(),
  /** What changed in the law: a provision before and after, in its own words. */
  change: z
    .object({
      law: localizedTextSchema,
      provision: z.string().min(1),
      before: wordingSchema.nullable(),
      after: wordingSchema,
    })
    .optional(),
  process: z.array(processStepSchema).default([]),
  votes: z.array(voteSchema).default([]),
  actors: z.array(actorSchema).default([]),
  reported: z.array(reportedSchema).default([]),
  /** The statistics to chart around it, by metric key. */
  series: z.array(z.string().min(1)).default([]),
  /** What a reader should keep in mind before reading a cause into a line. */
  caveat: localizedTextSchema.optional(),
  evidence: z.array(evidenceSchema).min(1),
});

/** How a law is enforced, as a named source states it, beside the statute and never in it. */
export const enforcementBodySchema = z.object({
  place: placeRef,
  act: actRefSchema,
  provision: z.string().min(1).nullable(),
  from: isoDate,
  to: isoDate.nullable(),
  form: z.enum(ENFORCEMENT_FORMS),
  /** For a rate: the metric whose facts hold it. */
  rateMetric: z.string().min(1).optional(),
  summary: localizedTextSchema,
  /** Who says so: the publisher whose statement this is. */
  statedBy: z.string().min(1),
  evidence: z.array(evidenceSchema).min(1),
});

/**
 * A legal feature read from a text and placed on a rubric's scale. A judgement
 * can be wrong, so it carries what it was read from (provisions and the words,
 * each with the page and the words the page must still hold), how sure the
 * reader is and why, who coded it and who checked it. It is shown as settled
 * only once a person other than the coder has checked it.
 */
export const assessmentBodySchema = z.object({
  place: placeRef,
  /** The rubric's key; its question and scale decide what the value means. */
  rubric: z.string().min(1),
  /** The version of the rubric the coder worked from. */
  rubricVersion: z.number().int().positive(),
  /** A point on the rubric's scale. */
  value: z.number(),
  validFrom: isoDate,
  validTo: isoDate.nullable(),
  method: z.enum(ASSESSMENT_METHODS),
  confidence: z.enum(ASSESSMENT_CONFIDENCES),
  confidenceNote: localizedTextSchema,
  /** The reading in a sentence: what the text says that puts it at this point. */
  reading: localizedTextSchema,
  /** The articles it was read from, linked to the law register where it holds them. */
  provisions: z
    .array(
      z.object({
        act: actRefSchema,
        provision: z.string().min(1).nullable(),
        label: z.string().min(1),
      }),
    )
    .min(1),
  /** The words that decide it, in the language they were enacted in. */
  quotes: z.array(wordingSchema).min(1),
  /** What the reading leaves open, and what would change it. */
  open: localizedTextSchema.optional(),
  codedBy: z.string().min(1),
  /** People other than the coder who checked it; empty until someone has. */
  reviewedBy: z.array(z.string().min(1)).default([]),
  evidence: z.array(evidenceSchema).min(1),
});

/** Settled once someone other than the coder has checked it; until then it is shown as awaiting a second reader. */
export const reviewStatus = (b: {
  codedBy: string;
  reviewedBy: readonly string[];
}): "settled" | "awaiting_review" =>
  b.reviewedBy.some((r) => r !== b.codedBy) ? "settled" : "awaiting_review";

export const BODY_SCHEMAS = {
  law_link: lawLinkBodySchema,
  event: eventBodySchema,
  enforcement: enforcementBodySchema,
  assessment: assessmentBodySchema,
} as const;

export const curatedRecordSchema = z.discriminatedUnion("kind", [
  z.object({
    key: z.string().regex(/^[a-z0-9][a-z0-9._:-]*$/),
    kind: z.literal("law_link"),
    metric: z.string().min(1),
    body: lawLinkBodySchema,
  }),
  z.object({
    key: z.string().regex(/^[a-z0-9][a-z0-9._:-]*$/),
    kind: z.literal("event"),
    metric: z.string().min(1).nullable(),
    body: eventBodySchema,
  }),
  z.object({
    key: z.string().regex(/^[a-z0-9][a-z0-9._:-]*$/),
    kind: z.literal("enforcement"),
    metric: z.string().min(1).nullable(),
    body: enforcementBodySchema,
  }),
  z.object({
    key: z.string().regex(/^[a-z0-9][a-z0-9._:-]*$/),
    kind: z.literal("assessment"),
    metric: z.null(),
    body: assessmentBodySchema,
  }),
]);
export type CuratedRecord = z.infer<typeof curatedRecordSchema>;
export type CuratedRecordInput = z.input<typeof curatedRecordSchema>;
export type LawLinkBody = z.infer<typeof lawLinkBodySchema>;
export type EventBody = z.infer<typeof eventBodySchema>;
export type EventVote = z.infer<typeof voteSchema>;
export type EventActor = z.infer<typeof actorSchema>;
export type EnforcementBody = z.infer<typeof enforcementBodySchema>;
export type AssessmentBody = z.infer<typeof assessmentBodySchema>;

/** Parse the curated list and cross-check it against the metric catalog and the law's authorities. */
export function defineCuratedRecords(
  input: readonly CuratedRecordInput[],
  known: {
    metrics: ReadonlySet<string>;
    authorities: ReadonlySet<string>;
    schemes: ReadonlySet<string>;
    /** Each rubric's current version and the points of its scale; assessments are checked against them. */
    rubrics?: ReadonlyMap<string, { version: number; values: readonly number[] }>;
  },
): CuratedRecord[] {
  const records = input.map((r) => curatedRecordSchema.parse(r));
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const record of records) {
    if (seen.has(record.key)) {
      problems.push(`record "${record.key}" is declared twice`);
    }
    seen.add(record.key);
    if (record.metric !== null && !known.metrics.has(record.metric)) {
      problems.push(`record "${record.key}": metric "${record.metric}" is not in the catalog`);
    }
    const act = "act" in record.body ? record.body.act : undefined;
    if (act) {
      if (!known.authorities.has(act.authority)) {
        problems.push(`record "${record.key}": unknown authority "${act.authority}"`);
      }
      if (!known.schemes.has(act.scheme)) {
        problems.push(`record "${record.key}": unknown act identifier scheme "${act.scheme}"`);
      }
    }
    if (record.kind === "event") {
      for (const metric of record.body.series) {
        if (!known.metrics.has(metric)) {
          problems.push(`record "${record.key}": series "${metric}" is not in the catalog`);
        }
      }
      if (record.body.effective && record.body.effective < record.body.on) {
        problems.push(`record "${record.key}": it takes effect before it was decided`);
      }
      for (const vote of record.body.votes) {
        const counted = vote.breakdown.reduce((n, g) => n + g.for, 0);
        if (vote.breakdown.length > 0 && vote.for !== undefined && counted !== vote.for) {
          problems.push(
            `record "${record.key}": the breakdown's votes for (${counted}) do not add up to ${vote.for}`,
          );
        }
        const against = vote.breakdown.reduce((n, g) => n + g.against, 0);
        if (vote.breakdown.length > 0 && vote.against !== undefined && against !== vote.against) {
          problems.push(
            `record "${record.key}": the breakdown's votes against (${against}) do not add up to ${vote.against}`,
          );
        }
      }
    }
    if (record.kind === "assessment") {
      const b = record.body;
      const rubric = known.rubrics?.get(b.rubric);
      if (!rubric) {
        problems.push(
          `record "${record.key}": rubric "${b.rubric}" does not exist; a feature with no rubric is refused`,
        );
      } else {
        if (b.rubricVersion !== rubric.version) {
          problems.push(
            `record "${record.key}": coded on rubric version ${b.rubricVersion}, the current one is ${rubric.version}`,
          );
        }
        if (!rubric.values.includes(b.value)) {
          problems.push(`record "${record.key}": ${b.value} is not a point of the rubric's scale`);
        }
      }
      for (const p of b.provisions) {
        if (!known.authorities.has(p.act.authority)) {
          problems.push(`record "${record.key}": unknown authority "${p.act.authority}"`);
        }
        if (!known.schemes.has(p.act.scheme)) {
          problems.push(`record "${record.key}": unknown act identifier scheme "${p.act.scheme}"`);
        }
      }
      if (b.validTo !== null && b.validTo <= b.validFrom) {
        problems.push(`record "${record.key}": it ends before it begins`);
      }
      if (b.reviewedBy.includes(b.codedBy)) {
        problems.push(`record "${record.key}": the coder cannot be the one who reviews it`);
      }
    }
    if (record.kind === "enforcement" && record.body.form === "rate" && !record.body.rateMetric) {
      problems.push(`record "${record.key}": a rate names the metric whose facts hold it`);
    }
  }
  if (problems.length > 0) {
    throw new Error(`statistics records:\n- ${problems.join("\n- ")}`);
  }
  return records;
}

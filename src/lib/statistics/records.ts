/**
 * What a statistics record may say, by kind (design:
 * docs/design/2026-11-freedom-laws-statistics.md, "The model"). A record names
 * places and acts by their identifiers, never by our ids, so it survives a
 * reload of either.
 */
import { z } from "zod";
import { localizedTextSchema } from "@/lib/config/places/schema";
import { ENFORCEMENT_FORMS } from "./vocabulary";

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

/** Something that happened, for a timeline, that is not an act Solon holds. */
export const eventBodySchema = z.object({
  place: placeRef,
  on: isoDate,
  title: localizedTextSchema,
  /** What a reader should keep in mind before reading a cause into the line. */
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

export const BODY_SCHEMAS = {
  law_link: lawLinkBodySchema,
  event: eventBodySchema,
  enforcement: enforcementBodySchema,
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
]);
export type CuratedRecord = z.infer<typeof curatedRecordSchema>;
export type CuratedRecordInput = z.input<typeof curatedRecordSchema>;
export type LawLinkBody = z.infer<typeof lawLinkBodySchema>;
export type EventBody = z.infer<typeof eventBodySchema>;
export type EnforcementBody = z.infer<typeof enforcementBodySchema>;

/** Parse the curated list and cross-check it against the metric catalog and the law's authorities. */
export function defineCuratedRecords(
  input: readonly CuratedRecordInput[],
  known: {
    metrics: ReadonlySet<string>;
    authorities: ReadonlySet<string>;
    schemes: ReadonlySet<string>;
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
    if ("act" in record.body) {
      if (!known.authorities.has(record.body.act.authority)) {
        problems.push(`record "${record.key}": unknown authority "${record.body.act.authority}"`);
      }
      if (!known.schemes.has(record.body.act.scheme)) {
        problems.push(
          `record "${record.key}": unknown act identifier scheme "${record.body.act.scheme}"`,
        );
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

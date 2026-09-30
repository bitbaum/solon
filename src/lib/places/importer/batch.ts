/**
 * The generic shapes every adapter maps its source into (design §8.3, step 3).
 * Keyed by external identifiers, never by names: a place is "register number
 * T101", not "Northshire", so a renaming is a new name, not a new place.
 *
 * The same schema is the input format of the fixture adapter, so a batch can
 * also be written by hand, reviewed, and imported with its source.
 */
import { z } from "zod";
import { JURISDICTION_RELATIONS, NAME_TYPES } from "../vocabulary";

const isoDate = z.iso.date();

/** A place, by one of its identifiers. */
export const externalRefSchema = z.object({ scheme: z.string().min(1), value: z.string().min(1) });
export type ExternalRef = z.infer<typeof externalRefSchema>;

const bracketSchema = z.object({ from: z.number().min(0), rate: z.number() });
/** The vendored evaluator's `Tariff`, as data a source can carry. */
export const tariffSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("progressive"),
    currency: z.string().regex(/^[A-Z]{3}$/),
    cap: z.number().min(0).optional(),
    brackets: z.array(bracketSchema).min(1),
  }),
  z.object({
    kind: z.literal("flat"),
    currency: z.string().regex(/^[A-Z]{3}$/),
    cap: z.number().min(0).optional(),
    rate: z.number(),
  }),
]);

const period = {
  validFrom: isoDate.nullable().default(null),
  validTo: isoDate.nullable().default(null),
};

export const batchNameSchema = z.object({
  locale: z.string().min(2),
  script: z
    .string()
    .regex(/^[A-Z][a-z]{3}$/)
    .nullable()
    .default(null),
  name: z.string().min(1),
  nameType: z.enum(NAME_TYPES),
  /** Which authority uses this name, when it is not the place's own. */
  usedBy: externalRefSchema.nullable().default(null),
  ...period,
});

export const batchJurisdictionSchema = z.object({
  /** The identifier this source knows the place by; the key of the diff. */
  ref: externalRefSchema,
  levelKey: z.string().min(1),
  /** Further identifiers the source states (beside `ref`, which is stored too). */
  identifiers: z.array(externalRefSchema.extend(period)).default([]),
  names: z.array(batchNameSchema).min(1),
  ...period,
});

export const batchRelationSchema = z.object({
  from: externalRefSchema,
  to: externalRefSchema,
  relation: z.enum(JURISDICTION_RELATIONS),
  ...period,
});

export const batchFactSchema = z.object({
  jurisdiction: externalRefSchema,
  metricKey: z.string().min(1),
  variant: z.string().min(1).nullable().default(null),
  validFrom: isoDate,
  validTo: isoDate.nullable().default(null),
  value: z.union([z.number(), tariffSchema]),
});

/** A postcode locality and a place it lies in; one postcode may span several places. */
export const batchPostcodeSchema = z.object({
  postcode: z.string().min(1),
  locality: z.string().min(1),
  place: externalRefSchema,
  /** The part of the locality's addresses inside the place, when the source states it. */
  share: z.number().gt(0).lte(1).nullable().default(null),
  ...period,
});

export const importBatchSchema = z.object({
  /** The pack every place in the batch belongs to. */
  pack: z.string().min(1),
  jurisdictions: z.array(batchJurisdictionSchema),
  relations: z.array(batchRelationSchema).default([]),
  facts: z.array(batchFactSchema).default([]),
  postcodes: z.array(batchPostcodeSchema).default([]),
});

export type ImportBatch = z.infer<typeof importBatchSchema>;
/** What an adapter hands in; the importer parses it, so defaulted lists may be left out. */
export type ImportBatchInput = z.input<typeof importBatchSchema>;
export type BatchJurisdiction = z.infer<typeof batchJurisdictionSchema>;
export type BatchName = z.infer<typeof batchNameSchema>;
export type BatchRelation = z.infer<typeof batchRelationSchema>;
export type BatchFact = z.infer<typeof batchFactSchema>;
export type BatchPostcode = z.infer<typeof batchPostcodeSchema>;

export const refKey = (ref: ExternalRef): string => `${ref.scheme}:${ref.value}`;

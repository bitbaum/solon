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

const rateRow = z.object({ from: z.number().min(0), rate: z.number() });
const tariffBase = {
  currency: z.string().regex(/^[A-Z]{3}$/),
  cap: z.number().min(0).optional(),
  rounding: z
    .object({ base: z.number().positive(), divided: z.number().positive().optional() })
    .optional(),
  minimum: z.number().min(0).optional(),
};
/** The vendored evaluator's `Tariff`, as data a source can carry. */
export const tariffSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("progressive"), ...tariffBase, brackets: z.array(rateRow).min(1) }),
  z.object({ kind: z.literal("flat"), ...tariffBase, rate: z.number() }),
  z.object({
    kind: z.literal("stepped"),
    ...tariffBase,
    steps: z.array(rateRow.extend({ base: z.number().min(0) })).min(1),
  }),
  z.object({ kind: z.literal("average"), ...tariffBase, points: z.array(rateRow).min(1) }),
  z.object({
    kind: z.literal("logarithmic"),
    ...tariffBase,
    pieces: z
      .array(
        z.object({
          from: z.number().min(0),
          constant: z.number(),
          linear: z.number(),
          xLnX: z.number(),
        }),
      )
      .min(1),
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

/** A day of the year, `MM-DD`. */
const monthDay = z
  .string()
  .regex(/^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/, "a month and day, month first");

/**
 * A way to take part, at the authority that offers it (§4.7): the authority's
 * own page for it, and what the source states about it. A source states its
 * whole list; what it no longer states is superseded.
 */
export const batchInstrumentSchema = z.object({
  place: externalRefSchema,
  /** A key of the instrument-kind registry the pack takes. */
  kind: z.string().min(1),
  officialUrl: z.url({ protocol: /^https$/ }),
  requirements: z
    .object({
      /** The usual last day, each year, as the authority states it. */
      deadline: monthDay.optional(),
      /** The authority's page that states the deadline. */
      deadlineSource: z.url({ protocol: /^https$/ }).optional(),
    })
    .strict()
    .refine((r) => (r.deadline === undefined) === (r.deadlineSource === undefined), {
      message: "a deadline needs the page that states it, and only a deadline has one",
    })
    .default({}),
  ...period,
});

/** A place's land, as one feature of the batch's geometry file draws it. */
export const batchAreaSchema = z.object({
  place: externalRefSchema,
  /** The feature's id in `geometry.topology`. */
  feature: z.string().min(1),
  ...period,
});

/**
 * The file the batch's areas are features of (§4.4): the database keeps a
 * reference to each feature, never the geometry, and the file is published
 * under its sha256 (`importer/geometry-store.ts`).
 */
export const batchGeometrySchema = z.object({
  /** The level every feature is a place of; the file's one object is named after it. */
  levelKey: z.string().min(1),
  /** The source's own edition, part of every reference into the file ("2026-01"). */
  datasetVersion: z.string().min(1),
  /** TopoJSON, WGS84. */
  topology: z.string().min(1),
});

export const importBatchSchema = z.object({
  /** The pack every place in the batch belongs to. */
  pack: z.string().min(1),
  jurisdictions: z.array(batchJurisdictionSchema),
  relations: z.array(batchRelationSchema).default([]),
  facts: z.array(batchFactSchema).default([]),
  postcodes: z.array(batchPostcodeSchema).default([]),
  instruments: z.array(batchInstrumentSchema).default([]),
  /** A geometry source states all its areas at once, with the file they are drawn in. */
  areas: z.array(batchAreaSchema).default([]),
  geometry: batchGeometrySchema.nullable().default(null),
});

export type ImportBatch = z.infer<typeof importBatchSchema>;
/** What an adapter hands in; the importer parses it, so defaulted lists may be left out. */
export type ImportBatchInput = z.input<typeof importBatchSchema>;
export type BatchJurisdiction = z.infer<typeof batchJurisdictionSchema>;
export type BatchName = z.infer<typeof batchNameSchema>;
export type BatchRelation = z.infer<typeof batchRelationSchema>;
export type BatchFact = z.infer<typeof batchFactSchema>;
export type BatchPostcode = z.infer<typeof batchPostcodeSchema>;
export type BatchInstrument = z.infer<typeof batchInstrumentSchema>;
export type BatchArea = z.infer<typeof batchAreaSchema>;
export type BatchGeometry = z.infer<typeof batchGeometrySchema>;

export const refKey = (ref: ExternalRef): string => `${ref.scheme}:${ref.value}`;

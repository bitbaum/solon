/**
 * The closed, mechanism-level vocabulary of Places — dependency-free, so the
 * schema can CHECK against it and the browser can use it.
 *
 * These lists describe the MODEL (how any place relates to any other), never
 * the world: no country, level, metric or currency appears here. Those come
 * from config (src/lib/config/places) and data. Adding a word here is an engine
 * change and a migration; adding a country never is.
 *
 * Design: docs/design/2026-09-places-and-jurisdictions.md §4.
 */

/** Where an authority comes from (§2). */
export const JURISDICTION_ORIGINS = ["state", "founded", "proposed"] as const;
export type JurisdictionOrigin = (typeof JURISDICTION_ORIGINS)[number];

/** Whose name a name is (§4.2). */
export const NAME_TYPES = ["self", "official_other", "common", "historical"] as const;
export type NameType = (typeof NAME_TYPES)[number];

/** What an authority asserts about an area (§4.4). */
export const AREA_ASSERTIONS = ["claims", "administers", "proposes"] as const;
export type AreaAssertion = (typeof AREA_ASSERTIONS)[number];

/** How one authority relates to another (§4.5). */
export const JURISDICTION_RELATIONS = [
  "part_of",
  "overlaps",
  "succeeds",
  "located_in",
  "federated_with",
  "recognises",
  "member_of",
] as const;
export type JurisdictionRelation = (typeof JURISDICTION_RELATIONS)[number];

/**
 * Relations a founded place states about itself, on its own authority. Every
 * other relation reports a source and must cite it.
 */
export const SELF_STATED_RELATIONS = [
  "located_in",
  "federated_with",
] as const satisfies readonly JurisdictionRelation[];

/** How a fact came to be (§4.6). */
export const FACT_METHODS = ["imported", "derived", "corrected"] as const;
export type FactMethod = (typeof FACT_METHODS)[number];

/** What shape a metric's value has, and so which fact column holds it. */
export const METRIC_VALUE_TYPES = ["number", "tariff"] as const;
export type MetricValueType = (typeof METRIC_VALUE_TYPES)[number];

/** What a number means; a currency amount always carries its ISO 4217 code on the fact. */
export const METRIC_UNITS = ["ratio", "count", "currency", "none"] as const;
export type MetricUnit = (typeof METRIC_UNITS)[number];

/** How far a level's coverage reaches inside its parent (§5.2). */
export const LEVEL_COVERAGES = ["full", "partial"] as const;
export type LevelCoverage = (typeof LEVEL_COVERAGES)[number];

/** How an import run ended. */
export const IMPORT_RUN_STATUSES = ["running", "applied", "dry_run", "failed"] as const;
export type ImportRunStatus = (typeof IMPORT_RUN_STATUSES)[number];

/** `'a', 'b'` for a CHECK built from one of the tuples above. */
export const sqlList = (values: readonly string[]): string =>
  values.map((value) => `'${value}'`).join(", ");

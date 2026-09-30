/**
 * Places — every jurisdiction, official and founded (design:
 * docs/design/2026-09-places-and-jurisdictions.md §4).
 *
 * Kept apart from schema.ts, which mirrors the Prisma-era tables byte for byte;
 * this module only adds. drizzle.config.ts lists both files.
 *
 * Rules every table here follows:
 * - Ids are minted in the app, as in schema.ts.
 * - Nothing is deleted. Valid time (`valid_from`/`valid_to`, dates: the period
 *   a row describes, null = unknown start / still current) is separate from
 *   record time (`recorded_at`; `superseded_at` when a correction replaced the
 *   row). "What did Solon say on 1 March?" always has an answer.
 * - Every row that reports the world cites a `sources` row.
 * - No country, level, metric or currency appears in this file. The registry
 *   tables (`place_*`) are projections of src/lib/config/places, written only
 *   by places:sync-config (src/lib/places/sync-config.ts); facts FK into them.
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";
import {
  AREA_ASSERTIONS,
  FACT_METHODS,
  IMPORT_RUN_STATUSES,
  JURISDICTION_ORIGINS,
  JURISDICTION_RELATIONS,
  METRIC_VALUE_TYPES,
  NAME_TYPES,
  SELF_STATED_RELATIONS,
  sqlList,
  type AreaAssertion,
  type FactMethod,
  type ImportRunStatus,
  type JurisdictionOrigin,
  type JurisdictionRelation,
  type MetricValueType,
  type NameType,
} from "@/lib/places/vocabulary";
import { organizations, proposals } from "./schema";

const uuid = () => randomUUID();
const recordedAt = () =>
  timestamp("recorded_at", { precision: 3, mode: "date" }).notNull().defaultNow();
const supersededAt = () => timestamp("superseded_at", { precision: 3, mode: "date" });
const retiredAt = () => timestamp("retired_at", { precision: 3, mode: "date" });
const validFrom = () => date("valid_from");
const validTo = () => date("valid_to");
const validPeriod = (name: string, from: AnyPgColumn, to: AnyPgColumn) =>
  check(name, sql`${to} IS NULL OR ${from} IS NULL OR ${to} > ${from}`);

// ---------------------------------------------------------------------------
// Registries — projections of config, written only by places:sync-config.
// ---------------------------------------------------------------------------

export const placeCountryPacks = pgTable("place_country_packs", {
  key: text("key").primaryKey(),
  retiredAt: retiredAt(),
});

export const placeLevels = pgTable(
  "place_levels",
  {
    packKey: text("pack_key").notNull(),
    key: text("key").notNull(),
    parentKey: text("parent_key"),
    retiredAt: retiredAt(),
  },
  (t) => [
    primaryKey({ name: "place_levels_pkey", columns: [t.packKey, t.key] }),
    foreignKey({
      columns: [t.packKey],
      foreignColumns: [placeCountryPacks.key],
      name: "place_levels_pack_key_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

export const placeMetrics = pgTable(
  "place_metrics",
  {
    key: text("key").primaryKey(),
    valueType: text("value_type").$type<MetricValueType>().notNull(),
    retiredAt: retiredAt(),
  },
  (t) => [
    check(
      "place_metrics_value_type_check",
      sql`${t.valueType} IN (${sql.raw(sqlList(METRIC_VALUE_TYPES))})`,
    ),
  ],
);

export const placeIdentifierSchemes = pgTable("place_identifier_schemes", {
  key: text("key").primaryKey(),
  /** Only a state authority may carry it — enforced by a trigger on identifiers. */
  reserved: boolean("reserved").notNull(),
  retiredAt: retiredAt(),
});

export const placeInstrumentKinds = pgTable("place_instrument_kinds", {
  key: text("key").primaryKey(),
  retiredAt: retiredAt(),
});

/** One row per sync that changed something: which config, from which commit. */
export const placeConfigSyncs = pgTable("place_config_syncs", {
  id: text("id").primaryKey().$defaultFn(uuid),
  /** sha256 of the canonical JSON of the projected registries. */
  configSha256: text("config_sha256").notNull(),
  gitSha: text("git_sha"),
  /** What changed: inserted, updated and retired keys per registry. */
  changes: jsonb("changes").notNull(),
  syncedAt: timestamp("synced_at", { precision: 3, mode: "date" }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Where every fact comes from.
// ---------------------------------------------------------------------------

/** One row per retrieval; the raw bytes are kept under their hash (§4.6). */
export const sources = pgTable(
  "sources",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    /** Key in the source registry (config/places/sources.ts). */
    sourceKey: text("source_key").notNull(),
    retrievedAt: timestamp("retrieved_at", { precision: 3, mode: "date" }).notNull(),
    url: text("url"),
    contentSha256: varchar("content_sha256", { length: 64 }).notNull(),
    /** Where the snapshot's bytes are stored, relative to the snapshot store. */
    snapshotKey: text("snapshot_key").notNull(),
    importerVersion: text("importer_version").notNull(),
    licenceSpdx: text("licence_spdx").notNull(),
  },
  (t) => [
    index("sources_source_key_retrieved_at_idx").on(t.sourceKey, t.retrievedAt),
    check("sources_content_sha256_check", sql`${t.contentSha256} ~ '^[0-9a-f]{64}$'`),
  ],
);

/** One row per import run, dry or real — what it saw, did and refused. */
export const placeImportRuns = pgTable(
  "place_import_runs",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    sourceKey: text("source_key").notNull(),
    sourceId: text("source_id"),
    status: text("status").$type<ImportRunStatus>().notNull(),
    /** Counts per change kind, quarantined values, and the error when it failed. */
    report: jsonb("report").notNull(),
    startedAt: timestamp("started_at", { precision: 3, mode: "date" }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { precision: 3, mode: "date" }),
  },
  (t) => [
    check(
      "place_import_runs_status_check",
      sql`${t.status} IN (${sql.raw(sqlList(IMPORT_RUN_STATUSES))})`,
    ),
    foreignKey({
      columns: [t.sourceId],
      foreignColumns: [sources.id],
      name: "place_import_runs_source_id_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

// ---------------------------------------------------------------------------
// Authorities and what is said about them.
// ---------------------------------------------------------------------------

export const jurisdictions = pgTable(
  "jurisdictions",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    origin: text("origin").$type<JurisdictionOrigin>().notNull(),
    /** Which pack describes it; null for founded rows and uncovered states. */
    countryPack: text("country_pack"),
    levelKey: text("level_key"),
    /** Required for founded and proposed rows, forbidden for state rows. */
    organizationId: text("organization_id"),
    /** State rows: the readable path built by the pack's slug rules. */
    slugPath: text("slug_path"),
    validFrom: validFrom(),
    validTo: validTo(),
    recordedAt: recordedAt(),
  },
  (t) => [
    uniqueIndex("jurisdictions_organization_id_key").on(t.organizationId),
    uniqueIndex("jurisdictions_slug_path_key").on(t.slugPath),
    check(
      "jurisdictions_origin_check",
      sql`${t.origin} IN (${sql.raw(sqlList(JURISDICTION_ORIGINS))})`,
    ),
    check(
      "jurisdictions_origin_shape",
      sql`(${t.origin} = 'state' AND ${t.organizationId} IS NULL AND ${t.slugPath} IS NOT NULL)
        OR (${t.origin} IN ('founded', 'proposed') AND ${t.organizationId} IS NOT NULL
            AND ${t.levelKey} IS NULL AND ${t.countryPack} IS NULL AND ${t.slugPath} IS NULL)`,
    ),
    // The composite FK below is skipped when either column is null, so a level
    // without its pack would escape it. This closes that door.
    check(
      "jurisdictions_level_needs_pack",
      sql`${t.levelKey} IS NULL OR ${t.countryPack} IS NOT NULL`,
    ),
    validPeriod("jurisdictions_valid_period", t.validFrom, t.validTo),
    foreignKey({
      columns: [t.countryPack],
      foreignColumns: [placeCountryPacks.key],
      name: "jurisdictions_country_pack_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [t.countryPack, t.levelKey],
      foreignColumns: [placeLevels.packKey, placeLevels.key],
      name: "jurisdictions_level_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [t.organizationId],
      foreignColumns: [organizations.id],
      name: "jurisdictions_organization_id_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

export const jurisdictionNames = pgTable(
  "jurisdiction_names",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    jurisdictionId: text("jurisdiction_id").notNull(),
    /** BCP 47. */
    locale: text("locale").notNull(),
    /** ISO 15924, when the source says. */
    script: varchar("script", { length: 4 }),
    name: text("name").notNull(),
    nameType: text("name_type").$type<NameType>().notNull(),
    /** Which authority uses this name, when it is not the place's own. */
    usedById: text("used_by_id"),
    sourceId: text("source_id").notNull(),
    validFrom: validFrom(),
    validTo: validTo(),
    recordedAt: recordedAt(),
    supersededAt: supersededAt(),
  },
  (t) => [
    index("jurisdiction_names_jurisdiction_id_idx").on(t.jurisdictionId),
    check(
      "jurisdiction_names_name_type_check",
      sql`${t.nameType} IN (${sql.raw(sqlList(NAME_TYPES))})`,
    ),
    check(
      "jurisdiction_names_script_check",
      sql`${t.script} IS NULL OR ${t.script} ~ '^[A-Z][a-z]{3}$'`,
    ),
    validPeriod("jurisdiction_names_valid_period", t.validFrom, t.validTo),
    foreignKey({
      columns: [t.jurisdictionId],
      foreignColumns: [jurisdictions.id],
      name: "jurisdiction_names_jurisdiction_id_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [t.usedById],
      foreignColumns: [jurisdictions.id],
      name: "jurisdiction_names_used_by_id_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [t.sourceId],
      foreignColumns: [sources.id],
      name: "jurisdiction_names_source_id_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

export const jurisdictionIdentifiers = pgTable(
  "jurisdiction_identifiers",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    jurisdictionId: text("jurisdiction_id").notNull(),
    scheme: text("scheme").notNull(),
    value: text("value").notNull(),
    sourceId: text("source_id").notNull(),
    validFrom: validFrom(),
    validTo: validTo(),
    recordedAt: recordedAt(),
    supersededAt: supersededAt(),
  },
  (t) => [
    // One holder per code per start date, among rows not superseded. The
    // coalesce makes "unknown start" one value rather than many NULLs.
    uniqueIndex("jurisdiction_identifiers_scheme_value_valid_from_key")
      .on(t.scheme, t.value, sql`coalesce(${t.validFrom}, '-infinity'::date)`)
      .where(sql`${t.supersededAt} IS NULL`),
    index("jurisdiction_identifiers_jurisdiction_id_idx").on(t.jurisdictionId),
    validPeriod("jurisdiction_identifiers_valid_period", t.validFrom, t.validTo),
    foreignKey({
      columns: [t.jurisdictionId],
      foreignColumns: [jurisdictions.id],
      name: "jurisdiction_identifiers_jurisdiction_id_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [t.scheme],
      foreignColumns: [placeIdentifierSchemes.key],
      name: "jurisdiction_identifiers_scheme_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [t.sourceId],
      foreignColumns: [sources.id],
      name: "jurisdiction_identifiers_source_id_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

/** A piece of land, as a geometry dataset draws it. The database holds no geometry (§4.4). */
export const areas = pgTable(
  "areas",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    /** A feature in a versioned geometry asset. */
    geometryRef: text("geometry_ref").notNull(),
    sourceId: text("source_id").notNull(),
    validFrom: validFrom(),
    validTo: validTo(),
    recordedAt: recordedAt(),
    supersededAt: supersededAt(),
  },
  (t) => [
    validPeriod("areas_valid_period", t.validFrom, t.validTo),
    foreignKey({
      columns: [t.sourceId],
      foreignColumns: [sources.id],
      name: "areas_source_id_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

export const areaAssertions = pgTable(
  "area_assertions",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    jurisdictionId: text("jurisdiction_id").notNull(),
    areaId: text("area_id").notNull(),
    assertion: text("assertion").$type<AreaAssertion>().notNull(),
    /** Whose view the row reports, when a source reports a position. */
    assertedById: text("asserted_by_id"),
    sourceId: text("source_id").notNull(),
    validFrom: validFrom(),
    validTo: validTo(),
    recordedAt: recordedAt(),
    supersededAt: supersededAt(),
  },
  (t) => [
    index("area_assertions_area_id_idx").on(t.areaId),
    index("area_assertions_jurisdiction_id_idx").on(t.jurisdictionId),
    check(
      "area_assertions_assertion_check",
      sql`${t.assertion} IN (${sql.raw(sqlList(AREA_ASSERTIONS))})`,
    ),
    validPeriod("area_assertions_valid_period", t.validFrom, t.validTo),
    foreignKey({
      columns: [t.jurisdictionId],
      foreignColumns: [jurisdictions.id],
      name: "area_assertions_jurisdiction_id_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [t.areaId],
      foreignColumns: [areas.id],
      name: "area_assertions_area_id_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [t.assertedById],
      foreignColumns: [jurisdictions.id],
      name: "area_assertions_asserted_by_id_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [t.sourceId],
      foreignColumns: [sources.id],
      name: "area_assertions_source_id_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

export const jurisdictionRelations = pgTable(
  "jurisdiction_relations",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    fromId: text("from_id").notNull(),
    toId: text("to_id").notNull(),
    relation: text("relation").$type<JurisdictionRelation>().notNull(),
    /** Required, except for what a founded place states about itself. */
    sourceId: text("source_id"),
    validFrom: validFrom(),
    validTo: validTo(),
    recordedAt: recordedAt(),
    supersededAt: supersededAt(),
  },
  (t) => [
    // Exactly one current parent per child, within each authority's own
    // hierarchy — which holds even under dispute (§4.5).
    uniqueIndex("jurisdiction_relations_one_current_parent")
      .on(t.fromId)
      .where(sql`${t.relation} = 'part_of' AND ${t.validTo} IS NULL AND ${t.supersededAt} IS NULL`),
    index("jurisdiction_relations_from_id_relation_idx").on(t.fromId, t.relation),
    index("jurisdiction_relations_to_id_relation_idx").on(t.toId, t.relation),
    check(
      "jurisdiction_relations_relation_check",
      sql`${t.relation} IN (${sql.raw(sqlList(JURISDICTION_RELATIONS))})`,
    ),
    check("jurisdiction_relations_not_self", sql`${t.fromId} <> ${t.toId}`),
    check(
      "jurisdiction_relations_sourced",
      sql`${t.sourceId} IS NOT NULL OR ${t.relation} IN (${sql.raw(sqlList(SELF_STATED_RELATIONS))})`,
    ),
    validPeriod("jurisdiction_relations_valid_period", t.validFrom, t.validTo),
    foreignKey({
      columns: [t.fromId],
      foreignColumns: [jurisdictions.id],
      name: "jurisdiction_relations_from_id_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [t.toId],
      foreignColumns: [jurisdictions.id],
      name: "jurisdiction_relations_to_id_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [t.sourceId],
      foreignColumns: [sources.id],
      name: "jurisdiction_relations_source_id_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

/**
 * A measured value of a place for a period: a tax multiplier, a tariff, a
 * population. Bitemporal: the current view takes, per key, the row whose
 * `superseded_at` is null. A correction supersedes; it never overwrites.
 */
export const facts = pgTable(
  "facts",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    jurisdictionId: text("jurisdiction_id").notNull(),
    metricKey: text("metric_key").notNull(),
    /** Which variant of the metric (a tariff for married people); null when it has none. */
    variant: text("variant"),
    validFrom: date("valid_from").notNull(),
    validTo: validTo(),
    valueNumeric: numeric("value_numeric"),
    valueJson: jsonb("value_json"),
    unit: text("unit"),
    /** ISO 4217, per fact. No currency is assumed anywhere. */
    currency: varchar("currency", { length: 3 }),
    sourceId: text("source_id").notNull(),
    method: text("method").$type<FactMethod>().notNull(),
    /** For `corrected` facts: the decision that made the correction. */
    correctedByProposalId: text("corrected_by_proposal_id"),
    recordedAt: recordedAt(),
    supersededAt: supersededAt(),
  },
  (t) => [
    index("facts_jurisdiction_id_metric_key_valid_from_idx").on(
      t.jurisdictionId,
      t.metricKey,
      t.validFrom,
    ),
    // One current row per fact key, so "the current value" is never a choice.
    uniqueIndex("facts_one_current_per_key")
      .on(t.jurisdictionId, t.metricKey, sql`coalesce(${t.variant}, '')`, t.validFrom)
      .where(sql`${t.supersededAt} IS NULL`),
    check("facts_method_check", sql`${t.method} IN (${sql.raw(sqlList(FACT_METHODS))})`),
    check("facts_one_value", sql`(${t.valueNumeric} IS NULL) <> (${t.valueJson} IS NULL)`),
    check("facts_currency_check", sql`${t.currency} IS NULL OR ${t.currency} ~ '^[A-Z]{3}$'`),
    check(
      "facts_correction_names_its_decision",
      sql`(${t.method} = 'corrected') = (${t.correctedByProposalId} IS NOT NULL)`,
    ),
    validPeriod("facts_valid_period", t.validFrom, t.validTo),
    foreignKey({
      columns: [t.jurisdictionId],
      foreignColumns: [jurisdictions.id],
      name: "facts_jurisdiction_id_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [t.metricKey],
      foreignColumns: [placeMetrics.key],
      name: "facts_metric_key_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [t.sourceId],
      foreignColumns: [sources.id],
      name: "facts_source_id_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [t.correctedByProposalId],
      foreignColumns: [proposals.id],
      name: "facts_corrected_by_proposal_id_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

/**
 * A postcode locality and a place it lies in (§8.2). One postcode may span
 * several places, so a lookup can return several rows; `share` is the part of
 * the locality's addresses inside this place, as the source states it (null
 * when it states none). Written only by importers, per source, like relations.
 */
export const placePostcodes = pgTable(
  "place_postcodes",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    packKey: text("pack_key").notNull(),
    postcode: text("postcode").notNull(),
    /** The locality's name as the postcode directory writes it. */
    locality: text("locality").notNull(),
    jurisdictionId: text("jurisdiction_id").notNull(),
    share: numeric("share"),
    sourceId: text("source_id").notNull(),
    validFrom: validFrom(),
    validTo: validTo(),
    recordedAt: recordedAt(),
    supersededAt: supersededAt(),
  },
  (t) => [
    uniqueIndex("place_postcodes_one_current_per_key")
      .on(
        t.packKey,
        t.postcode,
        t.locality,
        t.jurisdictionId,
        sql`coalesce(${t.validFrom}, '-infinity'::date)`,
      )
      .where(sql`${t.supersededAt} IS NULL`),
    index("place_postcodes_pack_key_postcode_idx").on(t.packKey, t.postcode),
    index("place_postcodes_jurisdiction_id_idx").on(t.jurisdictionId),
    check(
      "place_postcodes_share_range",
      sql`${t.share} IS NULL OR (${t.share} > 0 AND ${t.share} <= 1)`,
    ),
    validPeriod("place_postcodes_valid_period", t.validFrom, t.validTo),
    foreignKey({
      columns: [t.packKey],
      foreignColumns: [placeCountryPacks.key],
      name: "place_postcodes_pack_key_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [t.jurisdictionId],
      foreignColumns: [jurisdictions.id],
      name: "place_postcodes_jurisdiction_id_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [t.sourceId],
      foreignColumns: [sources.id],
      name: "place_postcodes_source_id_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

/** A way to take part in a state place; founded places derive theirs from their charter (§4.7). */
export const instruments = pgTable(
  "instruments",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    jurisdictionId: text("jurisdiction_id").notNull(),
    kind: text("kind").notNull(),
    /** Shape given by the instrument kind's schema in config. */
    eligibility: jsonb("eligibility").notNull(),
    requirements: jsonb("requirements").notNull(),
    howKey: text("how_key"),
    officialUrl: text("official_url"),
    sourceId: text("source_id").notNull(),
    validFrom: validFrom(),
    validTo: validTo(),
    recordedAt: recordedAt(),
    supersededAt: supersededAt(),
  },
  (t) => [
    index("instruments_jurisdiction_id_idx").on(t.jurisdictionId),
    validPeriod("instruments_valid_period", t.validFrom, t.validTo),
    foreignKey({
      columns: [t.jurisdictionId],
      foreignColumns: [jurisdictions.id],
      name: "instruments_jurisdiction_id_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [t.kind],
      foreignColumns: [placeInstrumentKinds.key],
      name: "instruments_kind_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [t.sourceId],
      foreignColumns: [sources.id],
      name: "instruments_source_id_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

export type Jurisdiction = typeof jurisdictions.$inferSelect;
export type JurisdictionName = typeof jurisdictionNames.$inferSelect;
export type JurisdictionIdentifier = typeof jurisdictionIdentifiers.$inferSelect;
export type JurisdictionRelationRow = typeof jurisdictionRelations.$inferSelect;
export type Fact = typeof facts.$inferSelect;
export type Source = typeof sources.$inferSelect;
export type PlaceImportRun = typeof placeImportRuns.$inferSelect;

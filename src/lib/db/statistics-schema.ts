/**
 * Statistics beside the law (design: docs/design/2026-11-freedom-laws-statistics.md).
 *
 * The series themselves are `facts` (places-schema.ts). What this file adds is
 * what joins them to the law and to decisions, and every row of it is written
 * once: a link to the law, an event on a timeline and a statement about
 * enforcement are assertions, and changing or withdrawing one is a new row.
 * A saved chart view is stored under the hash of its specification, so a
 * proposal cites exactly the view its author saw.
 */
import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";
import { STATISTIC_RECORD_KINDS, STATISTIC_RECORD_STATES } from "@/lib/statistics/vocabulary";
import { jurisdictions, placeMetrics } from "./places-schema";
import { proposals } from "./schema";

const uuid = () => randomUUID();
const recordedAt = () =>
  timestamp("recorded_at", { precision: 3, mode: "date" }).notNull().defaultNow();
const sqlList = (values: readonly string[]) => values.map((v) => `'${v}'`).join(", ");

/**
 * One assertion about a series, in an append-only log. The current state of a
 * record is its latest row by `recorded_at`; a `retracted` row withdraws it.
 * `body` is checked by the kind's schema in `src/lib/statistics/records.ts`.
 */
export const statisticRecords = pgTable(
  "statistic_records",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    /** law_link | event | enforcement */
    kind: text("kind").notNull(),
    /** Stable identity of the record across its rows. */
    recordKey: text("record_key").notNull(),
    /** asserted | retracted */
    state: text("state").notNull(),
    /** The metric the record is about, when it is about one. */
    metricKey: text("metric_key"),
    /** The place it is about; null when it holds wherever the metric is read. */
    jurisdictionId: text("jurisdiction_id"),
    body: jsonb("body").notNull(),
    /** Who made the assertion: `config:<git sha>` for the curated list, a member id otherwise. */
    assertedBy: text("asserted_by").notNull(),
    recordedAt: recordedAt(),
  },
  (t) => [
    index("statistic_records_key_idx").on(t.recordKey, t.recordedAt),
    index("statistic_records_metric_idx").on(t.metricKey),
    check(
      "statistic_records_kind_check",
      sql`${t.kind} IN (${sql.raw(sqlList(STATISTIC_RECORD_KINDS))})`,
    ),
    check(
      "statistic_records_state_check",
      sql`${t.state} IN (${sql.raw(sqlList(STATISTIC_RECORD_STATES))})`,
    ),
    foreignKey({
      columns: [t.metricKey],
      foreignColumns: [placeMetrics.key],
      name: "statistic_records_metric_key_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [t.jurisdictionId],
      foreignColumns: [jurisdictions.id],
      name: "statistic_records_jurisdiction_id_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

/** A chart specification, kept under its sha256 so it can be cited and reopened. */
export const statisticViews = pgTable(
  "statistic_views",
  {
    sha256: varchar("sha256", { length: 64 }).primaryKey(),
    spec: jsonb("spec").notNull(),
    /** The member who saved it first; null for a visitor. */
    createdBy: text("created_by"),
    recordedAt: recordedAt(),
  },
  (t) => [check("statistic_views_sha256_check", sql`${t.sha256} ~ '^[0-9a-f]{64}$'`)],
);

/** A saved view attached to a proposal as evidence. Written once; never detached. */
export const proposalEvidence = pgTable(
  "proposal_evidence",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    proposalId: text("proposal_id").notNull(),
    viewSha256: varchar("view_sha256", { length: 64 }).notNull(),
    attachedBy: text("attached_by").notNull(),
    recordedAt: recordedAt(),
  },
  (t) => [
    uniqueIndex("proposal_evidence_proposal_view_key").on(t.proposalId, t.viewSha256),
    foreignKey({
      columns: [t.proposalId],
      foreignColumns: [proposals.id],
      name: "proposal_evidence_proposal_id_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [t.viewSha256],
      foreignColumns: [statisticViews.sha256],
      name: "proposal_evidence_view_sha256_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

export type StatisticRecordRow = typeof statisticRecords.$inferSelect;
export type StatisticViewRow = typeof statisticViews.$inferSelect;
